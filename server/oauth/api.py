"""
Stores an oauth-supporting httpx client that allows for access to the blackbaud API.
Tokens are cached in the database and fetched upon startup.
To generate a new token, run `py manage.py bboauth` in the terminal AFTER the server
is started with `py main.py` on a different terminal.
"""
import logging
import os
import ninja

from authlib.integrations.httpx_client import AsyncOAuth2Client
from dotenv import load_dotenv
from config import settings
from oauth.models import BlackbaudToken

load_dotenv()
os.environ['AUTHLIB_INSECURE_TRANSPORT'] = "1" if settings.DEBUG else "0"

logger = logging.getLogger(__name__)

async def oauth_client(fetch_token=True):
    """
    Fetches the oauth client, used for get requests to the blackbaud api.
    """
    if fetch_token and oauth.token is None:
        token = await BlackbaudToken.objects.afirst()
        oauth.token = token.to_dict() if token else None
        logger.info("Blackbaud token was just initialized.")
    return oauth

# noinspection PyUnusedLocal
async def __update_token_impl(token, refresh_token=None, access_token=None):
    await BlackbaudToken.reset_from_dict(token)

oauth = AsyncOAuth2Client(
    client_id=os.environ["OAUTH_CLIENT_ID"],
    client_secret=os.environ["OAUTH_CLIENT_SECRET"],
    update_token=__update_token_impl,
    token_endpoint="https://oauth2.sky.blackbaud.com/token",
    base_url="https://api.sky.blackbaud.com/school/v1/",
    headers={'Bb-Api-Subscription-Key': os.environ["BLACKBAUD_SUBSCRIPTION_KEY"]}
)

router = ninja.Router()

@router.get("/authorize/")
async def authorize(request):
    client = await oauth_client(fetch_token=False)
    token = await client.fetch_token(
        authorization_response=request.build_absolute_uri(),
        redirect_uri=request.build_absolute_uri("/oauth/authorize/")
    )
    await BlackbaudToken.reset_from_dict(token)
    return {
        "token": token
    }

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
