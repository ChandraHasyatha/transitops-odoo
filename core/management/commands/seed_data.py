import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from core.models import Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense

VEHICLE_MODELS = ['Tata Ace', 'Ashok Leyland Dost', 'Mahindra Bolero Pickup', 'Eicher Pro 2049', 'Force Traveller']
VEHICLE_TYPES = ['Van', 'Truck', 'Pickup', 'Mini Truck']
REGIONS = ['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem']
STATUSES_V = ['available', 'available', 'available', 'on_trip', 'in_shop', 'retired']

FIRST_NAMES = ['Arun', 'Karthik', 'Vijay', 'Suresh', 'Ramesh', 'Anitha', 'Priya', 'Divya', 'Meena', 'Lakshmi']
LAST_NAMES = ['Kumar', 'Raj', 'Prakash', 'Murugan', 'Selvam', 'Devi', 'Nair', 'Iyer']
STATUSES_D = ['available', 'available', 'available', 'on_trip', 'off_duty', 'suspended']


class Command(BaseCommand):
    help = 'Seed the database with synthetic demo data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding vehicles...')
        vehicles = []
        for i in range(30):
            v = Vehicle.objects.create(
                registration_number=f'TN{random.randint(10,99)}AB{1000+i}',
                model_name=random.choice(VEHICLE_MODELS),
                vehicle_type=random.choice(VEHICLE_TYPES),
                max_load_kg=random.choice([500, 800, 1000, 1500, 3000]),
                odometer=random.randint(1000, 80000),
                acquisition_cost=random.randint(300000, 1500000),
                status=random.choice(STATUSES_V),
                region=random.choice(REGIONS),
            )
            vehicles.append(v)
        self.stdout.write(self.style.SUCCESS(f'Created {len(vehicles)} vehicles'))

        self.stdout.write('Seeding drivers...')
        drivers = []
        for i in range(30):
            expiry = date.today() + timedelta(days=random.randint(-30, 700))
            d = Driver.objects.create(
                name=f'{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}',
                license_number=f'TN{random.randint(100000,999999)}',
                license_category=random.choice(['LMV', 'HMV', 'LMV-HMV']),
                license_expiry=expiry,
                contact_number=f'9{random.randint(100000000,999999999)}',
                safety_score=random.randint(60, 100),
                status=random.choice(STATUSES_D),
            )
            drivers.append(d)
        self.stdout.write(self.style.SUCCESS(f'Created {len(drivers)} drivers'))

        self.stdout.write('Seeding trips...')
        trip_count = 0
        for _ in range(15):
            v = random.choice(vehicles)
            d = random.choice(drivers)
            Trip.objects.create(
                source=random.choice(REGIONS),
                destination=random.choice(REGIONS),
                vehicle=v,
                driver=d,
                cargo_weight_kg=min(float(v.max_load_kg) * 0.8, 400),
                planned_distance_km=random.randint(50, 600),
                status=random.choice(['draft', 'dispatched', 'completed', 'cancelled']),
                revenue=random.randint(2000, 20000),
            )
            trip_count += 1
        self.stdout.write(self.style.SUCCESS(f'Created {trip_count} trips'))

        self.stdout.write('Seeding maintenance logs...')
        for _ in range(10):
            MaintenanceLog.objects.create(
                vehicle=random.choice(vehicles),
                description=random.choice(['Oil Change', 'Tyre Replacement', 'Engine Repair', 'Brake Service']),
                cost=random.randint(1000, 15000),
                is_active=random.choice([True, False]),
            )
        self.stdout.write(self.style.SUCCESS('Created 10 maintenance logs'))

        self.stdout.write('Seeding fuel logs...')
        for _ in range(20):
            FuelLog.objects.create(
                vehicle=random.choice(vehicles),
                liters=random.randint(15, 60),
                cost=random.randint(1500, 6000),
                date=date.today() - timedelta(days=random.randint(0, 60)),
            )
        self.stdout.write(self.style.SUCCESS('Created 20 fuel logs'))

        self.stdout.write('Seeding expenses...')
        for _ in range(15):
            Expense.objects.create(
                vehicle=random.choice(vehicles),
                category=random.choice(['toll', 'repair', 'other']),
                amount=random.randint(200, 5000),
                date=date.today() - timedelta(days=random.randint(0, 60)),
            )
        self.stdout.write(self.style.SUCCESS('Created 15 expenses'))

        self.stdout.write(self.style.SUCCESS('Seeding complete!'))