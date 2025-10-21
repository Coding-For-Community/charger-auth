from datetime import datetime

from checkin.core.consts import US_EASTERN
from config import settings


def get_now():
    """
    This is used to "shim" different dates/times when the server is in debug mode.
    """
    if settings.DEBUG:
        return datetime(2025, 9, 10, 10, 5).astimezone(US_EASTERN)
    else:
        return datetime.now(US_EASTERN)
