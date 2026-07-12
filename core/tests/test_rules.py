"""
Run with:  python -m pytest core/tests/test_rules.py -v
or:        python -m unittest core.tests.test_rules -v

No Django app registry / DB needed - these exercise the pure-Python engine
directly, matching how the spec's Example Workflow (section 5) should behave.
"""
import unittest
from datetime import date, timedelta

from core.services.enums import DriverStatus, VehicleStatus
from core.services.rules import DispatchContext, DispatchRuleEngine, TripValidationError

TODAY = date(2026, 7, 12)


def make_ctx(**overrides):
    defaults = dict(
        vehicle_status=VehicleStatus.AVAILABLE,
        driver_status=DriverStatus.AVAILABLE,
        driver_license_expiry=TODAY + timedelta(days=365),
        cargo_kg=450,
        max_load_kg=500,
        today=TODAY,
    )
    defaults.update(overrides)
    return DispatchContext(**defaults)


class TestDispatchRuleEngine(unittest.TestCase):
    def test_happy_path_from_spec_example(self):
        """Section 5, Steps 1-4: Van-05 (500kg max), Alex (valid license),
        450kg cargo -> must be allowed."""
        ctx = make_ctx()
        self.assertTrue(DispatchRuleEngine.is_valid(ctx))
        self.assertEqual(DispatchRuleEngine.validate(ctx), [])

    def test_retired_vehicle_rejected(self):
        ctx = make_ctx(vehicle_status=VehicleStatus.RETIRED)
        violations = DispatchRuleEngine.validate(ctx)
        self.assertEqual([v.code for v in violations], ["VEHICLE_NOT_OPERABLE"])

    def test_in_shop_vehicle_rejected(self):
        ctx = make_ctx(vehicle_status=VehicleStatus.IN_SHOP)
        violations = DispatchRuleEngine.validate(ctx)
        self.assertEqual([v.code for v in violations], ["VEHICLE_NOT_OPERABLE"])

    def test_vehicle_already_on_trip_rejected(self):
        ctx = make_ctx(vehicle_status=VehicleStatus.ON_TRIP)
        violations = DispatchRuleEngine.validate(ctx)
        self.assertEqual([v.code for v in violations], ["VEHICLE_ALREADY_ON_TRIP"])

    def test_suspended_driver_rejected(self):
        ctx = make_ctx(driver_status=DriverStatus.SUSPENDED)
        violations = DispatchRuleEngine.validate(ctx)
        self.assertEqual([v.code for v in violations], ["DRIVER_SUSPENDED"])

    def test_expired_license_rejected(self):
        ctx = make_ctx(driver_license_expiry=TODAY - timedelta(days=1))
        violations = DispatchRuleEngine.validate(ctx)
        self.assertEqual([v.code for v in violations], ["DRIVER_LICENSE_EXPIRED"])

    def test_license_expiring_today_is_still_valid(self):
        """Edge case: expiry == today should NOT be treated as expired."""
        ctx = make_ctx(driver_license_expiry=TODAY)
        self.assertTrue(DispatchRuleEngine.is_valid(ctx))

    def test_driver_already_on_trip_rejected(self):
        ctx = make_ctx(driver_status=DriverStatus.ON_TRIP)
        violations = DispatchRuleEngine.validate(ctx)
        self.assertEqual([v.code for v in violations], ["DRIVER_ALREADY_ON_TRIP"])

    def test_cargo_over_capacity_rejected(self):
        ctx = make_ctx(cargo_kg=501, max_load_kg=500)
        violations = DispatchRuleEngine.validate(ctx)
        self.assertEqual([v.code for v in violations], ["CARGO_OVER_CAPACITY"])

    def test_cargo_exactly_at_capacity_is_allowed(self):
        """Spec says 'must not exceed' -> equal to capacity is fine."""
        ctx = make_ctx(cargo_kg=500, max_load_kg=500)
        self.assertTrue(DispatchRuleEngine.is_valid(ctx))

    def test_multiple_violations_all_reported_at_once(self):
        ctx = make_ctx(
            vehicle_status=VehicleStatus.IN_SHOP,
            driver_status=DriverStatus.SUSPENDED,
            cargo_kg=999,
            max_load_kg=500,
        )
        violations = DispatchRuleEngine.validate(ctx)
        codes = {v.code for v in violations}
        self.assertEqual(
            codes, {"VEHICLE_NOT_OPERABLE", "DRIVER_SUSPENDED", "CARGO_OVER_CAPACITY"}
        )

    def test_assert_valid_raises_with_structured_errors(self):
        ctx = make_ctx(driver_status=DriverStatus.SUSPENDED)
        with self.assertRaises(TripValidationError) as cm:
            DispatchRuleEngine.assert_valid(ctx)
        payload = cm.exception.as_dict()
        self.assertEqual(payload["errors"][0]["code"], "DRIVER_SUSPENDED")

    def test_accepts_raw_string_status_values(self):
        """DispatchContext should coerce plain strings (e.g. straight off a
        model's CharField) into the enum automatically."""
        ctx = DispatchContext(
            vehicle_status="available",
            driver_status="available",
            driver_license_expiry=TODAY + timedelta(days=1),
            cargo_kg=10,
            max_load_kg=100,
            today=TODAY,
        )
        self.assertTrue(DispatchRuleEngine.is_valid(ctx))


if __name__ == "__main__":
    unittest.main()