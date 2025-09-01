import asyncio
import sys
import ninja
import uuid
import schedule

from dataclasses import dataclass
from datetime import time, datetime
from ninja.errors import HttpError
from checkin.core.api_methods import get_curr_free_block, daily_reset, free_blocks_today_iter, get_student_ids_for
from checkin.core.types import ALL_FREE_BLOCKS
from checkin.models import Student, CustomSchedule, CustomFreeBlock
from checkin.schema import CheckInSchema, CustomScheduleSchema, JustBlockSchema
from config import settings

@dataclass
class CheckinToken:
    uuid: uuid.UUID
    timestamp: datetime

def update_checkin_token():
    global curr_token, prev_token
    prev_token = curr_token
    curr_token = CheckinToken(uuid=uuid.uuid4(), timestamp=datetime.now())

prev_token = CheckinToken(uuid=uuid.uuid4(), timestamp=datetime.now())
curr_token = prev_token

if "manage.py" not in sys.argv:
    asyncio.create_task(daily_reset())
    schedule.every().day.at("08:50").do(daily_reset)
    schedule.every(5).seconds.do(update_checkin_token)

router = ninja.Router()

@router.get("/token/")
async def checkin_token(request):
    return {
        "id": curr_token.uuid.int,
        "time_until_refresh": 5.1 - (datetime.now() - curr_token.timestamp).total_seconds(),
    }

# noinspection PyTypeChecker
@router.post("/hasFreeBlockNow/")
async def user_has_free_block(request, data: CheckInSchema):
    student = await Student.objects.filter(user_id=data.user_id).afirst()
    curr_free_block = await get_curr_free_block()
    if not student or not curr_free_block:
        return { "has_free_block": False }
    return {
        "has_free_block": curr_free_block in student.absent_free_blocks
    }

@router.post("/userFreeBlocks/")
async def all_user_free_blocks(request, data: CheckInSchema):
    student = await Student.objects.filter(user_id=data.user_id).afirst()
    if not student:
        return { "free_blocks": [] }
    result = []
    async for free_block, start_time in free_blocks_today_iter():
        if free_block in student.absent_free_blocks:
            result.append({
                "name": free_block,
                "seconds_from_12_AM": (start_time - time(0, 0)).total_seconds()
            })
    return {
        "free_blocks": result
    }

@router.post("/notCheckedInStudents/")
async def get_not_checked_in_students(request, data: JustBlockSchema):
    students = Student.objects.all()
    student_ids = []
    async for student in students:
        if data.block in student.absent_free_blocks:
            student_ids.append(student.id)
    return {
        "student_ids": student_ids
    }

@router.post("/addCustomSchedule/")
async def add_custom_schedule(request, data: CustomScheduleSchema):
    custom_schedule, _ = await CustomSchedule.objects.aget_or_create(day=data.day)
    for free_block in data.free_blocks:
        await CustomFreeBlock.objects.aget_or_create(
            label=free_block.label,
            start_time=free_block.start_time,
            schedule=custom_schedule,
        )
    return { "success": True }

@router.post("/run/")
async def check_in_user(request, data: CheckInSchema):
    if data.checkin_token != curr_token.uuid.int and data.checkin_token != prev_token.uuid.int:
        raise HttpError(403, "Invalid checkin token.")
    free_block = await get_curr_free_block()
    if not free_block:
        raise HttpError(405, "No free block is available - your probably past the 10 min margin")
    student = await Student.objects.filter(id=data.user_id).afirst()
    if not student:
        raise HttpError(400, "Student does not have a free block today")
    student.absent_free_blocks = student.absent_free_blocks.replace(free_block, "")
    await student.asave()
    return { "success": True }

if settings.DEBUG:
    @router.delete("/clear/")
    async def reset_data_debug(request):
        await Student.objects.all().adelete()
        await CustomSchedule.objects.all().adelete()

    @router.get("/freeBlockStudents/{block}")
    async def free_block_students(request, block: str):
        if block not in ALL_FREE_BLOCKS:
            raise HttpError(400, "Invalid free block")
        return get_student_ids_for(block)







