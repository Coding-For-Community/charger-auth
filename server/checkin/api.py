import asyncio
import ninja

from datetime import time, datetime
from ninja.errors import HttpError
from ninja.throttling import AnonRateThrottle

from checkin.core.api_methods import get_curr_free_block, is_resetting, free_blocks_today, daily_reset
from checkin.core.checkin_token import prev_token, curr_token
from checkin.core.types import ALL_FREE_BLOCKS, FreeBlock
from checkin.models import Student
from checkin.schema import CheckInSchema
from config import settings

router = ninja.Router()

@router.get("/token/")
async def checkin_token(request):
    time_until_refresh = 5.1 - (datetime.now() - curr_token().timestamp).total_seconds()
    if time_until_refresh < 0:
        time_until_refresh = 0.5
    return {
        "id": str(curr_token().uuid),
        "time_until_refresh": time_until_refresh,
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

# noinspection PyTypeChecker
@router.get("/freeBlockNow/{user_id}/")
async def free_block_now(request, user_id: int):
    student = await Student.objects.filter(id=user_id).afirst()
    curr_free_block = get_curr_free_block()
    if not student or not curr_free_block:
        return { "has_free_block": False }
    return {
        "curr_free_block": curr_free_block,
        "has_free_block": curr_free_block in student.free_blocks
    }

@router.get("/studentExists/{user_id}")
async def student_exists(request, user_id: int):
    student = await Student.objects.filter(id=user_id).afirst()
    return { "exists": student is not None }

@router.get("/userFreeBlocks/{user_id}/")
async def all_user_free_blocks(request, user_id: int):
    student = await Student.objects.filter(id=user_id).afirst()
    if not student:
        raise HttpError(400, "No student exists with id " + str(user_id))
    result = []
    for free_block, start_time in free_blocks_today():
        if free_block in student.free_blocks:
            result.append({
                "name": free_block,
                "seconds_from_12_AM": (start_time - time(0, 0)).total_seconds()
            })
    return { "free_blocks": result }

@router.get("/userIdOf/{email}/")
async def get_user_id(request, email: str):
    student = await Student.objects.filter(email=email).afirst()
    if not student:
        raise HttpError(400, "No student exists with email " + email)
    return { "user_id": student.id }

@router.get("/forceReset/", throttle=AnonRateThrottle('10/d'))
async def force_reset(request):
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
        raise HttpError(405, "No free block is available - your probably past the 10 min margin")
    student = await Student.objects.filter(id=data.user_id).afirst()
    if not student:
        raise HttpError(400, "Invalid Student ID")
    student.checked_in_blocks += free_block
    await student.asave()
    return { "success": True }

if settings.DEBUG:
    @router.delete("/clear/")
    async def reset_data_debug(request):
        await Student.objects.all().adelete()
