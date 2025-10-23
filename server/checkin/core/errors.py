import logging

from django.http import JsonResponse
from checkin.core.consts import SP_ADDENDUM


class Http400(JsonResponse, Exception):
    """
    An http 400 error that can either be thrown
    (applicable for less common errors, where speed doesn't matter as much),
    or simply returned by instantiating the class, which is faster.
    """

    def __init__(self, error_code: int, msg: str):
        logging.info(f"User error: {msg}")
        JsonResponse.__init__(self, {"msg": msg, "err_code": error_code}, status=400)
        Exception.__init__(self, msg)


class NoFreeBlock(Http400):
    def __init__(self, banned_from_sp: bool):
        if banned_from_sp:
            msg = f"There isn't an active free period. {SP_ADDENDUM}"
        else:
            msg = "There isn't an active free period. You're probably too late."
        super().__init__(1, msg)


class ModeRequiredForSenior(Http400):
    def __init__(self):
        super().__init__(
            2, "Since this student is a senior, the mode must be specified."
        )


class DeviceIdConflict(Http400):
    def __init__(self):
        super().__init__(3, "You have already checked in for this free period.")


class InvalidStudent(Http400):
    def __init__(self):
        super().__init__(
            4, "Invalid Student ID/Email - are you sure you're entering it correctly?"
        )


class UseEmailInstead(Http400):
    def __init__(self):
        super().__init__(5, "Use your email instead.")


class InvalidFreeBlock(Http400):
    def __init__(self):
        super().__init__(6, "Invalid free block.")


class NoVideoFound(Http400):
    def __init__(self):
        super().__init__(7, "No video found for student.")


class HasNotCheckedOut(Http400):
    def __init__(self):
        super().__init__(
            8,
            "You're trying to check back in for senior privileges, "
            "but you haven't checked out yet.",
        )


class InvalidVideo(Http400):
    def __init__(self):
        super().__init__(9, "We couldn't process your video; try checking in again.")


class NoSeniorPrivileges(Http400):
    def __init__(self):
        super().__init__(
            10,
            "You don't have senior privileges."
            " If you're a senior, you probably forgot to do the form.",
        )
