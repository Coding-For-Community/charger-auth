from django.apps import AppConfig


class CheckinConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'checkin'

    def ready(self):
        from django.db.backends.signals import connection_created
        from django.dispatch import receiver

        @receiver(connection_created)
        def setup_sqlite_pragmas(sender, connection, **kwargs):
            if connection.vendor == 'sqlite':
                cursor = connection.cursor()
                cursor.execute('PRAGMA journal_mode=wal;')
                cursor.execute('PRAGMA busy_timeout=5000;')
                cursor.close()
