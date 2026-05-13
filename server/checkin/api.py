"""
Stores the main free period check-in endpoints.
"""

from checkin.core.errors import EndTimeBeforeStartTime, MeetingAlreadyExists
from checkin.core.errors import StartTimeNotInFuture
from checkin.core.errors import NoTownHallMeetingAvailable
from checkin.schema import TownHallSignInSchema
from cryptography.utils import Enum
from checkin.core.consts import TEACHER_MONITORED_KIOSK, AdvisorRequest
from checkin.core.consts import KIOSK
from checkin.schema import AdvisorLoginSchema, SingleStudentEmail, CreateTownHallMeetingSchema
import asyncio
import logging
import random
import uuid
from datetime import datetime, timezone, timedelta

import ninja

from asgiref.sync import sync_to_async
from django.contrib.auth import aauthenticate, alogin, alogout
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.db.models import Prefetch
from django.http import HttpRequest, FileResponse, HttpResponse
from ninja import UploadedFile, File

from checkin.core.api_methods import (
    get_curr_free_block,
    get_next_free_block,
    parse_email,
    get_check_in_record,
    is_kiosk,
    is_teacher_monitored_kiosk,
    fmt_eastern_date,
)
from checkin.core.compress_video import compress_video
from checkin.core.consts import ALL_FREE_BLOCKS, FreeBlock, EVERYONE_KW, US_EASTERN
from checkin.core.errors import (
    InvalidFreeBlock,
    DeviceIdConflict,
    NoVideoFound,
    Http400, AdvisorNotFound, AdviseeNotFound, AdviseeAlreadyHasAdvisor,
)
from checkin.core.get_now import get_now
from checkin.core.random_token_manager import RandomTokenManager
from checkin.models import (
    Student,
    FreePeriodCheckIn,
    SeniorPrivilegeCheckIn,
    SeniorPrivilegesBan, Advisor, TownHallMeeting,
)
from checkin.schema import (
    CheckInSchema,
    AdminLoginSchema,
    ManualCheckInSchema,
    TentativeCheckInSchema, AdvisorRegisterSchema,
)
from config import settings

router = ninja.Router()

kiosk_token_manager = RandomTokenManager(interval_secs=5)
user_tokens = []
user_tokens_lock = asyncio.Lock()
logger = logging.getLogger(__name__)


@router.get("/kioskToken/")
async def token_for_kiosk(request: HttpRequest):
    authenticated, curr_free_block = await asyncio.gather(is_kiosk(request), get_curr_free_block())
    if not authenticated:
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

@router.get("/students/")
async def fetch_students(request):
    return [
        {"name": student.name, "email": student.email}
        async for student in Student.objects.all()
    ]

@router.get("/students/FP/{free_period}/")
async def fetch_students_by_free_period(request, free_period: FreeBlock):
    if free_period not in ALL_FREE_BLOCKS:
        return InvalidFreeBlock()
    output = []
    records_prefetch = Prefetch(
        "fp_records",
        queryset=FreePeriodCheckIn.objects.filter(
            free_block_idx=ALL_FREE_BLOCKS.index(free_period)
        ),
        to_attr="fp_records_filtered",
    )
    students = Student.objects.filter(free_blocks=Student.as_bit_str(free_period))
    students = students.prefetch_related(records_prefetch)
    async for student in students.all():
        records: list[FreePeriodCheckIn] = student.fp_records_filtered
        if len(records) == 0:
            status = "nothing"
        elif records[0].video.name:
            status = "tentative"
        else:
            status = "checked_in"
        output.append({"name": student.name, "email": student.email, "status": status})
    return output


@router.get("/students/SP/")
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
    await SeniorPrivilegeCheckIn.objects.exclude(
        check_out_date__date=datetime.now().date()
    ).adelete()
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
        input_data.email, input_data.mode, input_data.device_id
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
    if not await is_teacher_monitored_kiosk(request):
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


