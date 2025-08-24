from datetime import time, datetime

from checkin.core.types import FreeBlock

A_DAY_SCHEDULE: dict[FreeBlock, time] = {
    'A': time(9, 0),
    'B': time(10, 20),
    'C': time(12, 45),
    'D': time(2, 5),
}

B_DAY_SCHEDULE: dict[FreeBlock, time] = {
    'E': time(9, 0),
    'F': time(10, 20),
    'G': time(12, 45),
}

C_DAY_SCHEDULE: dict[FreeBlock, time] = {
    'A': time(9, 0),
    'E': time(9, 45),
    'B': time(10, 30),
    'F': time(11, 40),
    'C': time(1, 0),
    'G': time(1, 50),
    'D': time(2, 40),
}

TIME_RANGE_SECS = 600

def get_today_schedule(now: datetime):
    match now.weekday():
        case 0 | 3:
            return A_DAY_SCHEDULE
        case 1 | 4:
            return B_DAY_SCHEDULE
        case 2:
            return C_DAY_SCHEDULE
        case _:
            raise Exception("LMAO this doesn't work on the weekend")