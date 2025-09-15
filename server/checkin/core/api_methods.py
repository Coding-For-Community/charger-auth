import asyncio
import os
import schedule

from datetime import datetime, time

from django.utils.http import urlencode
from pywebpush import webpush, WebPushException
from checkin.core.types import FreeBlock, ALL_FREE_BLOCKS
from checkin.models import Student
from dotenv import load_dotenv

from config import settings
from notifs.models import SubscriptionData

load_dotenv()
time_range_secs = 600
_free_blocks_today: dict[FreeBlock, time] = {}
_is_resetting = False

def is_resetting():
    return _is_resetting

def free_blocks_today():
    return _free_blocks_today.items()

def get_curr_free_block() -> FreeBlock | None:
    """
    Fetches the current free block.
    """
    now = _get_now()
    for free_block, start_time in free_blocks_today():
        if -time_range_secs <= _delta_time(now, start_time) <= time_range_secs:
            return free_block
    return None

async def daily_reset(remove_checked_in_blocks: bool):
    """
    Common initialization that should be scheduled to run every day.
    """
    from oauth.api import oauth_client
    global _is_resetting
    _is_resetting = True
    client = await oauth_client()

    if remove_checked_in_blocks:
        update_args = { "free_blocks": "", "checked_in_blocks": "" }
    else:
        update_args = { "free_blocks": "" }
    # Fetch data and reset Students objects
    today_as_str = _get_now().strftime("%m-%d-%Y")
    rosters_res, calendar_res, _ = await asyncio.gather(
        client.get("/academics/rosters"),
        client.get(
            f"/academics/schedules/master?"
            f"level_num=453&start_date={today_as_str}&end_date={today_as_str}",
        ),
        Student.objects.all().aupdate(**update_args),
    )
    if rosters_res.status_code != 200:
        raise Exception("Roster data did not initialize. Err: \n" + rosters_res.text)
    elif calendar_res.status_code != 200:
        raise Exception("Calendar data did not initialize. Err: \n" + calendar_res.text)

    # Resets the cached schedule for today
    calendar_data = calendar_res.json()
    _free_blocks_today.clear()
    for schedule_set in calendar_data["value"][0]["schedule_sets"]:
        if schedule_set["schedule_set_id"] != 3051:
            continue
        for block in schedule_set["blocks"]:
            if block["block"] not in ALL_FREE_BLOCKS:
                continue
            _free_blocks_today[block["block"]] = datetime.fromisoformat(block["start_time"]).time()
        break
    print("Free blocks today: " + str(_free_blocks_today))

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

async def fetch_student_img(email: str) -> str | None:
    from oauth.api import oauth_client
    client = await oauth_client()
    args = urlencode({
        "roles": 4184,
        "email": email,
    })
    id_fetch_res = (await client.get(f"/users?{args}")).json()
    print(id_fetch_res)
    res = await client.get(f"/users/{id_fetch_res["value"][0]["id"]}")
    profile_pics = res.json().get("profile_pictures")
    if profile_pics and "large_filename_url" in profile_pics:
        return "https:" + profile_pics["large_filename_url"]
    else:
        return None

async def _save_student(user: dict, maybe_free_block: FreeBlock | None = None):
    if user["leader"].get("type") == "Teacher":
        return
    data = user["user"]
    email = data["email"].strip()
    if not email:
        return
    student, _ = await Student.objects.aget_or_create(email=email, defaults={ "checked_in_blocks": "" })
    student.name = f"{data['first_name']} {data['last_name']}"
    if 'middle_name' in data:
        student.name = student.name.replace(" ", f" {data['middle_name']} ")
    if maybe_free_block:
        if maybe_free_block not in _free_blocks_today:
            raise Exception(f"Free block {maybe_free_block} not found in today's calendar")
        student.free_blocks += maybe_free_block
        block_time = _free_blocks_today[maybe_free_block]
        reminder_time = time(block_time.hour, block_time.minute + 5).strftime("%H:%M")
        schedule.every().day.at(reminder_time).do(lambda: asyncio.create_task(__remind_student(student)))
    await student.asave()

def _free_block_of(course: dict) -> FreeBlock | None:
    now = _get_now()
    name = course["section"]["name"]
    is_correct_sem = (now.month <= 5 and "S2" in name) or (now.month >= 7 and "S1" in name)
    free_block = course["section"].get("block")
    if not is_correct_sem or not free_block:
        return None
    for block, _ in free_blocks_today():
        if block == free_block["name"]:
            return block
    return None

def _delta_time(now: datetime, target: time):
    return (datetime.combine(now.date(), target) - now).total_seconds()

# used for shimming time
def _get_now():
    if settings.DEBUG:
        return datetime(2025, 9, 10, 9)
    else:
        return datetime.now()

async def __remind_student(student: Student):
    data = await SubscriptionData.objects.filter(student=student).afirst()
    if data:
        try:
            webpush(
                subscription_info=data.subscription,
                data="Looks like you haven't signed in for your free block - make sure to do that in 5 min.",
                vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
                vapid_claims={
                    "sub": "mailto:" + data.student.email,
                }
            )
        except WebPushException as ex:
            print("I'm sorry, Dave, but I can't do that: {}", repr(ex))
            # Mozilla returns additional information in the body of the response.
            if ex.response is not None and ex.response.json():
                extra = ex.response.json()
                print(
                    "Remote service replied with a {}:{}, {}",
                    extra.code,
                    extra.errno,
                    extra.message
                )
    return schedule.CancelJob()

