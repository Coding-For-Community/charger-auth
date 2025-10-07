import logging
import sys

from ninja.errors import ValidationError

import oauth.api
from ninja import NinjaAPI

logger = logging.getLogger(__name__)

try:
    api = NinjaAPI()

    api.add_router("/oauth", oauth.api.router)
    if "manage.py" not in sys.argv:
        import checkin.api
        import notifs.api

        api.add_router("/checkin", checkin.api.router)
        api.add_router("/notifs", notifs.api.router)

    @api.get("/")
    def home(request):
        return "Whassup"

    @api.exception_handler(ValidationError)
    def handle_validation_error(request, exc):
        logger.critical(
            "Uncaught exception, application will shut down",
            exc_info=exc,
        )
        return api.create_response(request, {"detail": exc.errors}, status=422)

except Exception as e:
    logger.exception("Error when loading API: " + str(e))
