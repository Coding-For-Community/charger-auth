from bitfield import BitField
from bitfield.forms import BitFieldCheckboxSelectMultiple
from django.contrib import admin
from checkin.models import (
    Student,
    FreeBlockToday,
    FreePeriodCheckIn,
    SeniorPrivilegeCheckIn,
    SeniorPrivilegesBan,
)


class StudentsAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)
    formfield_overrides = {
        BitField: {"widget": BitFieldCheckboxSelectMultiple},
    }


# Register your models here.
admin.site.register(Student, StudentsAdmin)
admin.site.register(FreeBlockToday)
admin.site.register(FreePeriodCheckIn)
admin.site.register(SeniorPrivilegesBan)
admin.site.register(SeniorPrivilegeCheckIn)
