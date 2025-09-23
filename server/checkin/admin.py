from django.contrib import admin
from checkin.models import Student, CheckInRecord, FreeBlockToday


class StudentsAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

# Register your models here.
admin.site.register(Student, StudentsAdmin)
admin.site.register(CheckInRecord)
admin.site.register(FreeBlockToday)