import asyncio
import aiohttp

_client_session: aiohttp.ClientSession | None = None
_unsafe_cookie_jar = True

async def close_client_session():
    if _client_session:
        await _client_session.close()

def init_client_session():
    global _client_session
    cookie_jar = aiohttp.CookieJar(unsafe=_unsafe_cookie_jar)
    conn = aiohttp.TCPConnector(loop=asyncio.get_event_loop(), ssl=False)
    _client_session = aiohttp.ClientSession(connector=conn, cookie_jar=cookie_jar, trust_env=True)

def get_client_session():
    if _client_session is None:
        raise Exception("Client session not initialized")
    return _client_session

