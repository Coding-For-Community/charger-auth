import os
import ninja

from authlib.integrations.httpx_client import AsyncOAuth2Client
from django.contrib.auth import aauthenticate, alogin
from django.http import HttpRequest, JsonResponse
from django.shortcuts import redirect
from dotenv import load_dotenv

from checkin.core.api_methods import daily_reset
from config import settings
from oauth.models import BlackbaudToken
from oauth.schema import ScannerAppLoginSchema

load_dotenv()
os.environ['AUTHLIB_INSECURE_TRANSPORT'] = "1" if settings.DEBUG else "0"

# noinspection PyUnusedLocal
async def update_token(token, refresh_token=None, access_token=None):
    item = await BlackbaudToken.objects.afirst()
    item.access_token = token['access_token']
    item.refresh_token = token['refresh_token']
    item.expires_at = token['expires_at']
    await item.asave()

oauth = AsyncOAuth2Client(
    client_id=os.environ["OAUTH_CLIENT_ID"],
    client_secret=os.environ["OAUTH_CLIENT_SECRET"],
    update_token=update_token,
    token_endpoint="https://oauth2.sky.blackbaud.com/token",
    base_url="https://api.sky.blackbaud.com/school/v1/",
    headers={'Bb-Api-Subscription-Key': os.environ["BLACKBAUD_SUBSCRIPTION_KEY"]}
)

async def oauth_client():
    """
    Fetches the oauth client, used for get requests to the blackbaud api.
    """
    if oauth.token is None:
        token = await BlackbaudToken.objects.afirst()
        oauth.token = token.to_token() if token else None
        print("Blackbaud token was just initialized.")
    return oauth

router = ninja.Router()

@router.get("/")
async def login(request):
    client = await oauth_client()
    auth_url, _ = client.create_authorization_url(
        "https://oauth2.sky.blackbaud.com/authorization",
        redirect_uri=request.build_absolute_uri("/oauth/authorize/")
    )
    # http://127.0.0.1:8000/oauth/
    return redirect(auth_url)

@router.get("/authorize/")
async def authorize(request):
    client = await oauth_client()
    token = await client.fetch_token(
        authorization_response=request.build_absolute_uri(),
        redirect_uri=request.build_absolute_uri("/oauth/authorize/")
    )
    await BlackbaudToken.objects.all().adelete()
    await BlackbaudToken.objects.acreate(
        token_type=token["token_type"],
        access_token=token["access_token"],
        refresh_token=token["refresh_token"],
        expires_at=token["expires_at"]
    )
    await daily_reset(False) # redo daily reset after the token is reinitialised
    return {
        "token": token
    }

@router.post("/scannerAppLogin/")
async def scanner_app_login(request: HttpRequest, data: ScannerAppLoginSchema):
    user = await request.auser()
    if user.is_authenticated:
        return { "success": True }
    elif not data.verify:
        return { "success": False }
    else:
        res = await aauthenticate(request, username="ScannerAppUser", password=data.password)
        if res is None or not res.is_superuser:
            return { "success": False }
        await alogin(request, user=res)
        return { "success": res.is_superuser }

if settings.DEBUG:
    @router.get("/test/{path:api_route}")
    async def test(request, api_route: str):
        client = await oauth_client()
        args_str = request.build_absolute_uri()
        args_str = args_str[args_str.index("?"):] if "?" in args_str else ""
        res = await client.get(api_route + args_str)
        if res.status_code != 200:
            return res.text
        else:
            return res.json()

    @router.get("/refresh/")
    async def manual_refresh_test(request):
        client = await oauth_client()
        token = await BlackbaudToken.objects.afirst()
        await client.refresh_token(refresh_token=token.refresh_token)
        return "Yeah i hope this worked"

    @router.get("/clear/")
    async def reset_data_debug(request):
        await BlackbaudToken.objects.all().adelete()