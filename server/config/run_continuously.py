import threading
import time
import schedule

def run_continuously(interval=1):
    """
    A plugin of the schedule library that allows tasks to be scheduled in a threaded manner,
    preventing the process from blocking django's background server tasks.
    """
    cease_continuous_run = threading.Event()

    class ScheduleThread(threading.Thread):
        @classmethod
        def run(cls):
            while not cease_continuous_run.is_set():
                schedule.run_pending()
                time.sleep(interval)

    continuous_thread = ScheduleThread()
    continuous_thread.start()
    return cease_continuous_run
