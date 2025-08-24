import asyncio
import schedule
import sys

from ninja import Router
from ninja.errors import HttpError
from checkin.core.api_methods import get_curr_free_block, daily_reset
from checkin.models import Student, CustomSchedule, CustomFreeBlock
from checkin.schema import JustUserSchema, CustomScheduleSchema, JustBlockSchema
from config import settings

if not 'manage.py' in sys.argv:
    # Adds students for day at every day, right before school starts
    asyncio.create_task(daily_reset())
    schedule.every().day.at("08:50").do(daily_reset)

router = Router()

# noinspection PyTypeChecker
@router.get("/hasFreeBlockNow/")
async def user_has_free_block(request, data: JustUserSchema):
    student = await Student.objects.filter(user_id=data.id).afirst()
    curr_free_block = await get_curr_free_block()
    if not student or not curr_free_block:
        return { "has_free_block": False }
    return {
        "has_free_block": curr_free_block in student.absent_free_blocks
    }

@router.get("/notCheckedInStudents/")
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
async def run_checkin(request, data: JustUserSchema):
    free_block = await get_curr_free_block()
    if not free_block:
        raise HttpError(405, "No free block is available - your probably past the 10 min margin")
    student = await Student.objects.filter(id=data.id).afirst()
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






