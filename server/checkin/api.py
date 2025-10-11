"""
Stores the main free period check-in endpoints.
"""

import asyncio
import logging
import uuid
import ninja

from asgiref.sync import sync_to_async
from django.contrib.auth import aauthenticate, alogin
from django.db import IntegrityError
from django.db.models import Prefetch
from django.http import HttpRequest, FileResponse
from ninja import UploadedFile, File
from ninja.errors import HttpError
from ninja.throttling import AuthRateThrottle

from checkin.core.api_methods import (
    get_curr_free_block,
    get_next_free_block,
    parse_email,
    DeviceIdConflict,
    get_checkin_record,
    get_emails_from_grad_year,
    get_perms,
    throw_if_not_admin,
    fmt_eastern_date,
)
from checkin.core.compress_video import compress_video
from checkin.core.consts import ALL_FREE_BLOCKS, FreeBlock
from checkin.core.get_now import get_now
from checkin.core.random_token_manager import RandomTokenManager
from checkin.models import Student, PersistentState, FreePeriodCheckIn, SeniorPrivilegeCheckIn
from checkin.schema import (
    CheckInSchema,
    AdminLoginSchema,
    ManualCheckInSchema,
    TentativeCheckInSchema,
)
from config import settings

router = ninja.Router()

kiosk_token_manager = RandomTokenManager(interval_secs=5)
user_tokens = []
user_tokens_lock = asyncio.Lock()
logger = logging.getLogger(__name__)


@router.get("/kioskToken/")
async def token_for_kiosk(request: HttpRequest):
    _, curr_free_block = await asyncio.gather(
        throw_if_not_admin(request), get_curr_free_block()
    )
    token = kiosk_token_manager.get()
    token["curr_free_block"] = curr_free_block
    if curr_free_block is None:
        _, delta_time = await get_next_free_block()
        token["token"] = None
        token["time_until_refresh"] = delta_time + 5
        logger.warning(f"Free periods done! Next refresh in: {delta_time} secs")
    return token


@router.get("/userToken/")
async def token_for_student(request, kiosk_token: str):
    if not kiosk_token_manager.validate(kiosk_token):
        raise HttpError(403, "Invalid kiosk token")
    token = str(uuid.uuid4())
    async with user_tokens_lock:
        user_tokens.append(token)
    return {"token": token}


@router.get("/seniorYear/")
def senior_year(request):
    now = get_now()
    if now.month < 7:
        return now.year
    else:
        return now.year + 1


@router.get("/students/{free_block}/")
async def fetch_students(request, free_block: FreeBlock):
    if free_block not in ALL_FREE_BLOCKS:
        raise HttpError(400, "Invalid free block: " + free_block)
    output = []
    records_prefetch = Prefetch(
        "fp_records",
        queryset=FreePeriodCheckIn.objects.filter(
            free_block_idx=ALL_FREE_BLOCKS.index(free_block)
        ),
        to_attr="fp_records_filtered"
    )
    students = Student.objects.filter(free_blocks=getattr(Student.free_blocks, free_block))
    students = students.prefetch_related(records_prefetch)
    async for student in students.all():
        records: list[FreePeriodCheckIn] = student.fp_records_filtered
        if len(records) == 0:
            status = "nothing"
        elif records[0].video.name:
            status = "tentative"
        else:
            status = "checked_in"
        output.append({
            "name": student.name,
            "email": student.email,
            "status": status
        })
    return output


@router.get("/spStudents/")
async def fetch_sp_students(request, from_date=None, to_date=None):
    now_date = get_now().date()
    from_date = fmt_eastern_date(from_date)
    to_date = fmt_eastern_date(to_date)

    output = []
    records = SeniorPrivilegeCheckIn.objects.select_related("student")
    if from_date:
        records = records.filter(check_out_date__gte=from_date)
    if to_date:
        records = records.filter(check_in_date__lte=to_date)
    async for r in records.all():
        output.append(r.dict())
    if (from_date and from_date.date() != now_date) or (to_date and to_date.date() != now_date):
        async for r in records.using('lts').all():
            output.append(r.dict())
    return output


@router.get("/studentVid/")
async def student_vid(request, free_block: FreeBlock, email: str):
    record = await FreePeriodCheckIn.objects.filter(
        free_block_idx=ALL_FREE_BLOCKS.index(free_block),
        student__email=email.lower(),
        video__isnull=False,
    ).afirst()
    if not record:
        raise HttpError(402, "No Video found")
    file = record.video.file
    return FileResponse(file.open(), as_attachment=True, filename=file.name)


