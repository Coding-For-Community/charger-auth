import asyncio
import logging
from datetime import datetime, timedelta

from ninja.errors import HttpError

from checkin.core.get_now import get_now
from checkin.core.types import FreeBlock, SeniorPrivilegeStatus
from checkin.models import FreeBlockToday, Student, CheckInRecord
from checkin.schema import TentativeCheckInSchema
from oauth.api import oauth_client

logger = logging.getLogger(__name__)


async def _do_nothing():
    return None


async def get_curr_free_block() -> FreeBlock | None:
    now = get_now()
    async for item in FreeBlockToday.objects.all():
        delta_secs = (datetime.combine(now.date(), item.time) - now).total_seconds()
        if -600 <= delta_secs <= 600:
            return item.block
    return None


async def get_next_free_block() -> (FreeBlock | None, float):
    now = get_now()
    async for item in FreeBlockToday.objects.all():
        delta_secs = (datetime.combine(now.date(), item.time) - now).total_seconds()
        if delta_secs < -600:
            return item.block, abs(delta_secs)
    # If we're done for free blocks for today, re-send a request at tomorrow 8:30
    tomorrow_830 = now.replace(hour=8, minute=30, second=0)
    delta_secs = (tomorrow_830 - now).total_seconds()
    while delta_secs < 0:
        now += timedelta(days=1)
        delta_secs = (tomorrow_830 - now).total_seconds()
    return None, delta_secs


async def check_in(data: TentativeCheckInSchema, use_device_id=True):
    data.email = data.email.lower()
    free_block, student, checkin_record = await asyncio.gather(
        get_curr_free_block(),
        Student.objects.filter(email=data.email).afirst(),
        (
            CheckInRecord.objects.filter(device_id=data.device_id).afirst()
            if use_device_id
            else _do_nothing()
        ),
    )

    if not student:
        raise HttpError(400, "Invalid Student")
    if student.sp_status != SeniorPrivilegeStatus.NOT_AVAILABLE and data.mode is None:
        raise HttpError(
            414, "Since this student is a senior, the mode must be specified."
        )
    if not checkin_record and use_device_id:  
        # Manual creation because we don't want to create a record if a 414 or 400 is thrown
        await CheckInRecord(device_id=data.device_id, free_blocks=free_block).asave()

    match data.mode:
        case "free_period" | None:
            if not free_block:
                raise HttpError(
                    405,
                    "No free block is available - you're probably past the 10 min margin",
                )
            if checkin_record:
                if free_block in checkin_record.free_blocks:
                    raise HttpError(
                        409,
                        "This device has already checked in from another student's account.",
                    )
                else:
                    checkin_record.free_blocks += free_block
                    await checkin_record.asave()
            checked_in = free_block not in student.checked_in_blocks
            if checked_in:
                student.checked_in_blocks += free_block
                await student.asave()
            return student, checked_in

        case "sp_check_out":
            if student.sp_status == SeniorPrivilegeStatus.NOT_AVAILABLE:
                raise HttpError(400, "Invalid Student")
            if checkin_record:
                prev_user = checkin_record.sp_checkin_user
                if prev_user and prev_user.email != data.email:
                    raise HttpError(
                        409,
                        "This device has already checked in from another student's account.",
                    )
                else:
                    checkin_record.sp_checkin_user = student
                    await checkin_record.asave()
            student.sp_status = SeniorPrivilegeStatus.CHECKED_OUT
            await student.asave()
            return student, True

        case "sp_check_in":
            if student.sp_status != SeniorPrivilegeStatus.CHECKED_OUT:
                raise HttpError(416, "Senior has not checked in yet.")
            student.sp_status = SeniorPrivilegeStatus.AVAILABLE
            await student.asave()
            return student, True

        case _:
            raise Exception(f"Invalid mode {data.mode}.")


async def parse_email(email_or_id: str):
    if not email_or_id.isdigit():
        return email_or_id.lower()
    client = await oauth_client()
    try:
        res = await client.get(f"/users/{email_or_id}")
        if res.status_code == 429:
            raise HttpError(418, "Use your email instead")
        email = res.json().get("email")
        if not email:
            raise HttpError(400, "Invalid student ID")
        return email.lower()
    except ValueError:
        raise HttpError(400, "Invalid student ID or email")
