from django.contrib import admin
from checkin.models import Student

class StudentsAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

# Register your models here.
admin.site.register(Student, StudentsAdmin)
