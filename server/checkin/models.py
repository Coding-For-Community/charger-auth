from typing import override

from asgiref.sync import sync_to_async
from bitfield import BitField
from django.core.validators import RegexValidator
from django.db import models
from pydantic import ValidationError
from solo.models import SingletonModel
from django.db.models.signals import post_delete
from django.dispatch import receiver
import os
from checkin.core.consts import FreeBlock, ALL_FREE_BLOCKS, US_EASTERN


class Student(models.Model):
    """
    A cary academy student.
    """

    email = models.EmailField(max_length=200, primary_key=True)
    free_blocks = BitField(flags=ALL_FREE_BLOCKS, default=0)
    name = models.CharField(max_length=100, default="[Unknown]")
    has_sp = models.BooleanField(default=False)


class FreePeriodCheckIn(models.Model):
    """
    A free period check-in attempt.
    """

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="fp_records"
    )
    free_block_idx = models.PositiveSmallIntegerField(
        choices=[(i, ALL_FREE_BLOCKS[i]) for i in range(len(ALL_FREE_BLOCKS))]
    ) # Use PositiveSmallIntegerField for faster write speeds
    device_id = models.CharField(max_length=32)
    video = models.FileField(upload_to="checkin_vids/", blank=True)

    async def astudent(self):
        return await sync_to_async(lambda: self.student)()

    def block(self) -> FreeBlock:
        # The "display value" is the string repr
        return self.get_free_block_idx_display()

    def set_block(self, value: FreeBlock):
        self.free_block_idx = ALL_FREE_BLOCKS.index(value)

    def name(self):
        return f"free_period_{self.block()}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["device_id", "free_block_idx"], name="unique_device_id"
            ),
            models.UniqueConstraint(
                fields=["student", "free_block_idx"], name="unique_student"
            )
        ]


class SeniorPrivilegeCheckIn(models.Model):
    """
    A senior privileges check-in and check-out attempt.
    """

    student = models.OneToOneField(
        Student,
        on_delete=models.CASCADE,
        related_name="sp_record"
    )
    device_id = models.CharField(max_length=32)
    checked_out = models.BooleanField()
    check_out_date = models.DateTimeField(auto_now_add=True)
    check_in_date = models.DateTimeField(null=True)
    video = models.FileField(upload_to="checkin_vids/", blank=True)

    def name(self):
        return "sp_check_out" if self.checked_out else "sp_check_in"

    def dict(self):
        """
        Fetches a dict representation of this model.
        To call this method, you must use select_related('students') in the iterator clause.
        """
        status = f"{"tentative" if self.video else "checked"}_{"out" if self.checked_out else "in"}"
        date_fmt = f"{self.check_out_date.astimezone(US_EASTERN).strftime("%I:%M %p")}"
        if self.check_in_date:
            date_fmt += f" - {self.check_in_date.astimezone(US_EASTERN).strftime("%I:%M %p")}"
        return {
            "name": self.student.name,
            "email": self.student.email,
            "status": status,
            "date_str": date_fmt
        }


@receiver(post_delete, sender=SeniorPrivilegeCheckIn)
@receiver(post_delete, sender=FreePeriodCheckIn)
def auto_delete_videos(sender, instance, **kwargs):
    if instance.video and os.path.isfile(instance.video.path):
        os.remove(instance.video.path)


class FreeBlockToday(models.Model):
    """
    Represents the time of a free block today.
    """

    block: FreeBlock = models.CharField(
        max_length=1, validators=[RegexValidator("[A-G]")], primary_key=True
    )
    time = models.TimeField()


class PersistentState(SingletonModel):
    desire_manual_reset = models.BooleanField(default=False)

    @classmethod
    async def aget(cls):
        return await sync_to_async(cls.get_solo)()
