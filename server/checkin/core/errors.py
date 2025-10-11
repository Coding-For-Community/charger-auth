from ninja.errors import HttpError


class UserError(Exception):
    def __init__(self, error_code: int, msg: str):
        self.error_code = error_code
        self.msg = msg
        super().__init__(400, msg, f"(error code {error_code})")


class NoFreeBlock(UserError):
    def __init__(self):
        super().__init__(1, "You don't seem to have a free period right now (you could be past the 10 min margin).")


class ModeRequiredForSenior(UserError):
    def __init__(self):
        super().__init__(2, "Since this student is a senior, the mode must be specified.")


class DeviceIdConflict(UserError):
    def __init__(self):
        super().__init__(3, "You have already checked in for this free period.")


class InvalidStudent(UserError):
    def __init__(self):
        super().__init__(4, "Invalid Student ID/Email - are you sure you're entering it correctly?")


class UseEmailInstead(UserError):
    def __init__(self):
        super().__init__(5, "Use your email instead.")


class InvalidFreeBlock(UserError):
    def __init__(self):
        super().__init__(6, "Invalid free block.")


class NoVideoFound(UserError):
    def __init__(self):
        super().__init__(7, "No video found for student.")


class HasNotCheckedOut(UserError):
    def __init__(self):
        super().__init__(8, "You're trying to check back in for senior privileges, but you haven't checked out yet.")


class InvalidVideo(UserError):
    def __init__(self):
        super().__init__(9, "We couldn't process your video; try checking in again.")


class InvalidToken(HttpError):
    def __init__(self):
        super().__init__(403, "Invalid kiosk/user token.")


class InvalidAdminPerms(HttpError):
    def __init__(self):
        super().__init__(403, "You do not have admin perms.")