@router.post("/login/")
async def login(request: HttpRequest, data: AdminLoginSchema | AdvisorLoginSchema):
    if data.kind == "admin":
        res = await aauthenticate(request, username=KIOSK, password=data.password)
        if res is None or not res.is_superuser:
            res = await aauthenticate(request, username=TEACHER_MONITORED_KIOSK, password=data.password)
    else:
        res = await aauthenticate(request, username=data.email, password=data.password)
    if res is None:
        return {"success": False}
    await alogin(request, user=res)
    logger.info("Login success.")
    return {"success": True}


@router.post("/logout/")
async def logout(request: HttpRequest):
    await alogout(request)


@router.get("/perms/")
async def perms(request: HttpRequest):
    user = await request.auser()
    return {
        "isAdmin": user.is_superuser,
        "teacherMonitored": user.username == TEACHER_MONITORED_KIOSK,
    }


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
    if not await is_kiosk(request):
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
    if not await is_kiosk(request):
        return HttpResponse(status=403)
    if is_for == EVERYONE_KW:
        await SeniorPrivilegesBan.objects.all().adelete()
    await SeniorPrivilegesBan.objects.acreate(is_for=is_for)
    return {"success": True}


@router.post("/registerAdvisor/")
async def register_advisor(request, data: AdvisorRegisterSchema):
    email = data.email.lower()
    if await User.objects.filter(username=email).afirst():
        return HttpResponse("Username already taken", status=400)
    user = await sync_to_async(lambda: User.objects.create_user(username=email, email=email, password=data.password))()
    await Advisor(name=data.name, user=user).asave()
    return {"success": True}


@router.post("/removeAdvisee/")
async def remove_advisee(request, student_email: str):
    student = await Student.objects.filter(email=student_email).afirst()
    if student is None:
        return HttpResponse("Advisee not found", status=400)
    student.advisor = None
    student.advisor_req = AdvisorRequest.NONE
    await student.asave()
    return {"success": True}


@router.post("/inviteAdvisee/")
async def send_advisee_invite(request: HttpRequest, student_email: str):
    user = await request.auser()
    if user.is_superuser or not user.is_authenticated:
        return HttpResponse("You must be logged in as an advisor to send an invite", status=403)
    advisor = await Advisor.objects.filter(user=user).afirst()
    student = await Student.objects.filter(email=student_email).afirst()
    preexistent_advisor = await student.aadvisor()
    if student is None:
        return AdviseeNotFound()
    elif advisor is None:
        return AdvisorNotFound()
    elif preexistent_advisor is not None:
        return AdviseeAlreadyHasAdvisor(preexistent_advisor.name)
    student.advisor = advisor
    student.advisor_req = AdvisorRequest.PENDING
    await student.asave()
    return {"success": True}


@router.post("/advisorInvite/accept/")
async def accept_advisor_invite(request, student_email: str):
    student = await Student.objects.filter(email=student_email).afirst()
    if student is None:
        return AdviseeNotFound()
    student.advisor_req = AdvisorRequest.ACCEPTED
    await student.asave()
    return {"success": True}


@router.post("/advisorInvite/decline/")
async def decline_advisor_invite(request, student_email: str):
    student = await Student.objects.filter(email=student_email).afirst()
    if student is None:
        return AdviseeNotFound()
    student.advisor = None
    student.advisor_req = AdvisorRequest.NONE
    await student.asave()
    return {"success": True}


@router.get("/advisorInvite/")
async def get_advisor_invite(request, student_email: str):
    student = await Student.objects.filter(email=student_email).afirst()
    if student is None:
        return HttpResponse("Advisee not found", status=400)
    advisor = await student.aadvisor()
    if student.advisor_req != AdvisorRequest.NONE and advisor:
        advisor_user = await advisor.auser()
        return {
            "request": student.get_advisor_req_display(),
            "advisor_email": advisor_user.email,
            "advisor_name": advisor.name
        }
    return {"request": "not_requested"}


