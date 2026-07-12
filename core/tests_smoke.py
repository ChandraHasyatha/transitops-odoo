"""
Not part of the permanent suite — a one-off smoke test to prove the wiring
(models -> services -> views -> urls) actually works end to end, using the
spec's own Example Workflow (section 5): Van-05, Alex, 450kg dispatch.
Run with: python manage.py test core.tests_smoke -v 2
"""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Driver, Trip, Vehicle


class SmokeTestSpecWorkflow(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="fleetmgr", password="pass1234", role="fleet_manager"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.vehicle = Vehicle.objects.create(
            registration_number="Van-05",
            model_name="Tata Ace",
            vehicle_type="van",
            max_load_kg=500,
            acquisition_cost=800000,
        )
        self.driver = Driver.objects.create(
            name="Alex",
            license_number="DL-001",
            license_expiry=date.today() + timedelta(days=365),
        )

    def test_full_dispatch_complete_cycle(self):
        # Step 3: create a Draft trip, cargo 450kg (<=500kg max)
        resp = self.client.post(
            "/api/trips/",
            {
                "source": "Chennai",
                "destination": "Madurai",
                "vehicle": self.vehicle.id,
                "driver": self.driver.id,
                "cargo_weight_kg": 450,
                "planned_distance_km": 460,
            },
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        trip_id = resp.data["id"]
        self.assertEqual(resp.data["status"], "draft")

        # Step 4-5: dispatch -> vehicle & driver flip to on_trip
        resp = self.client.post(f"/api/trips/{trip_id}/dispatch/")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.data["status"], "dispatched")
        self.assertEqual(resp.data["vehicle_status"], "on_trip")
        self.assertEqual(resp.data["driver_status"], "on_trip")

        self.vehicle.refresh_from_db()
        self.driver.refresh_from_db()
        self.assertEqual(self.vehicle.status, "on_trip")
        self.assertEqual(self.driver.status, "on_trip")

        # A retired/in-shop vehicle should now be excluded from dispatch pool
        resp = self.client.get("/api/vehicles/?dispatchable=true")
        self.assertNotIn(self.vehicle.id, [v["id"] for v in resp.data["results"]] if "results" in resp.data else [v["id"] for v in resp.data])

        # Step 6-7: complete -> both back to Available
        resp = self.client.post(
            f"/api/trips/{trip_id}/complete/",
            {"final_odometer": 15420, "fuel_consumed_liters": 32},
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.data["vehicle_status"], "available")
        self.assertEqual(resp.data["driver_status"], "available")

        # Step 8: maintenance -> vehicle forced In Shop
        resp = self.client.post(
            "/api/maintenance/",
            {"vehicle": self.vehicle.id, "description": "Oil Change", "cost": 1200},
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.data["vehicle_status"], "in_shop")
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.status, "in_shop")

        # Dashboard KPIs should reflect it
        resp = self.client.get("/api/dashboard/kpis/")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.data["vehicles_in_maintenance"], 1)

    def test_dispatch_rejects_overweight_cargo(self):
        resp = self.client.post(
            "/api/trips/",
            {
                "source": "Chennai",
                "destination": "Madurai",
                "vehicle": self.vehicle.id,
                "driver": self.driver.id,
                "cargo_weight_kg": 600,  # over the 500kg max
                "planned_distance_km": 460,
            },
        )
        trip_id = resp.data["id"]
        resp = self.client.post(f"/api/trips/{trip_id}/dispatch/")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["errors"][0]["code"], "CARGO_OVER_CAPACITY")