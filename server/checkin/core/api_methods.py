import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

from django.http import HttpRequest

from checkin.core.errors import (
    DeviceIdConflict,
    InvalidStudent,
    ModeRequiredForSenior,
    NoFreeBlock,
    UseEmailInstead,
    HasNotCheckedOut,
    NoSeniorPrivileges,
    Http400,
)
from checkin.core.get_now import get_now
from checkin.core.consts import FreeBlock, CheckInOption, US_EASTERN, SP_ADDENDUM
from checkin.models import (
    FreeBlockToday,
    Student,
    FreePeriodCheckIn,
    SeniorPrivilegeCheckIn,
    SeniorPrivilegesBan,
)
from oauth.api import oauth_client

logger = logging.getLogger(__name__)


@dataclass
class CheckInRecord:
    model: FreePeriodCheckIn | SeniorPrivilegeCheckIn
    msg: str


async def get_curr_free_block() -> FreeBlock | None:
    now = get_now()
    async for item in FreeBlockToday.objects.all():
        time_from_start = (now - item.start).total_seconds()
        time_from_end = (item.end - now).total_seconds()
        if time_from_start > 0 and time_from_end > 0:
            return item.block
    return None


async def get_next_free_block() -> (FreeBlock | None, float):
    now = get_now()
    async for item in FreeBlockToday.objects.all():
        delta_secs = (item.start - now).total_seconds()
        if delta_secs < 0:
            return item.block, abs(delta_secs)
    # If we're done for free blocks for today, re-send a request at tomorrow 8:30
    tomorrow_830 = now.replace(hour=8, minute=30, second=0)
    delta_secs = (tomorrow_830 - now).total_seconds()
    while delta_secs < 0:
        now += timedelta(days=1)
        delta_secs = (tomorrow_830 - now).total_seconds()
    return None, delta_secs


async def parse_email(email_or_id: str):
    if not email_or_id.isdigit():
        return email_or_id.lower()
    client = await oauth_client()
    try:
        res = await client.get(f"/users/{email_or_id}")
        if res.status_code == 429:
            raise UseEmailInstead
        email = res.json().get("email")
        if not email:
            raise InvalidStudent
        return email.lower()
    except ValueError:
        raise InvalidStudent


async def get_check_in_record(
    email: str, mode: CheckInOption, device_id: str
) -> CheckInRecord | Http400:
    email = email.lower()
    free_block, student = await asyncio.gather(
        get_curr_free_block(), Student.objects.filter(email=email).afirst()
    )
    if student is None:
        return InvalidStudent()

    is_sp_mode = mode in ["sp_check_in", "sp_check_out"]
    banned_from_sp = await SeniorPrivilegesBan.applies_to(email)
    has_sp = student.is_senior and not banned_from_sp
    if has_sp and mode is None:
        return ModeRequiredForSenior()
    elif not has_sp and is_sp_mode:
        return NoSeniorPrivileges()

    if mode == "free_period" or mode is None:
        if free_block is None or free_block not in student.free_blocks:
            return NoFreeBlock(banned_from_sp)
        record = FreePeriodCheckIn(student=student, device_id=device_id)
        record.set_block(free_block)
        msg = f"Thanks for checking in for {free_block} block, {student.name}! "
        if banned_from_sp:
            msg += SP_ADDENDUM
        return CheckInRecord(record, msg)
    elif is_sp_mode:
        record = await SeniorPrivilegeCheckIn.objects.filter(
            student__email=email,
            check_out_date__date=datetime.now().date(),
        ).afirst()
        if record and not record.checked_out and mode == "sp_check_in":
            return HasNotCheckedOut()
        if not record:
            record = SeniorPrivilegeCheckIn(student=student)
        elif record.device_id != device_id:
            return DeviceIdConflict()
        record.device_id = device_id
        if mode == "sp_check_in":
            record.checked_out = False
            record.check_in_date = datetime.now(US_EASTERN)
            msg = f"Thanks for the senior privileges check-in, {student.name}!"
        else:
            record.checked_out = True
            msg = f"Thanks for the senior privileges check-out, {student.name}!"
        return CheckInRecord(record, msg)
    else:
        raise Exception("Invalid mode: schema err")


async def get_emails_from_grad_year(grad_year: int):
    from oauth.api import oauth_client

    client = await oauth_client()
    res = await client.get(f"/users?roles=4180&grad_year={grad_year}")
    return [data.get("email") for data in res.json()["value"] if data.get("email")]


async def get_perms(request: HttpRequest):
    user = await request.auser()
    if not (user.is_authenticated and user.is_superuser):
        return {"isAdmin": False}
    return {
        "isAdmin": True,
        "teacherMonitored": user.username == "TeacherMonitoredKiosk",
    }


def fmt_eastern_date(text: str | None):
    return (
        datetime.strptime(text, "%Y-%m-%d %H:%M:%S").astimezone(US_EASTERN)
        if text and text != "null"
        else None
    )
