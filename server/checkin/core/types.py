from typing import Literal
from django.db import models

FreeBlock = Literal["A", "B", "C", "D", "E", "F", "G"]
ALL_FREE_BLOCKS: list[FreeBlock] = ["A", "B", "C", "D", "E", "F", "G"]


class SeniorPrivilegeStatus(models.TextChoices):
    NOT_AVAILABLE = "na"
    AVAILABLE = "ia"
    CHECKED_OUT = "co"


# Senior Privileges check-in mode string
SP_MODE = "SP"
