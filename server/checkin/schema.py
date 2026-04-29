from typing import Literal
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
    kind: Literal["admin"]
    password: str


class AdvisorLoginSchema(Schema):
    kind: Literal["advisor"]
    email: str
    password: str


LoginSchema = AdminLoginSchema | AdvisorLoginSchema


class ManualCheckInSchema(Schema):
    email_or_id: str
    mode: CheckInOption = None


class AdvisorRegisterSchema(Schema):
    email: str
    password: str
    name: str


class SingleStudentEmail(Schema):
    student_email: str


class SingleAdvisorEmail(Schema):
    advisor_email: str


class TownHallCheckInSchema(Schema):
    student_email: str
    device_id: str
    longitude: float
    latitude: float
