from ninja import NinjaAPI

import oauth.api
import checkin.api

api = NinjaAPI()
api.add_router("/checkin", checkin.api.router)
api.add_router("/oauth", oauth.api.router)

@api.get("/")
def home(request):
    return "hi."