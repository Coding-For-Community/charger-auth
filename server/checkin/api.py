"""
Stores the main free period check-in endpoints.
"""

import asyncio
import logging
import random
import uuid
from datetime import datetime, timezone, timedelta

import ninja

from asgiref.sync import sync_to_async
from django.contrib.auth import aauthenticate, alogin
from django.db import IntegrityError
from django.db.models import Prefetch
from django.http import HttpRequest, FileResponse, HttpResponse
from ninja import UploadedFile, File

from checkin.core.api_methods import (
    get_curr_free_block,
    get_next_free_block,
    parse_email,
    get_check_in_record,
    get_perms,
    fmt_eastern_date,
)
from checkin.core.compress_video import compress_video
from checkin.core.consts import ALL_FREE_BLOCKS, FreeBlock, EVERYONE_KW, US_EASTERN
from checkin.core.errors import InvalidFreeBlock, DeviceIdConflict, NoVideoFound, Http400
from checkin.core.get_now import get_now
from checkin.core.random_token_manager import RandomTokenManager
from checkin.models import Student, FreePeriodCheckIn, SeniorPrivilegeCheckIn, SeniorPrivilegesBan
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
    perms, curr_free_block = await asyncio.gather(
        get_perms(request), get_curr_free_block()
    )
    if not perms.get("isAdmin"):
        return HttpResponse(status=403)
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
        return HttpResponse("Invalid token", status=403)
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
        return InvalidFreeBlock()
    output = []
    records_prefetch = Prefetch(
        "fp_records",
        queryset=FreePeriodCheckIn.objects.filter(
            free_block_idx=ALL_FREE_BLOCKS.index(free_block)
        ),
        to_attr="fp_records_filtered"
    )
    students = Student.objects.filter(free_blocks=Student.as_bit_str(free_block))
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
    from_date = fmt_eastern_date(from_date)
    to_date = fmt_eastern_date(to_date)

    output = []
    records = SeniorPrivilegeCheckIn.objects.select_related("student")
    if from_date:
        records = records.filter(check_out_date__gte=from_date)
    if to_date:
        records = records.filter(check_out_date__lte=to_date)
    if not from_date and not to_date:
        records = records.filter(check_out_date__date=datetime.now(US_EASTERN).date())

    async for r in records.all():
        output.append(r.dict())
    return output


@router.post("/clearSpCheckIns/")
async def clear_sp_check_ins(request):
    await SeniorPrivilegeCheckIn.objects.exclude(check_out_date__date=datetime.now().date()).adelete()
    return {"success": True}


@router.get("/studentVid/")
async def student_vid(request, free_block: FreeBlock, email: str):
    record = await FreePeriodCheckIn.objects.filter(
        free_block_idx=ALL_FREE_BLOCKS.index(free_block),
        student__email=email.lower(),
        video__isnull=False,
    ).afirst()
    if not record:
        return NoVideoFound()
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
        return HttpResponse("Invalid token", status=403)
    record = await get_check_in_record(data.email, data.mode, data.device_id)
    if isinstance(record, Http400):
        return record
    try:
        await record.model.asave()
    except IntegrityError:
        return DeviceIdConflict()
    async with user_tokens_lock:
        user_tokens.remove(data.user_token)
    return {"successMsg": record.msg}


@router.post("/runTentative/")
async def check_in_student_tentative(
    request, input_data: TentativeCheckInSchema, raw_video: File[UploadedFile]
):
    record = await get_check_in_record(
        input_data.email,
        input_data.mode,
        input_data.device_id
    )
    if isinstance(record, Http400):
        return record
    try:
        uin = input_data.email.replace("@caryacademy.org", "")
        raw_video.name = f"{uin}-{record.model.name()}.webm"
        with compress_video(raw_video) as video_file:
            await sync_to_async(record.model.video.save)(video_file.name, video_file)
        await record.model.asave()
    except IntegrityError:
        return DeviceIdConflict()
    return {"successMsg": record.msg}


@router.post("/runManual/")
async def check_in_student_manual(request: HttpRequest, data: ManualCheckInSchema):
    if not (await get_perms(request)).get("teacherMonitored"):
        return HttpResponse(status=403)
    email = await parse_email(data.email_or_id)
    record = await get_check_in_record(email, data.mode, uuid.uuid4().hex)
    if isinstance(record, Http400):
        return record
    try:
        await record.model.asave()
    except IntegrityError:
        pass
    return {"successMsg": record.msg}


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


@router.get("/allSeniors/")
async def fetch_all_seniors(request):
    seniors = Student.objects.filter(is_senior=True)
    banned_emails = []
    async for ban in SeniorPrivilegesBan.objects.all():
        if ban.is_for == EVERYONE_KW:
            return [
                {"name": s.name, "email": s.email, "has_sp": False}
                async for s in seniors
            ]
        banned_emails.append(ban.is_for)
    return [
        {"name": s.name, "email": s.email, "has_sp": s.email not in banned_emails}
        async for s in seniors
    ]


@router.post("/enableSp/")
async def enable_senior_privileges(request, is_for: str = EVERYONE_KW):
    if not (await get_perms(request)).get("isAdmin"):
        return HttpResponse(status=403)
    if is_for == EVERYONE_KW:
        await SeniorPrivilegesBan.objects.all().adelete()
        return {"success": True}
    else:
        ban = await SeniorPrivilegesBan.objects.filter(is_for=is_for).afirst()
        if ban:
            await ban.adelete()
            return {"success": True}
        else:
            return {"success": False}


@router.post("/disableSp/")
async def disable_senior_privileges(request, is_for: str = EVERYONE_KW):
    if not (await get_perms(request)).get("isAdmin"):
        return HttpResponse(status=403)
    if is_for == EVERYONE_KW:
        await SeniorPrivilegesBan.objects.all().adelete()
    await SeniorPrivilegesBan.objects.acreate(is_for=is_for)
    return {"success": True}


if settings.DEBUG:
    @router.get("/test/addLotsOfStudents/")
    async def add_lots_of_students(request):
        for i in range(500):
            student = Student(email=f"student_{i}@caryacademy.org")
            if i < 80:
                student.free_blocks.A = True
                student.name += "WithA"
            await student.asave()
        return "Yeah i just did a thing"

    @router.get("/test/removeUnknowns/")
    async def remove_unknowns(request):
        await Student.objects.filter(name__contains="[Unknown]").adelete()
        return "Yeah i just did a thing"

    @router.get("/test/addLotsOfSpCheckIns")
    async def get_lots_of_sp_check_ins(request):
        objs = []
        students = Student.objects.order_by("?")
        async for s in students:
            for i in range(500):
                objs.append(SeniorPrivilegeCheckIn(
                    student=s,
                    device_id=uuid.uuid4().hex,
                    checked_out=random.random() > 0.5,
                    check_out_date=datetime.now(timezone.utc) - timedelta(days=random.randint(2, 100))
                ))
            for i in range(4):
                objs.append(SeniorPrivilegeCheckIn(
                    student=s,
                    device_id=uuid.uuid4().hex,
                    checked_out=random.random() > 0.5,
                    check_out_date=datetime.now(timezone.utc)
                ))
        await SeniorPrivilegeCheckIn.objects.abulk_create(objs)


    @router.get("/test/eraseSpCheckIns/")
    async def erase_sp_check_ins(request):
        await SeniorPrivilegeCheckIn.objects.all().adelete()
        return "Yeah i just did a thing"
