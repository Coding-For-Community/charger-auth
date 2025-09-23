"""
Endpoints for push notification support.
"""
import os
import ninja

from base64 import b64decode
from dotenv import load_dotenv
from ninja.errors import HttpError
from pywebpush import webpush, WebPushException

from checkin.models import Student
from config import settings
from notifs.models import SubscriptionData

load_dotenv()

router = ninja.Router()

class NeedsEmail(ninja.Schema):
    email_b64: str

class NeedsEmailAndSubscription(NeedsEmail):
    subscription: dict

@router.get("/publicKey/")
def vapid_public_key(request):
    return {
        "publicKey": os.environ["VAPID_PUBLIC_KEY"]
    }

@router.get("/enabled/{email_b64}/")
async def is_registered(request, email_b64: str):
    student = await get_student(email_b64)
    data = await SubscriptionData.objects.filter(student=student).afirst()
    return { "registered": bool(data) }

@router.post("/register/")
async def register_webpush(request, data: NeedsEmailAndSubscription):
    student = await get_student(data.email_b64)
    await SubscriptionData(
        student=student,
        subscription=data.subscription
    ).asave()
    return { "success": True }

@router.post("/unregister/")
async def unregister_webpush(request, data: NeedsEmail):
    student = await get_student(data.email_b64)
    await SubscriptionData.objects.filter(student=student).adelete()
    return { "success": True }

async def get_student(email_b64: str):
    student = await Student.objects.filter(email=b64decode(email_b64).decode('utf-8')).afirst()
    if not student:
        raise HttpError(400, "Student does not exist")
    return student

if settings.DEBUG:
    @router.get("/test/{email_b64}")
    async def test(request, email_b64: str):
        student = await get_student(email_b64)
        data = await SubscriptionData.objects.filter(student=student).afirst()
        if data is None:
            return { "success": False }
        try:
            webpush(
                subscription_info=data.subscription,
                data="Mary had a little lamb, with a nice mint jelly",
                vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
                vapid_claims={
                    "sub": "mailto:" + data.student.email,
                }
            )
            return { "success": True }
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
            return { "success": False }
