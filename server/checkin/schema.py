from datetime import date

from ninja import Schema
from checkin.core.types import FreeBlock

# Unlike models (which are basically SQL/database representations)
# Schemas are representations of the JSON that goes in and out of the server.

class JustUserSchema(Schema):
    id: int

class JustBlockSchema(Schema):
    block: FreeBlock

class CustomFreeBlockSchema(Schema):
    label: FreeBlock
    hour: int
    minute: int

class CustomScheduleSchema(Schema):
    day: date
    free_blocks: list[CustomFreeBlockSchema]




