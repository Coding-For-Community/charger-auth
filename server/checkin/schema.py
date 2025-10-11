from ninja import Schema
from checkin.core.consts import FreeBlock, CheckInOption


# Unlike models (which are basically SQL/database representations)
# Schemas are representations of the JSON that goes in and out of the server.


class TentativeCheckInSchema(Schema):
    email: str
    device_id: str
    mode: CheckInOption = None


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
    mode: CheckInOption = None
