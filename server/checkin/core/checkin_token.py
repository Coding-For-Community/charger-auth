import uuid
from dataclasses import dataclass
from datetime import datetime

@dataclass
class CheckinToken:
    uuid: uuid.UUID
    timestamp: datetime

def update_checkin_token():
    """
    Updates the check-in token. Scheduled once every 5 secs.
    """
    global _curr_token, _prev_token
    _prev_token = _curr_token
    _curr_token = CheckinToken(uuid=uuid.uuid4(), timestamp=datetime.now())

_prev_token = CheckinToken(uuid=uuid.uuid4(), timestamp=datetime.now())
_curr_token = _prev_token

def prev_token():
    """
    Returns the previous check-in token.
    """
    return _prev_token

def curr_token():
    """
    Returns the current check-in token.
    """
    return _curr_token
