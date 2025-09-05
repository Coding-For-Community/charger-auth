import os
import ninja

from authlib.integrations.httpx_client import AsyncOAuth2Client
from django.shortcuts import redirect
from dotenv import load_dotenv

from checkin.core.api_methods import daily_reset
from config import settings
from oauth.models import BlackbaudToken

load_dotenv()
os.environ['AUTHLIB_INSECURE_TRANSPORT'] = "1" if settings.DEBUG else "0"

# noinspection PyUnusedLocal
async def update_token(token, refresh_token=None, access_token=None):
    item = await BlackbaudToken.objects.afirst()
    item.access_token = token['access_token']
    item.refresh_token = token['refresh_token']
    item.expires_at = token['expires_at']
    await item.asave()

async def init_token():
    token = await BlackbaudToken.objects.afirst()
    oauth.token = token.to_token() if token else None

oauth = AsyncOAuth2Client(
    client_id=os.environ["OAUTH_CLIENT_ID"],
    client_secret=os.environ["OAUTH_CLIENT_SECRET"],
    update_token=update_token,
    token_endpoint="https://oauth2.sky.blackbaud.com/token",
)

def oauth_client():
    """
    Fetches the oauth client, used for get requests to the blackbaud api.
    """
    return oauth

router = ninja.Router()

@router.get("/")
def login(request):
    auth_url, _ = oauth.create_authorization_url(
        "https://oauth2.sky.blackbaud.com/authorization",
        redirect_uri=request.build_absolute_uri("/oauth/authorize/")
    )
    # http://127.0.0.1:8000/oauth/
    return redirect(auth_url)

@router.get("/authorize/")
async def authorize(request):
    token = await oauth.fetch_token(
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
    await daily_reset() # redo daily reset after the token is reinitialised
    return {
        "token": token
    }

if settings.DEBUG:
    @router.get("/test/{path:api_route}")
    async def test(request, api_route: str):
        args_str = request.build_absolute_uri()
        args_str = args_str[args_str.index("?"):] if "?" in args_str else ""
        res = await oauth.get(
            "https://api.sky.blackbaud.com/school/v1/" + api_route + args_str,
            headers={
                'Bb-Api-Subscription-Key': os.environ["BLACKBAUD_SUBSCRIPTION_KEY"]
            }
        )
        if res.status_code != 200:
            return res.text
        else:
            return res.json()

    @router.get("/refresh/")
    async def manual_refresh_test(request):
        token = await BlackbaudToken.objects.afirst()
        await oauth.refresh_token(
            refresh_token=token.refresh_token
        )
        return "Yeah i hope this worked"

    @router.get("/clear/")
    async def reset_data_debug(request):
        await BlackbaudToken.objects.all().adelete()