from ninja import NinjaAPI

import checkin.api

api = NinjaAPI()
api.add_router("/checkin", checkin.api.router)

@api.get("/")
def home(request):
    return "hi."