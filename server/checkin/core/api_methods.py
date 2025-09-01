import os
import re
from datetime import datetime, time

from checkin.core.constants import TIME_RANGE_SECS, get_today_schedule
from checkin.core.types import FreeBlock
from checkin.models import CustomSchedule, CustomFreeBlock, Student
from dotenv import load_dotenv

load_dotenv()
rosters_data: list[dict] = []

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
    await Student.objects.all().adelete()
    await _init_roster_data()
    await _init_students_data()
    print("Daily reset complete")

def get_student_data_for(block: FreeBlock) -> list[tuple[int, str]]:
    """
    Gets all student IDs for a given free block.
    """
    now = _get_now()
    for course in rosters_data:
        name = course["section"]["name"]
        results = re.findall(r"\(.\)", name)
        is_correct_block = len(results) == 1 and block in results[0]
        is_correct_sem = (now.month <= 5 and "S2" in name) or (now.month >= 7 and "S1" in name)
        if not is_correct_block or not is_correct_sem:
            continue
        return [_get_data(user["user"]) for user in course["roster"]]
    print("No free periods available for block " + block)
    return []

def _get_data(user: dict) -> tuple[int, str]:
    student_id = int(user["id"])
    student_name = f"{user['first_name']} {user['middle_name']} {user['last_name']}"
    return student_id, student_name

def _delta_time(now: datetime, target: time):
    return (datetime.combine(now.date(), target) - now).total_seconds()

# used for shimming time
def _get_now():
    return datetime.now()

async def _init_students_data():
    async for free_block, start_time in free_blocks_today_iter():
        student_data = get_student_data_for(free_block)
        for (student_id, student_name) in student_data:
            student, _ = await Student.objects.aget_or_create(
                id=student_id,
                name=student_name,
                defaults={"absent_free_blocks": ""}
            )
            student.absent_free_blocks += free_block
            await student.asave()

async def _init_roster_data():
    global rosters_data
    from oauth.api import oauth_client
    res = await oauth_client().get(
        "https://api.sky.blackbaud.com/school/v1/academics/rosters",
        headers={
            'Bb-Api-Subscription-Key': os.environ["BLACKBAUD_SUBSCRIPTION_KEY"]
        }
    )
    print("free period" in res.text.lower())
    if res.status_code == 200:
        rosters_data = res.json()
        print(f"Len initial: {len(rosters_data)}")
        rosters_data = [course for course in rosters_data if "Free Period" in course["section"]["name"]]
        print(f"Len final: {len(rosters_data)}")
    else:
        raise Exception("Roster data did not initialize. Err: \n" + res.text)