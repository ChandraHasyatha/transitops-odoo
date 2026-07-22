from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User,
    Vehicle,
    Driver,
    Trip,
    MaintenanceLog,
    FuelLog,
    Expense,
)


class RoleUserAdmin(UserAdmin):
    """
    Lets the admin (createsuperuser) view and manage every registered user,
    including the role each one signed up with.
    """
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')

    fieldsets = UserAdmin.fieldsets + (
        ('Role', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role', {'fields': ('email', 'role')}),
    )


admin.site.register(User, RoleUserAdmin)
admin.site.register(Vehicle)
admin.site.register(Driver)
admin.site.register(Trip)
admin.site.register(MaintenanceLog)
admin.site.register(FuelLog)
admin.site.register(Expense)
