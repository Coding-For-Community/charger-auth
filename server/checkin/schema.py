from typing import Literal

from ninja import Schema
from checkin.core.types import FreeBlock

# Unlike models (which are basically SQL/database representations)
# Schemas are representations of the JSON that goes in and out of the server.

FreePeriodOption = Literal["free_period", "sp_check_in", "sp_check_out"] | None

class TentativeCheckInSchema(Schema):
    email: str
    device_id: str
    mode: FreePeriodOption = None

class CheckInSchema(TentativeCheckInSchema):
    user_token: str

class CustomFreeBlockSchema(Schema):
    label: FreeBlock
    hour: int
    minute: int

class AdminLoginSchema(Schema):
    password: str

class ManualCheckInSchema(Schema):
    email_or_id: str
    mode: FreePeriodOption = None
