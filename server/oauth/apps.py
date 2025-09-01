import asyncio
import sys

from django.apps import AppConfig

class AuthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'oauth'

    def ready(self):
        if "manage.py" not in sys.argv:
            from oauth.api import init_token
            print("hi!!!!!")
            asyncio.create_task(init_token())