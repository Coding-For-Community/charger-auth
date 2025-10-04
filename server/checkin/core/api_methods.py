import asyncio
import logging
from base64 import b64decode
from datetime import datetime

from ninja.errors import HttpError

from checkin.core.get_now import get_now
from checkin.core.types import FreeBlock
from checkin.models import FreeBlockToday, Student, CheckInRecord

logger = logging.getLogger(__name__)

async def get_curr_free_block() -> FreeBlock | None:
    now = get_now()
    async for item in FreeBlockToday.objects.all():
        delta_time_secs = (datetime.combine(now.date(), item.time) - now).total_seconds()
        if -600 <= delta_time_secs <= 600:
            return item.block
    return None

def get_student(email_b64: str):
    email = b64decode(email_b64).decode('utf-8')
    logger.info(f"Email: {email}")
    return Student.objects.filter(email=email).afirst()

async def check_in_auto(email_b64: str, device_id: str):
    free_block = await get_curr_free_block()
    if not free_block:
        raise HttpError(405, "No free block is available - you're probably past the 10 min margin")
    student, checkin_record = await asyncio.gather(
        get_student(email_b64),
        CheckInRecord.objects.filter(device_id=device_id).afirst()
    )
    if not student:
        raise HttpError(400, "Invalid Student")
    if checkin_record:
        if free_block in checkin_record.free_blocks:
            raise HttpError(409, "This device has already checked in from another student's account.")
        else:
            checkin_record.free_blocks += free_block
            await checkin_record.asave()
    else:
        await CheckInRecord(device_id=device_id).asave()
    if free_block not in student.checked_in_blocks:
        student.checked_in_blocks += free_block
        await student.asave()
    return student