@router.get("/advisees/")
async def get_advisees(request):
    user = await request.auser()
    if user.is_superuser or not user.is_authenticated:
        return HttpResponse("You must be logged in as an advisor to send an invite", status=403)
    advisor = await Advisor.objects.filter(user=user).afirst()
    advisee_data = []
    async for student in advisor.student_set.all():
        checked_in = (await student.townhallcheckin_set.afirst()) is not None
        if student.advisor_req == AdvisorRequest.NONE:
            continue
        advisee_data.append({
            "name": student.name,
            "email": student.email,
            "checkedIn": checked_in,
            "status": student.get_advisor_req_display()
        })
    return advisee_data


@router.get("/advisors/")
async def all_advisors(request):
    advisors = Advisor.objects.all().order_by("name")
    return [
        { "name": advisor.name, "email": (await advisor.auser()).email }
        async for advisor in advisors
    ]

@router.get("/townHallMeeting/all/")
async def all_town_hall_meetings(request):
    if not await is_kiosk(request):
        return HttpResponse(status=403)
    return [
        {
            "start": meeting.start.isoformat(),
            "end": meeting.end.isoformat(),
            "code": meeting.code,
            "title": meeting.title
        }
        async for meeting in TownHallMeeting.objects.all()
    ]


@router.get("/townHallMeeting/code/")
async def town_hall_qr_code(request):
    if not await is_kiosk(request):
        return HttpResponse(status=403)
    now = get_now()
    meeting = await TownHallMeeting.objects.filter(start__gt=now, end__lt=now).afirst()
    return { "code": meeting.code if meeting else None }


@router.post("/townHallMeeting/create/")
async def create_town_hall_meeting(request, data: CreateTownHallMeetingSchema):
    if not await is_kiosk(request):
        return HttpResponse(status=403)
    if data.start < get_now():
        return StartTimeNotInFuture()
    if data.end < data.start:
        return EndTimeBeforeStartTime()
    if await TownHallMeeting.objects.filter(start__date=data.start.date(), end__date=data.end.date()).afirst():
        return MeetingAlreadyExists()
    meeting = TownHallMeeting(start=data.start, end=data.end, title=data.title)
    await meeting.asave()
    return { "code": meeting.code }


@router.delete("/townHallMeeting/delete/")
async def delete_town_hall_meeting(request, code: str):
    if not await is_kiosk(request):
        return HttpResponse(status=403)
    await TownHallMeeting.objects.filter(code=code).adelete()
    return {"success": True}


@router.post("/townHallMeeting/signIn/")
async def sign_in_to_town_hall(request, data: TownHallSignInSchema):
    now = get_now()
    meeting, student = await asyncio.gather(
        TownHallMeeting.objects.filter(start__gt=now, end__lt=now).afirst(),
        Student.objects.filter(email=data.student_email).afirst(),
    )
    if meeting is None:
        return NoTownHallMeetingAvailable()


if settings.DEBUG:
    @router.get("/apiForward/{path:route}")
    async def api_forward(request, route: str):
        print(route)
        return route


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
                objs.append(
                    SeniorPrivilegeCheckIn(
                        student=s,
                        device_id=uuid.uuid4().hex,
                        checked_out=random.random() > 0.5,
                        check_out_date=datetime.now(timezone.utc)
                        - timedelta(days=random.randint(2, 100)),
                    )
                )
            for i in range(4):
                objs.append(
                    SeniorPrivilegeCheckIn(
                        student=s,
                        device_id=uuid.uuid4().hex,
                        checked_out=random.random() > 0.5,
                        check_out_date=datetime.now(timezone.utc),
                    )
                )
        await SeniorPrivilegeCheckIn.objects.abulk_create(objs)

    @router.get("/test/eraseSpCheckIns/")
    async def erase_sp_check_ins(request):
        await SeniorPrivilegeCheckIn.objects.all().adelete()
        return "Yeah i just did a thing"

    @router.get("/test/addAdvisors/")
    async def add_lots_of_advisors(request):
        for i in range(20):
            user = await User.objects.acreate_user(f"advisor{i}@caryacademy.org", f"advisor{i}@caryacademy.org", "password")
            await Advisor.objects.acreate(name=f"Advisor {i}", user=user)
        return "Hi"
