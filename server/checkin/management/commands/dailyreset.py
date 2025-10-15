import asyncio
import logging
import os
import schedule
from asgiref.sync import sync_to_async

from django.core.management import BaseCommand
from django.db import transaction
from pywebpush import webpush, WebPushException
from checkin.core.get_now import get_now
from checkin.core.consts import ALL_FREE_BLOCKS, FreeBlock
from checkin.models import (
    Student,
    FreeBlockToday,
    FreePeriodCheckIn,
    SeniorPrivilegeCheckIn,
)
from datetime import datetime, time
from dotenv import load_dotenv
from notifs.models import SubscriptionData

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "When run, periodically resets the database data at a certain time(7:00 by default) every day"

    def __init__(self):
        super().__init__()
        load_dotenv()
        self.free_blocks_today: dict[FreeBlock, time] = {}

    def add_arguments(self, parser):
        parser.add_argument(
            "-time",
            type=str,
            help="The time to run periodic reset.",
            default="07:00",
            nargs="?",
        )
        parser.add_argument(
            "-resetInitial",
            action="store_true",
            help="Whether to initially reset state.",
        )

    def handle(self, *args, **options):
        try:
            asyncio.run(self.main(options["time"], options["resetInitial"]))
        except KeyboardInterrupt:
            return

    async def main(self, scheduled_time: str, reset_initial: bool):
        logger.info("Daily reset task started.")
        await self.daily_reset(reset_initial)
        schedule.every().day.at(scheduled_time).do(
            lambda: asyncio.create_task(self.daily_reset(True))
        )
        while True:
            schedule.run_pending()
            await asyncio.sleep(300)

    async def daily_reset(self, reset_state: bool):
        """
        Common initialization that should be scheduled to run every day.
        """
        now = get_now()
        if now.month in [6, 7]:
            return

        await FreeBlockToday.objects.all().adelete()
        if reset_state:
            await FreePeriodCheckIn.objects.all().adelete()
            if now.month == 8 and now.day == 1:
                await Student.objects.all().adelete()
            else:
                await Student.objects.all().aupdate(free_blocks=0)

        from oauth.api import oauth_client
        client = await oauth_client()
        today_as_str = now.strftime("%m-%d-%Y")
        senior_year = now.year if now.month < 7 else now.year + 1

        # Fetches blackbaud data
        results = await asyncio.gather(
            client.get("/academics/rosters"),
            client.get(
                f"/academics/schedules/master?"
                f"level_num=453&start_date={today_as_str}&end_date={today_as_str}",
            ),
            client.get(f"/users?roles=4180&grad_year={senior_year}")
        )
        for result in results:
            result.raise_for_status()
        rosters_res, calendar_res, seniors_res = results

        # Resets the cached schedule for today
        calendar_data = calendar_res.json()
        for schedule_set in calendar_data["value"][0]["schedule_sets"]:
            if schedule_set["schedule_set_id"] != 3051:
                continue
            for block in schedule_set["blocks"]:
                if block["block"] not in ALL_FREE_BLOCKS:
                    continue
                data = FreeBlockToday(
                    block=block["block"],
                    time=datetime.fromisoformat(block["start_time"]).time(),
                )
                self.free_blocks_today[data.block] = data.time
                await data.asave()
            break

        # Then, initialize the students and the free blocks they have
        courses = rosters_res.json()
        seniors = seniors_res.json()["value"]
        senior_emails = [
            data.get("email").lower() for data in seniors if data.get("email")
        ]
        num_free_block_courses = 0
        for course in courses:
            maybe_free_block = self._free_block_of(course)
            if maybe_free_block:
                num_free_block_courses += 1
            students = await asyncio.gather(*[
                self._get_student(user, maybe_free_block, senior_emails)
                for user in course["roster"]
            ])
            students = set(filter(None, students))
            await asyncio.gather(*[s.asave() for s in students])

        logger.info(f"Num free blocks: {num_free_block_courses}")

    async def _get_student(
        self, user: dict, maybe_free_block: FreeBlock | None, senior_emails: list[str]
    ) -> Student | None:
        # Get basic data from dict
        if user["leader"].get("type") == "Teacher":
            return None
        data = user["user"]
        email = data["email"].lower().strip()
        if not email:
            return None

        # Create student and set basic properties
        student = await Student.objects.filter(email=email).afirst()
        if not student:
            student = Student(email=email)
            student.is_senior = email in senior_emails
            if "middle_name" in data:
                student.name = f"{data['first_name']} {data['middle_name']} {data['last_name']}"
            else:
                student.name = f"{data['first_name']} {data['last_name']}"

        # Add free periods and register reminders
        if maybe_free_block:
            if maybe_free_block not in self.free_blocks_today.keys():
                raise Exception(
                    f"Free block {maybe_free_block} not found in today's calendar"
                )
            student.free_blocks |= Student.as_bit_str(maybe_free_block)
            block_time = self.free_blocks_today[maybe_free_block]
            reminder_time = time(block_time.hour, block_time.minute + 5).strftime(
                "%H:%M"
            )
            schedule.every().day.at(reminder_time).do(
                lambda: asyncio.create_task(_remind_student(student))
            )

        return student

    def _free_block_of(self, course: dict) -> FreeBlock | None:
        now = get_now()
        name = course["section"]["name"]
        is_correct_sem = (now.month <= 5 and "S2" in name) or (
            now.month >= 7 and "S1" in name
        )
        free_block = course["section"].get("block")
        if not is_correct_sem or not free_block:
            return None
        for block in self.free_blocks_today:
            if block == free_block["name"]:
                return block
        return None


async def _remind_student(student: Student):
    data = await SubscriptionData.objects.filter(student=student).afirst()
    if data:
        try:
            webpush(
                subscription_info=data.subscription,
                data="Looks like you haven't signed in for your free block - make sure to do that in 5 min.",
                vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
                vapid_claims={
                    "sub": "mailto:" + data.student.email,
                },
            )
        except WebPushException as ex:
            # Mozilla returns additional information in the body of the response.
            if ex.response is not None and ex.response.json():
                extra = ex.response.json()
                print(
                    "Remote service replied with a {}:{}, {}",
                    extra.code,
                    extra.errno,
                    extra.message,
                )
    return schedule.CancelJob()
