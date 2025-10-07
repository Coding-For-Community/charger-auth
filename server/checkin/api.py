"""
Stores the main free period check-in endpoints.
"""

import asyncio
import logging
import uuid
import ninja

from asgiref.sync import sync_to_async
from checkin.core.api_methods import (
    get_curr_free_block,
    check_in,
    get_next_free_block,
    parse_email,
)
from checkin.core.compress_video import compress_video
from checkin.core.random_token_manager import RandomTokenManager
from checkin.core.types import (
    ALL_FREE_BLOCKS,
    FreeBlock,
    SeniorPrivilegeStatus,
    SP_MODE,
)
from checkin.models import Student, CheckInVideo, BgExecutorMsgs
from checkin.schema import (
    CheckInSchema,
    AdminLoginSchema,
    ManualCheckInSchema,
    TentativeCheckInSchema,
)
from django.contrib.auth import aauthenticate, alogin
from django.http import HttpRequest, FileResponse
from ninja import UploadedFile, File
from ninja.errors import HttpError
from ninja.throttling import AuthRateThrottle

router = ninja.Router()

kiosk_token_manager = RandomTokenManager(interval_secs=5)
user_tokens = []
user_tokens_lock = asyncio.Lock()
logger = logging.getLogger(__name__)


@router.get("/kioskToken/")
async def token_for_kiosk(request: HttpRequest):
    curr_perms, curr_free_block = await asyncio.gather(
        perms(request), get_curr_free_block()
    )
    if not curr_perms.get("isAdmin"):
        raise HttpError(401, "Scanner App not logged in.")
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
async def senior_year(request):
    return (await BgExecutorMsgs.aget()).seniors_grad_year


@router.get("/students/{free_block}/")
async def fetch_students(request, free_block: FreeBlock):
    if free_block not in ALL_FREE_BLOCKS:
        raise HttpError(400, "Invalid free block: " + free_block)
    output = []
    students = Student.objects.all()
    async for student in students:
        if free_block not in student.free_blocks:
            continue
        if free_block in student.checked_in_blocks:
            has_vid = await student.videos.filter(is_for=free_block).afirst()
            status = "tentative" if has_vid else "checked_in"
        else:
            status = "nothing"
        output.append({"name": student.name, "status": status, "email": student.email})
    return output


@router.get("/spStudents/")
async def fetch_sp_students(request):
    output = []
    students = Student.objects.all()
    async for student in students:
        if student.sp_status == SeniorPrivilegeStatus.NOT_AVAILABLE:
            continue
        vid = await student.videos.filter(is_for=SP_MODE).afirst()
        if student.sp_status == SeniorPrivilegeStatus.CHECKED_OUT:
            status = "tentative" if vid else "checked_out"
        elif vid and student.sp_status == SeniorPrivilegeStatus.AVAILABLE:
            status = "tentative_in"
        else:
            continue
        output.append({"name": student.name, "email": student.email, "status": status})
    return output


@router.get("/studentVid/")
async def student_vid(request, free_block: FreeBlock, email: str):
    student = await Student.objects.filter(email=email.lower()).afirst()
    if not student:
        raise HttpError(400, "Invalid Student")
    vid = await student.videos.filter(is_for=free_block).afirst()
    if not vid:
        raise HttpError(402, "No Video found")
    return FileResponse(vid.file.open(), as_attachment=True, filename=vid.file.name)


@router.get("/studentExists/{email_or_id}")
async def student_exists(request, email_or_id: str):
    email = await parse_email(email_or_id)
    student = await Student.objects.filter(email=email).afirst()
    return {
        "exists": student is not None,
        "email": student.email if student else None,
    }


@router.get("/perms/")
async def perms(request: HttpRequest):
    user = await request.auser()
    if not (user.is_authenticated and user.is_superuser):
        return {"isAdmin": False}
    return {
        "isAdmin": True,
        "teacherMonitored": user.username == "TeacherMonitoredKiosk",
    }


@router.post("/run/")
async def check_in_student(request, data: CheckInSchema):
    if data.mode != "sp_check_in" and data.user_token not in user_tokens:
        print(f"USER TOKENS: {user_tokens}")
        raise HttpError(403, "IP/Token invalid - retry with /checkin/runTentative/.")
    student, _ = await check_in(data)
    async with user_tokens_lock:
        user_tokens.remove(data.user_token)
    return {"studentName": student.name}


@router.post("/runTentative/")
async def check_in_student_tentative(
    request, input_data: TentativeCheckInSchema, raw_video: File[UploadedFile]
):
    student, just_checked_in = await check_in(input_data)
    is_for = (
        (await get_curr_free_block()) if input_data.mode == "free_period" else SP_MODE
    )

    if just_checked_in:
        raw_video.name = f"{student.name}-{is_for}.webm"
        with compress_video(raw_video) as video_file:
            vid_obj = CheckInVideo(student=student, is_for=is_for)
            await sync_to_async(vid_obj.file.save)(video_file.name, video_file)
            await vid_obj.asave()

    return {"studentName": student.name}


@router.post("/runManual/")
async def check_in_student_manual(request: HttpRequest, data: ManualCheckInSchema):
    if not (await perms(request)).get("teacherMonitored"):
        raise HttpError(401, "Insufficient permissions for manual check-in.")
    email = await parse_email(data.email_or_id)
    student, _ = await check_in(
        TentativeCheckInSchema(email=email, device_id="", mode=data.mode),
        use_device_id=False,
    )
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
async def force_reset(request: HttpRequest):
    if not (await perms(request)).get("isAdmin"):
        raise HttpError(401, "Scanner App not logged in.")
    msgs = await BgExecutorMsgs.aget()
    msgs.desire_manual_reset = True
    await msgs.asave()
    return {"success": True}
