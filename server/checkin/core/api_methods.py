import asyncio
import os
from datetime import datetime, time

from checkin.core.types import FreeBlock, ALL_FREE_BLOCKS
from checkin.models import Student
from dotenv import load_dotenv

load_dotenv()
time_range_secs = 600
_free_blocks_today: list[tuple[FreeBlock, time]] = []
_is_resetting = False

def is_resetting():
    return _is_resetting

def free_blocks_today():
    return _free_blocks_today

def get_curr_free_block() -> FreeBlock | None:
    """
    Fetches the current free block.
    """
    now = _get_now()
    for free_block, start_time in _free_blocks_today:
        if -time_range_secs <= _delta_time(now, start_time) <= time_range_secs:
            return free_block
    return None

async def daily_reset():
    """
    Common initialization that should be scheduled to run every day.
    """
    from oauth.api import oauth_client
    global _is_resetting
    _is_resetting = True

    # Fetch data and reset Students objects
    today_as_str = _get_now().strftime("%m-%d-%Y")
    rosters_res, calendar_res, _ = await asyncio.gather(
        oauth_client().get(
            "https://api.sky.blackbaud.com/school/v1/academics/rosters",
            headers={'Bb-Api-Subscription-Key': os.environ["BLACKBAUD_SUBSCRIPTION_KEY"]}
        ),
        oauth_client().get(
            "https://api.sky.blackbaud.com/school/v1/academics/schedules/master?"
            f"level_num=453&start_date={today_as_str}&end_date={today_as_str}",
            headers={'Bb-Api-Subscription-Key': os.environ["BLACKBAUD_SUBSCRIPTION_KEY"]}
        ),
        Student.objects.all().aupdate(free_blocks=""),
    )
    if rosters_res.status_code != 200:
        raise Exception("Roster data did not initialize. Err: \n" + rosters_res.text)
    elif calendar_res.status_code != 200:
        raise Exception("Calendar data did not initialize. Err: \n" + calendar_res.text)

    # Resets the cached schedule for today
    calendar_data = calendar_res.json()
    _free_blocks_today.clear()
    for schedule in calendar_data["value"][0]["schedule_sets"]:
        if schedule["schedule_set_id"] != 3051:
            continue
        _free_blocks_today.extend(
            (block["block"], datetime.fromisoformat(block["start_time"]).time())
            for block in schedule["blocks"]
            if block["block"] in ALL_FREE_BLOCKS
        )
        break
    print(_free_blocks_today)

    # Then, initialize the students and the free blocks they have
    courses = rosters_res.json()
    num_free_block_courses = 0
    tasks = []
    for course in courses:
        maybe_free_block = _free_block_of(course)
        if maybe_free_block:
            num_free_block_courses += 1
        tasks.extend(_save_student(user, maybe_free_block) for user in course["roster"])
    await asyncio.gather(*tasks)
    print(f"Num free block courses: {num_free_block_courses}")

    # Finally, declare resetting as done
    _is_resetting = False

async def _save_student(user: dict, maybe_free_block: str | None = None):
    if user["leader"].get("type") == "Teacher":
        return
    data = user["user"]
    student, _ = await Student.objects.aget_or_create(id=data["id"], checked_in_blocks="")
    student.name = f"{data['first_name']} {data['middle_name']} {data['last_name']}"
    student.email = data["email"]
    if maybe_free_block:
        student.free_blocks += maybe_free_block
    await student.asave()

def _free_block_of(course: dict) -> FreeBlock | None:
    now = _get_now()
    name = course["section"]["name"]
    is_correct_sem = (now.month <= 5 and "S2" in name) or (now.month >= 7 and "S1" in name)
    free_block = course["section"].get("block")
    if not is_correct_sem or not free_block:
        return None
    for block, _ in _free_blocks_today:
        if block == free_block["name"]:
            return block
    return None

def _delta_time(now: datetime, target: time):
    return (datetime.combine(now.date(), target) - now).total_seconds()

# used for shimming time
def _get_now():
    return datetime.now()
