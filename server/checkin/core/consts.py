from typing import Literal

import pytz

FreeBlock = Literal["A", "B", "C", "D", "E", "F", "G"]
CheckInOption = Literal["free_period", "sp_check_in", "sp_check_out"] | None

ALL_FREE_BLOCKS = ("A", "B", "C", "D", "E", "F", "G")
SP_MODE = "SP"

US_EASTERN = pytz.timezone("America/New_York")
EVERYONE_KW = "everyone"
SP_ADDENDUM = " (For senior privileges, see Mrs. Merrims - your form is likely missing)"
