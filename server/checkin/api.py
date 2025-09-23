"""
Stores the main free period check-in endpoints.
"""
import asyncio
import ninja

from base64 import b64decode
from datetime import datetime

from django.contrib.auth import aauthenticate, alogin
from django.http import HttpRequest
from ninja.errors import HttpError
from checkin.core.checkin_token import prev_token, curr_token, update_checkin_token
from checkin.core.get_now import get_now
from checkin.core.types import ALL_FREE_BLOCKS, FreeBlock
from checkin.models import Student, CheckInRecord, FreeBlockToday
from checkin.schema import CheckInSchema, AdminLoginSchema, ManualCheckInSchema
from config import settings
from oauth.api import oauth_client

router = ninja.Router()

async def get_curr_free_block() -> FreeBlock | None:
    now = get_now()
    async for item in FreeBlockToday.objects.all():
        delta_time_secs = (datetime.combine(now.date(), item.time) - now).total_seconds()
        if -600 <= delta_time_secs <= 600:
            return item.block
    return None

def get_student(email_b64: str):
    return Student.objects.filter(email=b64decode(email_b64).decode('utf-8')).afirst()

@router.get("/token/")
async def checkin_token(request):
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
        return { "isAdmin": False }
    return {
        "isAdmin": True,
        "manualCheckIn": user.username == "ManualEnabledScannerAppUser"
    }

@router.post("/run/")
async def check_in_student(request: HttpRequest, data: CheckInSchema):
    if not (await perms(request)).get("isAdmin"):
        raise HttpError(401, "Scanner App not logged in.")
    if data.checkin_token != str(curr_token().uuid) and data.checkin_token != str(prev_token().uuid):
        raise HttpError(403, "Invalid checkin token.")
    free_block = await get_curr_free_block()
    if not free_block:
        raise HttpError(405, "No free block is available - you're probably past the 10 min margin")
    student, checkin_record = await asyncio.gather(
        get_student(data.email_b64),
        CheckInRecord.objects.filter(device_id=data.device_id).afirst()
    )
    if not student:
        raise HttpError(400, "Invalid Student")
    if checkin_record:
        if free_block in checkin_record.free_blocks:
            raise HttpError(409, "This device has already checked in from another student's account.")
        else:
            checkin_record.free_blocks += free_block
            await checkin_record.asave()
    else:
        await CheckInRecord(device_id=data.device_id).asave()
    student.checked_in_blocks += free_block
    await student.asave()
    return { "success": True }

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
    return { "success": True }

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
