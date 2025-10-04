import uuid
from datetime import datetime

class RandomTokenManager:
    """
    A simple class that refreshes a random, uuidv4 token at the specified interval_secs,
    but only if get() is called periodically.
    """
    def __init__(self, interval_secs: float):
        self.curr_uuid = uuid.uuid4()
        self.prev_uuid = self.curr_uuid
        self.curr_timestamp = datetime.now()
        self.prev_timestamp = self.curr_timestamp
        self.interval_secs = interval_secs

    def get(self):
        """
        Fetches the latest token, and the time until the next refresh.
        """
        delta_secs = (datetime.now() - self.curr_timestamp).total_seconds()
        if delta_secs < 0 or delta_secs > self.interval_secs:
            self._update()
            return {
                "token": str(self.curr_uuid),
                "time_until_refresh": self.interval_secs,
            }
        return {
            "token": str(self.curr_uuid),
            "time_until_refresh": self.interval_secs - delta_secs,
        }

    def validate(self, token_uuid: str):
        """
        Validates another token.
        """
        return token_uuid == str(self.curr_uuid) or token_uuid == str(self.prev_uuid)

    def _update(self):
        self.prev_timestamp = self.curr_timestamp
        self.prev_uuid = self.curr_uuid
        self.curr_uuid = uuid.uuid4()
        self.curr_timestamp = datetime.now()
