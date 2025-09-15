import asyncio
import schedule

from django.core.management import BaseCommand
from checkin.core.api_methods import daily_reset

class Command(BaseCommand):
    help = 'When run, periodically resets the database data at a certain time(7:00 by default) every day.'

    def add_arguments(self, parser):
        parser.add_argument(
            '-time',
            type=str,
            help='The time to run periodic reset.',
            default="07:00",
            nargs="?"
        )

    def handle(self, *args, **options):
        try:
            asyncio.run(self.run_cmd(options['time']))
        except KeyboardInterrupt:
            return

    async def run_cmd(self, scheduled_time: str):
        self.stdout.write(self.style.SUCCESS(f"Periodic daily reset task started."))
        await daily_reset(False)
        schedule.every().day.at(scheduled_time).do(
            lambda: asyncio.create_task(daily_reset(True))
        )
        while True:
            schedule.run_pending()
            await asyncio.sleep(1)
