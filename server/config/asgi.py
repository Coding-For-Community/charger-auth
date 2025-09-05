"""
ASGI config for server project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
import sys
import traceback

import django
import schedule
import asyncio

from django.core.asgi import ASGIHandler
from config.run_continuously import run_continuously

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

class CustomASGIHandler(ASGIHandler):
    def __init__(self):
        super().__init__()

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'lifespan':
            while True:
                message = await receive()
                if message['type'] == 'lifespan.startup':
                    try:
                        # Sets up scheduler
                        self.stop_run_continuously = run_continuously()

                        print("got here")
                        # Registers cached blackbaud token
                        from oauth.api import init_token
                        await init_token()

                        # Sets up daily reset scheduling
                        from checkin.core.api_methods import daily_reset
                        from checkin.core.checkin_token import update_checkin_token
                        if not "-noReset" in sys.argv:
                            await daily_reset()
                        schedule.every().day.at("07:00").do(lambda: asyncio.create_task(daily_reset()))
                        schedule.every(5).seconds.do(update_checkin_token)
                        print("got here 2")
                    except:
                        print(traceback.format_exc()) # We have to use a broad exception clause since ASGI silently fails if an error occurs
                    await send({'type': 'lifespan.startup.complete'})
                elif message['type'] == 'lifespan.shutdown':
                    self.stop_run_continuously.set()
                    await send({'type': 'lifespan.shutdown.complete'})
                    return
        await super().__call__(scope, receive, send)

def get_asgi_application():
    django.setup(set_prefix=False)
    app = CustomASGIHandler()
    return app

application = get_asgi_application()