@router.get("/studentExists/{email_or_id}")
async def student_exists(request, email_or_id: str):
    email = await parse_email(email_or_id)
    student = await Student.objects.filter(email=email).afirst()
    return {
        "exists": student is not None,
        "email": student.email if student else None,
    }


@router.get("/perms/")
async def perms_endpoint(request):
    return await get_perms(request)


@router.post("/run/")
async def check_in_student(request, data: CheckInSchema):
    if data.user_token not in user_tokens:
        logger.info(f"USER TOKEN: {data.user_token}")
        raise HttpError(
            403,
            "Check-In Token invalid - use runTentative with a video."
        )
    record, student = await get_checkin_record(data.email, data.mode, data.device_id)
    try:
        await record.asave()
    except IntegrityError:
        raise DeviceIdConflict
    async with user_tokens_lock:
        user_tokens.remove(data.user_token)
    return {"studentName": student.name}


@router.post("/runTentative/")
async def check_in_student_tentative(
    request, input_data: TentativeCheckInSchema, raw_video: File[UploadedFile]
):
    record, student = await get_checkin_record(
        input_data.email,
        input_data.mode,
        input_data.device_id
    )
    try:
        raw_video.name = f"{student.name}-{record.name()}.webm"
        with compress_video(raw_video) as video_file:
            await sync_to_async(record.video.save)(video_file.name, video_file)
        await record.asave()
    except IntegrityError:
        raise DeviceIdConflict
    return {"studentName": student.name}


@router.post("/runManual/")
async def check_in_student_manual(request: HttpRequest, data: ManualCheckInSchema):
    await throw_if_not_admin(request)
    email = await parse_email(data.email_or_id)
    record, student = await get_checkin_record(email, data.mode, uuid.uuid4().hex)
    try:
        await record.asave()
    except IntegrityError:
        pass
    return {"studentName": student.name}


@router.post("/adminLogin/")
async def admin_login(request: HttpRequest, data: AdminLoginSchema):
    res = await aauthenticate(request, username="Kiosk", password=data.password)
    if res is None or not res.is_superuser:
        res = await aauthenticate(
            request, username="TeacherMonitoredKiosk", password=data.password
        )
    if res is None or not res.is_superuser:
        return {"success": False}
    await alogin(request, user=res)
    logger.info("Admin login success.")
    return {"success": True}


@router.post("/forceReset/", throttle=AuthRateThrottle("2/m"))
async def force_reset(request):
    await throw_if_not_admin(request)
    msgs = await PersistentState.aget()
    msgs.desire_manual_reset = True
    await msgs.asave()
    return {"success": True}


@router.get("/spEnabled/")
async def senior_privileges_enabled(request):
    return {
        "enabled": await Student.objects.filter(has_sp=True).aexists(),
    }


@router.post("/enableSp/")
async def enable_senior_privileges(request, enable_for: str | None = None):
    await throw_if_not_admin(request)
    s_year = senior_year(request)
    seniors, last_year_seniors = await asyncio.gather(
        get_emails_from_grad_year(s_year),
        get_emails_from_grad_year(s_year - 1)
    )
    criterion = Student.objects.filter(email__in=seniors)
    if enable_for:
        criterion = criterion.filter(email=enable_for)
    async for student in criterion:
        student.has_sp = True
        await student.asave()
    return {"success": True}


@router.post("/disableSp/")
async def disable_senior_privileges(request, email: str | None = None):
    await throw_if_not_admin(request)
    if email:
        student = await Student.objects.filter(email=email.lower()).afirst()
        if student is None:
            raise HttpError(400, "Student does not exist")
        student.has_sp = False
        await student.asave()
        return {"success": True}
    async for student in Student.objects.filter(has_sp=True):
        student.has_sp = False
        await student.asave()
    return {"success": True}


if settings.DEBUG:
    @router.get("/test/addLotsOfStudents/")
    async def add_lots_of_students(request):
        import random
        import string

        def generate_random_string(length):
            # Define the pool of characters to choose from
            # string.ascii_letters includes both lowercase and uppercase letters
            # string.digits includes numbers 0-9
            characters = string.ascii_letters + string.digits

            # Use random.choice to select characters and join them
            random_string = ''.join(random.choice(characters) for _ in range(length))
            return random_string

        for i in range(500):
            random_str = generate_random_string(15)
            student = Student(email=random_str + "@caryacademy.org")
            if i < 80:
                student.free_blocks.A = True
                student.name += "WithA"
            await student.asave()
        return "Yeah i just did a thing"

    @router.get("/test/removeUnknowns/")
    async def remove_unknowns(request):
        await Student.objects.filter(name__contains="[Unknown]").adelete()
        return "Yeah i just did a thing"
