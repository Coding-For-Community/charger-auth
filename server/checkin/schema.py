from typing import Literal

from ninja import Schema
from checkin.core.types import FreeBlock

# Unlike models (which are basically SQL/database representations)
# Schemas are representations of the JSON that goes in and out of the server.

class CheckInSchema(Schema):
    email_b64: str
    checkin_token: str
    device_id: str

class TentativeCheckInSchema(Schema):
    email_b64: str
    device_id: str

class CustomFreeBlockSchema(Schema):
    label: FreeBlock
    hour: int
    minute: int

class AdminLoginSchema(Schema):
    password: str

class ManualCheckInSchema(Schema):
    student_id: int
