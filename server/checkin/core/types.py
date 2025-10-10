from typing import Literal

FreeBlock = Literal["A", "B", "C", "D", "E", "F", "G"]
CheckInOption = Literal["free_period", "sp_check_in", "sp_check_out"] | None

ALL_FREE_BLOCKS = ("A", "B", "C", "D", "E", "F", "G")
SP_MODE = "SP"
