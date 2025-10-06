"""
Stores the main free period check-in endpoints.
"""
import logging
import uuid
from base64 import b64encode

import ninja
from asgiref.sync import sync_to_async

from django.contrib.auth import aauthenticate, alogin
from django.http import HttpRequest, FileResponse
from ninja import UploadedFile, Form, File
from ninja.errors import HttpError

from checkin.core.api_methods import get_curr_free_block, get_student, check_in
from checkin.core.compress_video import compress_video
from checkin.core.random_token_manager import RandomTokenManager
from checkin.core.types import ALL_FREE_BLOCKS, FreeBlock
from checkin.models import Student, CheckInVideo
from checkin.schema import CheckInSchema, AdminLoginSchema, ManualCheckInSchema, TentativeCheckInSchema
from config import settings
from oauth.api import oauth_client

router = ninja.Router()
kiosk_token_manager = RandomTokenManager(interval_secs=5)
print("Hi!")
user_tokens = []

logger = logging.getLogger(__name__)

@router.get("/kioskToken/")
async def token_for_kiosk(request: HttpRequest):
    if not (await perms(request)).get("isAdmin"):
        raise HttpError(401, "Scanner App not logged in.")
    return kiosk_token_manager.get()

@router.get("/userToken/")
async def token_for_student(request, kiosk_token: str):
    if not kiosk_token_manager.validate(kiosk_token):
        raise HttpError(403, "Invalid kiosk token")
    token = str(uuid.uuid4())
    user_tokens.append(token)
    print(f"USER_TOKENS: {user_tokens}")
    return { "token": token }

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
            has_vid = await student.videos.filter(block=free_block).afirst()
            checked_in = "tentative" if has_vid else "yes"
        else:
            checked_in = "no"
        output.append({
            "name": student.name,
            "checked_in": checked_in,
            "email": student.email
        })
    return output

@router.get("/studentVid/")
async def student_vid(request, free_block: FreeBlock, email_b64: str):
    student = await get_student(email_b64)
    if not student:
        raise HttpError(400, "Invalid Student")
    vid = await student.videos.filter(block=free_block).afirst()
    if not vid:
        raise HttpError(402, "No Video found")
    return FileResponse(vid.file.open(), as_attachment=True, filename=vid.file.name)

@router.get("/freeBlockNow/")
async def free_block_now(request):
    return {
        "curr_free_block": await get_curr_free_block()
    }

@router.get("/freeBlockNow/{email_b64}/")
async def free_block_now_specific(request, email_b64: str):
    student = await get_student(email_b64)
    curr_free_block = await get_curr_free_block()
    if not student or not curr_free_block:
        return { "has_free_block": False }
    # noinspection PyTypeChecker
    return {
        "curr_free_block": curr_free_block,
        "has_free_block": curr_free_block in student.free_blocks
    }

@router.get("/studentExists/{email_b64}")
async def student_exists(request, email_b64: str):
    student = await get_student(email_b64)
    return { "exists": student is not None }

@router.get("/perms/")
async def perms(request: HttpRequest):
    user = await request.auser()
    if not (user.is_authenticated and user.is_superuser):
        return { "isAdmin": False }
    return {
        "isAdmin": True,
        "teacherMonitored": user.username == "TeacherMonitoredKiosk"
    }

@router.post("/run/")
async def check_in_student(request, data: CheckInSchema):
    # ip_invalid = request.META.get('HTTP_X_FORWARDED_FOR') not in settings.ALLOWED_CHECK_IN_IPS
    if data.user_token not in user_tokens:
        print(f"USER TOKENS: {user_tokens}")
        raise HttpError(403, "IP/Token invalid - retry with /checkin/runTentative/.")
    student, _ = await check_in(data)
    user_tokens.remove(data.user_token)
    return { "studentName": student.name }

@router.post("/runTentative/")
async def check_in_student_tentative(
    request,
    input_data: TentativeCheckInSchema,
    raw_video: File[UploadedFile]
):
    curr_free_block = await get_curr_free_block()
    student, just_checked_in = await check_in(input_data)

    if just_checked_in:
        raw_video.name = f"{student.name}-{curr_free_block}.webm"
        with compress_video(raw_video) as video_file:
            vid_obj = CheckInVideo(student=student, block=curr_free_block)
            await sync_to_async(vid_obj.file.save)(video_file.name, video_file)
            await vid_obj.asave()

    return { "studentName": student.name }

@router.post("/runManual/")
async def check_in_student_manual(request: HttpRequest, data: ManualCheckInSchema):
    if not (await perms(request)).get("teacherMonitored"):
        raise HttpError(401, "Insufficient permissions for manual check-in.")
    client = await oauth_client()
    res = await client.get(f"/users/{data.student_id}")
    email = res.json().get("email")
    if not email:
        raise HttpError(400, "Invalid student ID")
    student, _ = await check_in(
        TentativeCheckInSchema(
            email_b64=b64encode(email.encode()).decode(),
            device_id="",
            mode=data.mode
        ),
        use_device_id=False
    )
    return { "studentName": student.name }

@router.post("/adminLogin/")
async def admin_login(request: HttpRequest, data: AdminLoginSchema):
    res = await aauthenticate(request, username="Kiosk", password=data.password)
    if res is None or not res.is_superuser:
        res = await aauthenticate(request, username="TeacherMonitoredKiosk", password=data.password)
    if res is None or not res.is_superuser:
        return { "success": False }
    await alogin(request, user=res)
    logger.info("Admin login success.")
    return { "success": True }

if settings.DEBUG:
    @router.delete("/clear/")
    async def reset_data_debug(request):
        await Student.objects.all().adelete()
