import asyncio
import os
from datetime import datetime, time

from checkin.core.constants import TIME_RANGE_SECS, get_today_schedule
from checkin.core.types import FreeBlock
from checkin.models import CustomSchedule, CustomFreeBlock, Student
from dotenv import load_dotenv

load_dotenv()
_rosters_data: list[dict] = []
_is_resetting = False

def is_resetting():
    return _is_resetting

async def get_curr_free_block() -> FreeBlock | None:
    """
    Fetches the current free block.
    """
    now = _get_now()
    async for free_block, start_time in free_blocks_today_iter():
        if -TIME_RANGE_SECS <= _delta_time(now, start_time) <= TIME_RANGE_SECS:
            return free_block
    return None

async def free_blocks_today_iter():
    """
    Iterates through the free blocks available today.
    Yields tuples containing the block name and the start time,
    respectively.
    """
    now = _get_now()
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
    """
    Common initialization that should be scheduled to run every day.
    """
    global _is_resetting
    _is_resetting = True
    from oauth.api import oauth_client
    res, _ = await asyncio.gather(
        oauth_client().get(
            "https://api.sky.blackbaud.com/school/v1/academics/rosters",
            headers={
                'Bb-Api-Subscription-Key': os.environ["BLACKBAUD_SUBSCRIPTION_KEY"]
            }
        ),
        Student.objects.all().aupdate(free_blocks=""),
    )
    if res.status_code != 200:
        raise Exception("Roster data did not initialize. Err: \n" + res.text)
    courses = res.json()
    num_free_block_courses = 0
    tasks = []
    for course in courses:
        maybe_free_block = await _free_block_of(course)
        if maybe_free_block:
            num_free_block_courses += 1
        tasks.extend(_save_student(user, maybe_free_block) for user in course["roster"])
    await asyncio.gather(*tasks)
    _is_resetting = False
    print(f"Num free block courses: {num_free_block_courses}")

async def _save_student(user: dict, maybe_free_block: str | None = None):
    if user["leader"].get("type") == "Teacher":
        return
    data = user["user"]
    student, _ = await Student.objects.aget_or_create(id=data["id"])
    student.name = f"{data['first_name']} {data['middle_name']} {data['last_name']}"
    student.email = data["email"]
    if maybe_free_block:
        student.free_blocks += maybe_free_block
    await student.asave()

async def _free_block_of(course: dict) -> FreeBlock | None:
    now = _get_now()
    name = course["section"]["name"]
    is_correct_sem = (now.month <= 5 and "S2" in name) or (now.month >= 7 and "S1" in name)
    free_block = course["section"].get("block")
    if not is_correct_sem or not free_block:
        return None
    async for block, _ in free_blocks_today_iter():
        if block == free_block["name"]:
            return block
    return None

def _delta_time(now: datetime, target: time):
    return (datetime.combine(now.date(), target) - now).total_seconds()

# used for shimming time
def _get_now():
    return datetime.now()