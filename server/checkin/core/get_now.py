from datetime import datetime

from checkin.core.consts import US_EASTERN
from config import settings


def get_now():
    """
    This is used to "shim" different dates/times when the server is in debug mode.
    """
    return datetime.now(US_EASTERN)
