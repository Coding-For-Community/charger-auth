from django.db import models

class BlackbaudToken(models.Model):
    token_type = models.CharField(max_length=40)
    access_token = models.CharField(max_length=1300)
    refresh_token = models.CharField(max_length=100)
    expires_at = models.PositiveIntegerField()

    def to_token(self):
        return dict(
            access_token=self.access_token,
            token_type=self.token_type,
            refresh_token=self.refresh_token,
            expires_at=self.expires_at,
        )
