from typing import override

from asgiref.sync import sync_to_async
from bitfield import BitField
from django.core.validators import RegexValidator
from django.db import models
from pydantic import ValidationError
from solo.models import SingletonModel

from checkin.core.types import FreeBlock, ALL_FREE_BLOCKS


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

    @override
    def save(self, *args, **kwargs):
        if self.device_id and self.video:
            raise ValidationError("You cannot provide both 'device_id' and 'video'. Both cannot be blank.")

        if not self.device_id and not self.video:
            raise ValidationError("You must provide one of 'device_id' or 'video'. Both cannot be blank.")
        super().save(*args, **kwargs)

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

    async def astudent(self):
        return await sync_to_async(lambda: self.student)()



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
