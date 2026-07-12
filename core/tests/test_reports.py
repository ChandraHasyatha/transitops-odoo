import unittest

from core.services.csv_export import rows_to_csv_string
from core.services.reports import (
    fleet_kpis,
    fleet_utilization,
    fuel_efficiency,
    operational_cost,
    vehicle_report,
    vehicle_roi,
)


class TestReportMath(unittest.TestCase):
    def test_fuel_efficiency_basic(self):
        self.assertEqual(fuel_efficiency(450, 30), 15.0)

    def test_fuel_efficiency_no_fuel_returns_none_not_crash(self):
        self.assertIsNone(fuel_efficiency(450, 0))

    def test_fleet_utilization(self):
        self.assertEqual(fleet_utilization(active_vehicles=3, total_vehicles=12), 25.0)

    def test_fleet_utilization_empty_fleet(self):
        self.assertEqual(fleet_utilization(0, 0), 0.0)

    def test_operational_cost(self):
        self.assertEqual(operational_cost(fuel_cost=200, maintenance_cost=150), 350)

    def test_vehicle_roi(self):
        # revenue 10000, maintenance 500, fuel 300, acquisition 20000
        # (10000 - 800) / 20000 = 0.46
        self.assertEqual(
            vehicle_roi(revenue=10000, maintenance_cost=500, fuel_cost=300, acquisition_cost=20000),
            0.46,
        )

    def test_vehicle_roi_zero_acquisition_cost_returns_none(self):
        self.assertIsNone(
            vehicle_roi(revenue=1000, maintenance_cost=0, fuel_cost=0, acquisition_cost=0)
        )


class TestVehicleReport(unittest.TestCase):
    def test_rolls_up_mixed_dict_and_object_records(self):
        # Deliberately mixes dicts and namespace-style objects to prove the
        # duck-typing helper works either way (querysets vs test fixtures).
        from types import SimpleNamespace

        trips = [{"distance_km": 100}, SimpleNamespace(distance_km=150)]
        fuel_logs = [{"liters": 10, "cost": 800}, {"liters": 8, "cost": 640}]
        expenses = [{"cost": 500, "amount": 500}]

        report = vehicle_report(
            acquisition_cost=100000,
            trips=trips,
            fuel_logs=fuel_logs,
            expenses=expenses,
            revenue=5000,
        )
        self.assertEqual(report.total_distance_km, 250)
        self.assertEqual(report.total_fuel_liters, 18)
        self.assertEqual(report.fuel_efficiency_km_per_l, round(250 / 18, 2))
        self.assertEqual(report.total_fuel_cost, 1440)
        self.assertEqual(report.total_maintenance_cost, 500)
        self.assertEqual(report.operational_cost_total, 1940)
        self.assertIsNotNone(report.roi)


class TestFleetKPIs(unittest.TestCase):
    def test_kpi_snapshot(self):
        kpis = fleet_kpis(
            total_vehicles=20,
            available_vehicles=12,
            on_trip_vehicles=6,
            in_shop_vehicles=2,
            dispatched_trips=6,
            draft_trips=3,
            drivers_on_trip=6,
        )
        self.assertEqual(kpis.active_trips, 6)
        self.assertEqual(kpis.pending_trips, 3)
        self.assertEqual(kpis.fleet_utilization_pct, 30.0)


class TestCsvExport(unittest.TestCase):
    def test_rows_to_csv_string(self):
        fieldnames = ["reg_no", "status"]
        rows = [{"reg_no": "Van-05", "status": "available"}, {"reg_no": "Van-06", "status": "on_trip"}]
        csv_text = rows_to_csv_string(fieldnames, rows)
        lines = csv_text.strip().splitlines()
        self.assertEqual(lines[0], "reg_no,status")
        self.assertIn("Van-05,available", lines[1])

    def test_extra_fields_on_row_are_ignored_not_crashed(self):
        fieldnames = ["reg_no"]
        rows = [{"reg_no": "Van-05", "unexpected_field": "should be dropped"}]
        csv_text = rows_to_csv_string(fieldnames, rows)
        self.assertNotIn("unexpected_field", csv_text)


if __name__ == "__main__":
    unittest.main()