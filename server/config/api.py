import oauth.api
import checkin.api
import notifs.api

from ninja import NinjaAPI

api = NinjaAPI()
api.add_router("/checkin", checkin.api.router)
api.add_router("/oauth", oauth.api.router)
api.add_router("/notifs", notifs.api.router)

@api.get("/")
def home(request):
    return "hi."