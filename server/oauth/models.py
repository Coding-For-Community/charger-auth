import os

from cryptography.fernet import Fernet
from django.db import models
from django.contrib import admin
from dotenv import load_dotenv
from config import settings

load_dotenv()
fernet = Fernet(os.environ["FERNET_KEY"].encode())


class BlackbaudToken(models.Model):
    token_type = models.CharField(max_length=40)
    raw_access_token = models.BinaryField(max_length=1500)
    raw_refresh_token = models.BinaryField(max_length=400)
    expires_at = models.PositiveIntegerField()

    @property
    def refresh_token(self):
        return fernet.decrypt(self.raw_refresh_token).decode()

    @property
    def access_token(self):
        return fernet.decrypt(self.raw_access_token).decode()

    def to_dict(self):
        return dict(
            token_type=self.token_type,
            access_token=self.access_token,
            refresh_token=self.refresh_token,
            expires_at=self.expires_at,
        )

    @staticmethod
    async def reset_from_dict(token: dict):
        await BlackbaudToken.objects.all().adelete()
        await BlackbaudToken(
            token_type=token["token_type"],
            raw_access_token=fernet.encrypt(token["access_token"].encode()),
            raw_refresh_token=fernet.encrypt(token["refresh_token"].encode()),
            expires_at=token["expires_at"],
        ).asave()


if settings.DEBUG:
    admin.site.register(BlackbaudToken)
