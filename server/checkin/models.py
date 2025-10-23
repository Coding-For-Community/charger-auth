from asgiref.sync import sync_to_async
from bitfield import BitField
from django.core.validators import RegexValidator, EmailValidator
from django.db import models
from solo.models import SingletonModel
from django.db.models.signals import post_delete
from django.dispatch import receiver
import os
from checkin.core.consts import FreeBlock, ALL_FREE_BLOCKS, US_EASTERN, EVERYONE_KW


class Student(models.Model):
    """
    A cary academy student.
    """

    email = models.EmailField(max_length=45, primary_key=True)
    free_blocks = BitField(flags=ALL_FREE_BLOCKS, default=0)
    name = models.CharField(max_length=30, default="[Unknown]")
    is_senior = models.BooleanField(default=False)

    @classmethod
    def as_bit_str(cls, free_block: FreeBlock) -> int:
        return getattr(cls.free_blocks, free_block)


class FreePeriodCheckIn(models.Model):
    """
    A free period check-in attempt.
    """

    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="fp_records"
    )
    free_block_idx = models.PositiveSmallIntegerField(
        choices=[(i, ALL_FREE_BLOCKS[i]) for i in range(len(ALL_FREE_BLOCKS))]
    )  # Use PositiveSmallIntegerField for faster write speeds
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
            ),
        ]


class SeniorPrivilegeCheckIn(models.Model):
    """
    A senior privileges check-in and check-out attempt.
    """

    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    device_id = models.CharField(max_length=32)
    checked_out = models.BooleanField()
    check_out_date = models.DateTimeField()
    check_in_date = models.DateTimeField(null=True)
    video = models.FileField(upload_to="checkin_vids/", blank=True)

    def name(self):
        return "sp_check_out" if self.checked_out else "sp_check_in"

    def dict(self):
        """
        Fetches a dict representation of this model.
        To call this method, you must use select_related('students') in the iterator clause.
        """
        status = f"{'tentative' if self.video else 'checked'}_{'out' if self.checked_out else 'in'}"
        date_fmt = f"{self.check_out_date.astimezone(US_EASTERN).strftime('%I:%M %p')}"
        if self.check_in_date:
            date_fmt += (
                f" - {self.check_in_date.astimezone(US_EASTERN).strftime('%I:%M %p')}"
            )
        return {
            "name": self.student.name,
            "email": self.student.email,
            "status": status,
            "date_str": date_fmt,
        }


class FreeBlockToday(models.Model):
    """
    Represents the time of a free block today.
    """

    block: FreeBlock = models.CharField(
        max_length=1, validators=[RegexValidator("[A-G]")], primary_key=True
    )
    start = models.DateTimeField()
    end = models.DateTimeField()


def email_or_everyone(value):
    if value != EVERYONE_KW:
        EmailValidator()(value)


class SeniorPrivilegesBan(models.Model):
    # No foreign key relationship here
    # since we are periodically deleting & resetting Student(s).
    is_for = models.CharField(
        max_length=45, validators=[email_or_everyone], primary_key=True
    )

    @classmethod
    async def applies_to(cls, is_for: str):
        return await cls.objects.filter(is_for=is_for).aexists()


@receiver(post_delete, sender=SeniorPrivilegeCheckIn)
@receiver(post_delete, sender=FreePeriodCheckIn)
def auto_delete_videos(sender, instance, **kwargs):
    if instance.video and os.path.isfile(instance.video.path):
        os.remove(instance.video.path)
