import asyncio
import ninja

from base64 import b64decode
from datetime import time, datetime
from ninja.errors import HttpError
from ninja.throttling import AnonRateThrottle

from checkin.core.api_methods import get_curr_free_block, is_resetting, free_blocks_today, daily_reset
from checkin.core.checkin_token import prev_token, curr_token, update_checkin_token
from checkin.core.types import ALL_FREE_BLOCKS, FreeBlock
from checkin.models import Student
from checkin.schema import CheckInSchema
from config import settings

router = ninja.Router()

@router.get("/token/")
async def checkin_token(request):
    delta_secs = (datetime.now() - curr_token().timestamp).total_seconds()
    if delta_secs < 0 or delta_secs > 5:
        update_checkin_token()
        return {
            "id": str(curr_token().uuid),
            "time_until_refresh": 5,
        }
    return {
        "id": str(curr_token().uuid),
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
            output.append({
                "id": student.id,
                "name": student.name,
            })
    return { "students": output }

# noinspection PyTypeChecker
@router.get("/freeBlockNow/{email_b64}/")
async def free_block_now(request, email_b64: str):
    student = await get_student(email_b64)
    curr_free_block = get_curr_free_block()
    if not student or not curr_free_block:
        return { "has_free_block": False }
    return {
        "curr_free_block": curr_free_block,
        "has_free_block": curr_free_block in student.free_blocks
    }

@router.get("/studentExists/{email_b64}")
async def student_exists(request, email_b64: str):
    student = await get_student(email_b64)
    return { "exists": student is not None }

@router.get("/userFreeBlocks/{email_b64}/")
async def all_user_free_blocks(request, email_b64: str):
    student = await get_student(email_b64)
    if not student:
        raise HttpError(400, "Invalid email")
    result = []
    for free_block, start_time in free_blocks_today():
        if free_block in student.free_blocks:
            result.append({
                "name": free_block,
                "seconds_from_12_AM": (start_time - time(0, 0)).total_seconds()
            })
    return { "free_blocks": result }

@router.get("/forceReset/", throttle=AnonRateThrottle('3/d'))
async def force_reset(request):
    if not is_resetting():
        await daily_reset(False)
    return { "success": True }

@router.post("/run/")
async def check_in_user(request, data: CheckInSchema):
    while is_resetting():
        await asyncio.sleep(0.5)
    if data.checkin_token != str(curr_token().uuid) and data.checkin_token != str(prev_token().uuid):
        raise HttpError(403, "Invalid checkin token.")
    free_block = get_curr_free_block()
    if not free_block:
        raise HttpError(405, "No free block is available - you're probably past the 10 min margin")
    student = await Student.objects.filter(email=b64decode(data.email_b64)).afirst()
    if not student:
        raise HttpError(400, "Invalid Student")
    student.checked_in_blocks += free_block
    await student.asave()
    return { "success": True }

if settings.DEBUG:
    @router.delete("/clear/")
    async def reset_data_debug(request):
        await Student.objects.all().adelete()

def get_student(email_b64: str):
    return Student.objects.filter(email=b64decode(email_b64)).afirst()
