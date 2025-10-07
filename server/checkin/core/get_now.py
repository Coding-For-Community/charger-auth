from datetime import datetime
from config import settings


def get_now():
    """
    This is used to "shim" different dates/times when the server is in debug mode.
    """
    if settings.DEBUG:
        return datetime(2025, 9, 10, 9)
    else:
        return datetime.now()
