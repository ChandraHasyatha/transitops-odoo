import unittest
from datetime import date, timedelta
from types import SimpleNamespace

from core.services.enums import DriverStatus, TripStatus, VehicleStatus
from core.services.rules import TripValidationError
from core.services.state_machine import (
    InvalidTransitionError,
    MaintenanceStateMachine,
    TripStateMachine,
)

TODAY = date(2026, 7, 12)


def vehicle(status=VehicleStatus.AVAILABLE):
    return SimpleNamespace(status=status.value if isinstance(status, VehicleStatus) else status)


def driver(status=DriverStatus.AVAILABLE):
    return SimpleNamespace(status=status.value if isinstance(status, DriverStatus) else status)


class TestTripStateMachine(unittest.TestCase):
    def test_dispatch_moves_vehicle_and_driver_to_on_trip(self):
        v, d = vehicle(), driver()
        result = TripStateMachine.dispatch(
            trip_status=TripStatus.DRAFT,
            vehicle=v,
            driver=d,
            driver_license_expiry=TODAY + timedelta(days=30),
            cargo_kg=100,
            max_load_kg=500,
            today=TODAY,
        )
        self.assertEqual(result.trip_status, TripStatus.DISPATCHED)
        self.assertEqual(v.status, VehicleStatus.ON_TRIP.value)
        self.assertEqual(d.status, DriverStatus.ON_TRIP.value)

    def test_dispatch_blocked_by_rule_engine_and_status_untouched(self):
        v, d = vehicle(VehicleStatus.IN_SHOP), driver()
        with self.assertRaises(TripValidationError):
            TripStateMachine.dispatch(
                trip_status=TripStatus.DRAFT,
                vehicle=v,
                driver=d,
                driver_license_expiry=TODAY + timedelta(days=30),
                cargo_kg=100,
                max_load_kg=500,
                today=TODAY,
            )
        # side effects must NOT apply on failed validation
        self.assertEqual(v.status, VehicleStatus.IN_SHOP.value)
        self.assertEqual(d.status, DriverStatus.AVAILABLE.value)

    def test_cannot_dispatch_a_completed_trip(self):
        v, d = vehicle(), driver()
        with self.assertRaises(InvalidTransitionError):
            TripStateMachine.dispatch(
                trip_status=TripStatus.COMPLETED,
                vehicle=v,
                driver=d,
                driver_license_expiry=TODAY + timedelta(days=30),
                cargo_kg=100,
                max_load_kg=500,
                today=TODAY,
            )

    def test_complete_frees_vehicle_and_driver(self):
        v, d = vehicle(VehicleStatus.ON_TRIP), driver(DriverStatus.ON_TRIP)
        result = TripStateMachine.complete(trip_status=TripStatus.DISPATCHED, vehicle=v, driver=d)
        self.assertEqual(result.trip_status, TripStatus.COMPLETED)
        self.assertEqual(v.status, VehicleStatus.AVAILABLE.value)
        self.assertEqual(d.status, DriverStatus.AVAILABLE.value)

    def test_cancel_dispatched_trip_restores_availability(self):
        v, d = vehicle(VehicleStatus.ON_TRIP), driver(DriverStatus.ON_TRIP)
        result = TripStateMachine.cancel(trip_status=TripStatus.DISPATCHED, vehicle=v, driver=d)
        self.assertEqual(result.trip_status, TripStatus.CANCELLED)
        self.assertEqual(v.status, VehicleStatus.AVAILABLE.value)
        self.assertEqual(d.status, DriverStatus.AVAILABLE.value)

    def test_cancel_draft_trip_does_not_touch_untouched_resources(self):
        """A Draft trip never dispatched -> vehicle/driver were never
        flipped to On Trip, so cancelling shouldn't 'restore' anything."""
        v, d = vehicle(VehicleStatus.AVAILABLE), driver(DriverStatus.AVAILABLE)
        result = TripStateMachine.cancel(trip_status=TripStatus.DRAFT, vehicle=v, driver=d)
        self.assertEqual(result.trip_status, TripStatus.CANCELLED)
        self.assertEqual(result.notes, [])

    def test_cannot_cancel_already_completed_trip(self):
        v, d = vehicle(), driver()
        with self.assertRaises(InvalidTransitionError):
            TripStateMachine.cancel(trip_status=TripStatus.COMPLETED, vehicle=v, driver=d)


class TestMaintenanceStateMachine(unittest.TestCase):
    def test_open_forces_vehicle_in_shop(self):
        v = vehicle(VehicleStatus.AVAILABLE)
        new_status = MaintenanceStateMachine.open(v)
        self.assertEqual(new_status, VehicleStatus.IN_SHOP)
        self.assertEqual(v.status, VehicleStatus.IN_SHOP.value)

    def test_close_restores_available(self):
        v = vehicle(VehicleStatus.IN_SHOP)
        new_status = MaintenanceStateMachine.close(v)
        self.assertEqual(new_status, VehicleStatus.AVAILABLE)
        self.assertEqual(v.status, VehicleStatus.AVAILABLE.value)

    def test_close_does_not_revive_a_retired_vehicle(self):
        v = vehicle(VehicleStatus.RETIRED)
        new_status = MaintenanceStateMachine.close(v)
        self.assertEqual(new_status, VehicleStatus.RETIRED)
        self.assertEqual(v.status, VehicleStatus.RETIRED.value)


if __name__ == "__main__":
    unittest.main()