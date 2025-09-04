from django.contrib import admin

from checkin.models import CustomSchedule, CustomFreeBlock, Student

class StudentsAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('id', 'name')

# Register your models here.
admin.site.register(CustomSchedule)
admin.site.register(CustomFreeBlock)
admin.site.register(Student, StudentsAdmin)
