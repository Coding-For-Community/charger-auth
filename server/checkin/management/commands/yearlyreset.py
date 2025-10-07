import asyncio
import logging
from datetime import datetime
from datetime import time

from django.core.management import BaseCommand
from dotenv import load_dotenv

from checkin.core.types import FreeBlock, SeniorPrivilegeStatus
from checkin.models import BgExecutorMsgs, Student

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "When run, resets senior privelege statuses every year, at a certain day and month, at 6:00 AM."

    def __init__(self):
        super().__init__()
        load_dotenv()
        self.free_blocks_today: dict[FreeBlock, time] = {}
        self.reset_count = 0

    def add_arguments(self, parser):
        parser.add_argument("-month", type=str, default="8", nargs="?")
        parser.add_argument("-day", type=str, default="1", nargs="?")

    def handle(self, *args, **options):
        asyncio.run(main(options["month"], options["day"]))


async def main(month: str, day: str):
    await __reset()
    while True:
        now = datetime.now()
        if now.month == int(month) and now.day == int(day) and now.hour == 6:
            await __reset(increment_year=True)
        await asyncio.sleep(60 * 60)


async def __reset(increment_year=False):
    from oauth.api import oauth_client

    client = await oauth_client()

    msgs = await BgExecutorMsgs.aget()
    res = await client.get(f"/users?roles=4180&grad_year={msgs.seniors_grad_year}")
    senior_emails = [
        data.get("email") for data in res.json()["value"] if data.get("email")
    ]
    async for student in Student.objects.all():
        is_senior = student.email in senior_emails
        has_privilege = student.sp_status != SeniorPrivilegeStatus.NOT_AVAILABLE
        if is_senior and not has_privilege:
            student.sp_status = SeniorPrivilegeStatus.AVAILABLE
            await student.asave()
        elif not is_senior and has_privilege:
            await student.adelete()
    if increment_year:
        msgs.seniors_grad_year += 1
        await msgs.asave()
