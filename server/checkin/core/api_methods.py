from datetime import datetime, time

from checkin.core.constants import TIME_RANGE_SECS, get_today_schedule
from checkin.core.types import FreeBlock
from checkin.models import CustomSchedule, CustomFreeBlock, Student

def _delta_time(now: datetime, target: time):
    return (datetime.combine(now.date(), target) - now).total_seconds()

async def free_blocks_today_iter():
    now = __get_now()
    custom_schedule = await CustomSchedule.objects.filter(day=now.date()).afirst()
    if custom_schedule:
        free_blocks = CustomFreeBlock.objects.filter(schedule=custom_schedule)
        async for free_block in free_blocks:
            yield free_block.label, free_block.start_time
    else:
        normal_schedule = get_today_schedule(now)
        for block in normal_schedule:
            yield block, normal_schedule[block]

async def daily_reset():
    await Student.objects.all().adelete()
    async for free_block, start_time in free_blocks_today_iter():
        student_ids = await get_student_ids_for(free_block)
        for student_id in student_ids:
            student, _ = await Student.objects.aget_or_create(
                id=student_id,
                defaults={"absent_free_blocks": ""}
            )
            student.absent_free_blocks += free_block
            await student.asave()
    print("Daily reset complete")

async def get_student_ids_for(block: FreeBlock) -> list[int]:
    return [5840061, 123, 1234, 12345, 123456] # TODO - implement with blackbaud api

async def get_curr_free_block() -> FreeBlock | None:
    now = __get_now()
    async for free_block, start_time in free_blocks_today_iter():
        if -TIME_RANGE_SECS <= _delta_time(now, start_time) <= TIME_RANGE_SECS:
            return free_block
    return None

# used for shimming time
def __get_now():
    return datetime(2025,9, 1, 10, 30)




