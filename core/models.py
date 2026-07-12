
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('fleet_manager', 'Fleet Manager'),
        ('dispatcher', 'Dispatcher'),
        ('safety_officer', 'Safety Officer'),
        ('financial_analyst', 'Financial Analyst'),
    ]
    role = models.CharField(max_length=30, choices=ROLE_CHOICES)


class Vehicle(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('on_trip', 'On Trip'),
        ('in_shop', 'In Shop'),
        ('retired', 'Retired'),
    ]
    registration_number = models.CharField(max_length=20, unique=True)
    model_name = models.CharField(max_length=100)
    vehicle_type = models.CharField(max_length=50)
    max_load_kg = models.DecimalField(max_digits=10, decimal_places=2)
    odometer = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    acquisition_cost = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    region = models.CharField(max_length=100, blank=True)


class Driver(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('on_trip', 'On Trip'),
        ('off_duty', 'Off Duty'),
        ('suspended', 'Suspended'),
    ]
    name = models.CharField(max_length=100)
    license_number = models.CharField(max_length=50, unique=True)
    license_category = models.CharField(max_length=20, blank=True)
    license_expiry = models.DateField()
    contact_number = models.CharField(max_length=20, blank=True)
    safety_score = models.IntegerField(default=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')


class Trip(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('dispatched', 'Dispatched'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    source = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT)
    driver = models.ForeignKey(Driver, on_delete=models.PROTECT)
    cargo_weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    planned_distance_km = models.DecimalField(max_digits=10, decimal_places=2)
    final_odometer = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fuel_consumed_l = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)


class MaintenanceLog(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    description = models.CharField(max_length=200)  # e.g. Oil Change
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)  # True = still In Shop
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)


class FuelLog(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    liters = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()


class Expense(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    category = models.CharField(max_length=50)  # toll, repair, other
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
# Create your models here.
