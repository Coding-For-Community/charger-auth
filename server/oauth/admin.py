from django.contrib import admin

from config import settings
from oauth.models import BlackbaudToken

if settings.DEBUG:
    admin.site.register(BlackbaudToken)