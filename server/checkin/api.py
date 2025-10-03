"""
Stores the main free period check-in endpoints.
"""
import ninja

from datetime import datetime

from django.contrib.auth import aauthenticate, alogin
from django.http import HttpRequest
from ninja import File, UploadedFile
from ninja.errors import HttpError

from checkin.core.api_methods import get_curr_free_block, get_student, check_in_auto
from checkin.core.checkin_token import curr_token, token_valid, update_checkin_token
from checkin.core.compress_video import compress_video
from checkin.core.types import ALL_FREE_BLOCKS, FreeBlock
from checkin.models import Student, CheckInVideo
from checkin.schema import CheckInSchema, AdminLoginSchema, ManualCheckInSchema
from config import settings
from oauth.api import oauth_client

router = ninja.Router()

@router.get("/token/")
async def checkin_token(request: HttpRequest, last_token: str | None = None):
    if not (await perms(request)).get("isAdmin"):
        if not last_token:
            raise HttpError(401, "Scanner App not logged in.")
        elif not token_valid(last_token):
            raise HttpError(403, "Invalid last_token.")
    delta_secs = (datetime.now() - curr_token().timestamp).total_seconds()
    if delta_secs < 0 or delta_secs > 5:
        update_checkin_token()
        return {
            "token": str(curr_token().uuid),
            "time_until_refresh": 5,
        }
    return {
        "token": str(curr_token().uuid),
        "time_until_refresh": 5 - delta_secs,
    }

@router.get("/notCheckedInStudents/{free_block}/")
async def not_checked_in_students(request, free_block: FreeBlock):
    if free_block not in ALL_FREE_BLOCKS:
        raise HttpError(400, "Invalid free block: " + free_block)
    students = Student.objects.all()
    output = []
    async for student in students:
        if free_block in student.free_blocks and free_block not in student.checked_in_blocks:
            output.append({
                "id": student.id,
                "name": student.name,
            })
    return { "students": output }

@router.get("/checkedInStudents/{free_block}/")
async def checked_in_students(request, free_block: FreeBlock):
    if free_block not in ALL_FREE_BLOCKS:
        raise HttpError(400, "Invalid free block: " + free_block)
    students = Student.objects.all()
    output = []
    async for student in students:
        if free_block in student.checked_in_blocks:
            output.append(student.name)
    return { "students": output }

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
        print("NO PERMS!")
        return { "isAdmin": False }
    print("YES PERMS!")
    return {
        "isAdmin": True,
        "manualCheckIn": user.username == "ManualEnabledScannerAppUser"
    }

@router.post("/run/")
async def check_in_student(request, data: CheckInSchema):
    ip_invalid = request.META.get('HTTP_X_FORWARDED_FOR') not in settings.ALLOWED_CHECK_IN_IPS
    if not token_valid(data.checkin_token) or ip_invalid:
        raise HttpError(403, "IP/Token invalid - retry with /checkin/runTentative/.")
    student = await check_in_auto(data.email_b64, data.device_id)
    return {
        "studentName": student.name
    }

@router.post("/runTentative/")
async def check_in_student_tentative(
    request,
    data: CheckInSchema,
    raw_video: File[UploadedFile]
):
    curr_free_block = await get_curr_free_block()
    student = await check_in_auto(data.email_b64, data.device_id)

    student.has_checkin_vids = True
    raw_video.name = f"{student.name}-{curr_free_block}.mp4"
    with compress_video(raw_video) as video_file:
        CheckInVideo(student=student).file.save(video_file.name, video_file)

    return { "studentName": student.name }

@router.post("/runManual/")
async def check_in_student_manual(request: HttpRequest, data: ManualCheckInSchema):
    if not (await perms(request)).get("manualCheckIn"):
        raise HttpError(401, "Insufficient permissions for manual check-in.")
    client = await oauth_client()
    res = await client.get(f"/users/{data.student_id}")
    email = res.json().get("email")
    if not email:
        raise HttpError(400, "Invalid Student")
    student = await Student.objects.filter(email=email).afirst()
    if student is None:
        raise HttpError(400, "Invalid Student")
    free_block = await get_curr_free_block()
    if not free_block:
        raise HttpError(405, "No free block is available - you're probably past the 10 min margin")
    student.checked_in_blocks += free_block
    await student.asave()
    return { "studentName": student.name }

@router.post("/adminLogin/")
async def admin_login(request: HttpRequest, data: AdminLoginSchema):
    res = await aauthenticate(request, username="ScannerAppUser", password=data.password)
    if res is None or not res.is_superuser:
        res = await aauthenticate(request, username="ManualEnabledScannerAppUser", password=data.password)
    if res is None or not res.is_superuser:
        return { "success": False }
    await alogin(request, user=res)
    print("hi yeah this is successful.")
    return { "success": True }

if settings.DEBUG:
    @router.delete("/clear/")
    async def reset_data_debug(request):
        await Student.objects.all().adelete()
