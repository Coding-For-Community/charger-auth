import asyncio
import logging
from datetime import datetime
from datetime import time

from django.core.management import BaseCommand
from dotenv import load_dotenv

from checkin.core.types import FreeBlock
from checkin.models import PersistentState, Student

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "When run, resets senior privelege statuses every year, at a certain day and month, at 6:00 AM."

    def __init__(self):
        super().__init__()

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
    msgs = await PersistentState.aget()
    seniors = __get_emails(msgs.seniors_grad_year)
    last_year_seniors = __get_emails(msgs.seniors_grad_year - 1)
    async for student in Student.objects.all():
        student.has_sp = student.email in seniors
        if student.email in last_year_seniors:
            await student.adelete()
        else:
            await student.asave()
    if increment_year:
        msgs.seniors_grad_year += 1
        await msgs.asave()

async def __get_emails(grad_year: int):
    from oauth.api import oauth_client

    client = await oauth_client()
    res = await client.get(f"/users?roles=4180&grad_year={grad_year}")
    return [
        data.get("email") for data in res.json()["value"] if data.get("email")
    ]

