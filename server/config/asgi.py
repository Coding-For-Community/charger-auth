"""
ASGI config for server project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from typing import Callable, Awaitable

import django

from django.core.asgi import ASGIHandler
from core.client_session import close_client_session, init_client_session
from core.run_continuously import run_continuously

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

class CustomASGIHandler(ASGIHandler):
    def __init__(self):
        super().__init__()

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'lifespan':
            while True:
                message = await receive()
                if message['type'] == 'lifespan.startup':
                    init_client_session()
                    # Sets up scheduler
                    self.stop_run_continuously = run_continuously()
                    await send({'type': 'lifespan.startup.complete'})
                elif message['type'] == 'lifespan.shutdown':
                    await close_client_session()
                    self.stop_run_continuously.set()
                    await send({'type': 'lifespan.shutdown.complete'})
                    return
        await super().__call__(scope, receive, send)

def get_asgi_application():
    django.setup(set_prefix=False)
    app = CustomASGIHandler()
    return app

application = get_asgi_application()
