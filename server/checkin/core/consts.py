from typing import Literal
from django.db import models

import pytz

FreeBlock = Literal["A", "B", "C", "D", "E", "F", "G"]
CheckInOption = Literal["free_period", "sp_check_in", "sp_check_out"] | None

ALL_FREE_BLOCKS = ("A", "B", "C", "D", "E", "F", "G")
SP_MODE = "SP"

US_EASTERN = pytz.timezone("America/New_York")
EVERYONE_KW = "everyone"
SP_ADDENDUM = " (For senior privileges, see Mrs. Merrims - your form is likely missing)"

TEACHER_MONITORED_KIOSK = "TeacherMonitoredKiosk"
KIOSK = "Kiosk"


class AdvisorRequest(models.IntegerChoices):
    NONE = 0, "none"
    PENDING = 1, "pending"
    ACCEPTED = 2, "accepted"
