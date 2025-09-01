import os
import ninja

from authlib.integrations.httpx_client import AsyncOAuth2Client
from django.shortcuts import redirect
from dotenv import load_dotenv
from config import settings
from oauth.models import BlackbaudToken

load_dotenv()

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
)

def oauth_client():
    """
    Fetches the oauth client, used for get requests to the blackbaud api.
    """
    return oauth

router = ninja.Router()
auth_endpoint = "https://oauth2.sky.blackbaud.com/authorization"
token_endpoint = "https://oauth2.sky.blackbaud.com/token"

@router.get("/")
def login(request):
    auth_url, _ = oauth.create_authorization_url(
        auth_endpoint,
        redirect_uri=request.build_absolute_uri("/oauth/authorize/")
    )
    return redirect(auth_url)

@router.get("/authorize/")
async def authorize(request):
    token = await oauth.fetch_token(
        token_endpoint,
        authorization_response=request.build_absolute_uri(),
        redirect_uri=request.build_absolute_uri("/oauth/authorize/")
    )
    token_model = await BlackbaudToken.objects.afirst()
    if not token_model:
        token_model = BlackbaudToken()
    token_model.token_type = token["token_type"]
    token_model.access_token = token["access_token"]
    token_model.refresh_token = token["refresh_token"]
    token_model.expires_at = token["expires_at"]
    await token_model.asave()
    return {
        "token": token
    }

if settings.DEBUG:
    @router.get("/test/{path:api_route}")
    async def test(request, api_route: str):
        res = await oauth.get("https://api.sky.blackbaud.com/afe-rostr/ims/oneroster/v1p1/" + api_route)
        if res.status_code != 200:
            return res.text
        else:
            return res.json()

    @router.get("/refresh")
    async def manual_refresh_test(request):
        token = await BlackbaudToken.objects.afirst()
        await oauth.refresh_token(
            token_endpoint,
            refresh_token=token.refresh_token
        )
        return "Yeah i hope this worked"

    @router.get("/clear/")
    async def reset_data_debug(request):
        await BlackbaudToken.objects.all().adelete()