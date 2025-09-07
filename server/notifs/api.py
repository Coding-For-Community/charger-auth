import os

import ninja
import schedule

from dotenv import load_dotenv
from ninja.errors import HttpError
from pywebpush import webpush, WebPushException

from checkin.models import Student
from config import settings
from notifs.models import SubscriptionData

load_dotenv()

router = ninja.Router()

class WebpushIn(ninja.Schema):
    subscription: dict
    user_id: int

@router.get("/publicKey/")
def vapid_public_key(request):
    return {
        "publicKey": os.environ["VAPID_PUBLIC_KEY"]
    }

@router.post("/register/")
async def register_webpush(request, data: WebpushIn):
    student = await Student.objects.filter(id=data.user_id).afirst()
    if not student:
        raise HttpError(400, "Student does not exist")
    await SubscriptionData.objects.acreate(
        student=student,
        subscription=data.subscription
    )
    return { "success": True }

@router.post("/unregister/")
async def unregister_webpush(request, data: WebpushIn):
    student = await Student.objects.filter(id=data.user_id).afirst()
    if not student:
        raise HttpError(400, "Student does not exist")
    await SubscriptionData.objects.filter(student=student).adelete()
    return { "success": True }

if settings.DEBUG:
    @router.get("/test/{int:userid}")
    def test(request, userid: int):
        student = Student.objects.filter(id=userid).first()
        if not student:
            raise HttpError(400, "Student does not exist")
        data = SubscriptionData.objects.filter(student=student).first()
        if data:
            run_webpush(data)
        return { "success": True }

def run_webpush(data: SubscriptionData):
    try:
        webpush(
            subscription_info=data.subscription,
            data="Mary had a little lamb, with a nice mint jelly",
            vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
            vapid_claims={
                "sub": "mailto:" + data.student.email,
            }
        )
    except WebPushException as ex:
        print("I'm sorry, Dave, but I can't do that: {}", repr(ex))
        # Mozilla returns additional information in the body of the response.
        if ex.response is not None and ex.response.json():
            extra = ex.response.json()
            print("Remote service replied with a {}:{}, {}",
                  extra.code,
                  extra.errno,
                  extra.message
                  )


