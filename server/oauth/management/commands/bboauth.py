import asyncio
import webbrowser

from django.core.management import BaseCommand
from oauth.api import oauth_client


class Command(BaseCommand):
    help = "When run, initializes the access token and refresh token, and stores them within the db."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(f"Running Blackbaud OAuth flow..."))
        client = asyncio.run(oauth_client(fetch_token=False))
        auth_url, _ = client.create_authorization_url(
            "https://oauth2.sky.blackbaud.com/authorization",
            redirect_uri="http://127.0.0.1:8001/oauth/authorize/",
        )
        webbrowser.open(auth_url)
