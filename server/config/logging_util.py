import logging

from contextlib import contextmanager
from contextvars import ContextVar

our_apps = ["checkin", "oauth", "notifs", "config"]
curr_log_ctx = ContextVar("curr_log_ctx", default={})


class _FileFormatter(logging.Formatter):
    def __init__(self):
        super().__init__("%(asctime)s - %(name)s:%(levelname)s: %(message)s")


class _StdoutFormatter(logging.Formatter):
    def __init__(self):
        super().__init__()
        self.fmt = logging.Formatter(
            "%(color)s%(asctime)s - %(name)s:%(levelname)s:\033[0m %(message)s",
            datefmt="%H:%M:%S",
        )

    def format(self, record: logging.LogRecord) -> str:
        record.name += str(curr_log_ctx.get()).replace("'", "")
        is_app_path = any([path in record.name for path in our_apps])
        darkness = 9 if is_app_path else 3
        color = "\033[0m"
        match record.levelname:
            case "INFO" | "DEBUG":
                if is_app_path:
                    color = f"\033[{darkness}4m"
            case "WARNING":
                color = f"\033[{darkness}3m"
            case "ERROR" | "CRITICAL":
                color = f"\033[31m"
        record.color = color
        if "uvicorn" in record.name:
            record.name = "uvicorn"
        return self.fmt.format(record)


@contextmanager
def log_ctx(**kwargs):
    curr_ctx = curr_log_ctx.get()
    shared_keys = curr_ctx.keys() & kwargs.keys()
    if len(shared_keys) > 0:
        logging.warning(f"Log context properties {shared_keys} are being overwritten.")
    token = curr_log_ctx.set({**curr_log_ctx.get(), **kwargs})
    try:
        yield
    finally:
        curr_log_ctx.reset(token)
