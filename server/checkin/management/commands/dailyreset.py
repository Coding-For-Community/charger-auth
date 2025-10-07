import asyncio
import logging
import os
import schedule

from django.core.management import BaseCommand
from pywebpush import webpush, WebPushException
from checkin.core.get_now import get_now
from checkin.core.types import ALL_FREE_BLOCKS, FreeBlock
from checkin.models import (
    Student,
    FreeBlockToday,
    CheckInRecord,
    BgExecutorMsgs,
    CheckInVideo,
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
        self.reset_count = 0

    def add_arguments(self, parser):
        parser.add_argument(
            "-time",
            type=str,
            help="The time to run periodic reset.",
            default="07:00",
            nargs="?",
        )

    def handle(self, *args, **options):
        try:
            asyncio.run(self.main(options["time"]))
        except KeyboardInterrupt:
            return

    async def main(self, scheduled_time: str):
        logger.info("Daily reset task started.")
        await self.daily_reset(False)
        schedule.every().day.at(scheduled_time).do(
            lambda: asyncio.create_task(self.daily_reset(True))
        )
        while True:
            schedule.run_pending()
            _, bg_reqs = await asyncio.gather(asyncio.sleep(1), BgExecutorMsgs.aget())
            if bg_reqs and bg_reqs.desire_manual_reset and self.reset_count < 3:
                logger.info("Manual reset requested.")
                await self.daily_reset(False)
                bg_reqs.desire_manual_reset = False
                await bg_reqs.asave()
                self.reset_count += 1

    async def daily_reset(self, reset_state: bool):
        """
        Common initialization that should be scheduled to run every day.
        """
        from oauth.api import oauth_client

        client = await oauth_client()

        if reset_state:
            update_args = {"free_blocks": "", "checked_in_blocks": ""}
            await CheckInVideo.objects.all().adelete()
        else:
            update_args = {"free_blocks": ""}
        # Fetch data and reset Students objects
        today_as_str = get_now().strftime("%m-%d-%Y")
        rosters_res, calendar_res, _, _ = await asyncio.gather(
            client.get("/academics/rosters"),
            client.get(
                f"/academics/schedules/master?"
                f"level_num=453&start_date={today_as_str}&end_date={today_as_str}",
            ),
            Student.objects.all().aupdate(**update_args),
            CheckInRecord.objects.all().adelete(),
        )
        if rosters_res.status_code != 200:
            raise Exception(
                "Roster data did not initialize. Err: \n" + rosters_res.text
            )
        elif calendar_res.status_code != 200:
            raise Exception(
                "Calendar data did not initialize. Err: \n" + calendar_res.text
            )

        # Resets the cached schedule for today
        calendar_data = calendar_res.json()
        await FreeBlockToday.objects.all().adelete()
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
        num_free_block_courses = 0
        tasks = []
        for course in courses:
            maybe_free_block = self._free_block_of(course)
            if maybe_free_block:
                num_free_block_courses += 1
            tasks.extend(
                self._save_student(user, maybe_free_block) for user in course["roster"]
            )
        await asyncio.gather(*tasks)
        logger.info(f"Num free block courses: {num_free_block_courses}")

    async def _save_student(
        self, user: dict, maybe_free_block: FreeBlock | None = None
    ):
        if user["leader"].get("type") == "Teacher":
            return
        data = user["user"]
        email = data["email"].lower().strip()
        if not email:
            return
        student, _ = await Student.objects.aget_or_create(
            email=email, defaults={"checked_in_blocks": ""}
        )
        student.name = f"{data['first_name']} {data['last_name']}"
        if "middle_name" in data:
            student.name = student.name.replace(" ", f" {data['middle_name']} ")
        if maybe_free_block:
            if maybe_free_block not in self.free_blocks_today.keys():
                raise Exception(
                    f"Free block {maybe_free_block} not found in today's calendar"
                )
            student.free_blocks += maybe_free_block
            block_time = self.free_blocks_today[maybe_free_block]
            reminder_time = time(block_time.hour, block_time.minute + 5).strftime(
                "%H:%M"
            )
            schedule.every().day.at(reminder_time).do(
                lambda: asyncio.create_task(__remind_student(student))
            )
        await student.asave()

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
