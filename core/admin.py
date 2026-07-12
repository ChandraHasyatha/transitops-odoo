from django.contrib import admin
from .models import (
    Vehicle,
    Driver,
    Trip,
    MaintenanceLog,
    FuelLog,
    Expense,
)

admin.site.register(Vehicle)
admin.site.register(Driver)
admin.site.register(Trip)
admin.site.register(MaintenanceLog)
admin.site.register(FuelLog)
admin.site.register(Expense)