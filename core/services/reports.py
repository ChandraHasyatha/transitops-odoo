"""
Reports & analytics calculations (spec section 3.8).

    Fuel Efficiency   = Distance / Fuel
    Fleet Utilization = Active Vehicles / Total Vehicles  (%)
    Operational Cost  = Fuel Cost + Maintenance Cost
    Vehicle ROI       = (Revenue - (Maintenance + Fuel)) / Acquisition Cost

Design notes
------------
Every function here takes plain numbers in, plain numbers out - no Django
ORM calls inside the math. That's deliberate: it means these functions are
unit-testable in milliseconds with no database, and the *aggregation*
functions (`vehicle_report`, `fleet_report`) accept any iterable of
trip/fuel-log/expense records, whether that's a Django QuerySet, a list of
dicts, or a list of model instances - via `_field()`, a tiny duck-typing
helper. When A's models land, a view does only this:

    report = vehicle_report(
        acquisition_cost=vehicle.acquisition_cost,
        trips=vehicle.trips.filter(status="completed"),
        fuel_logs=vehicle.fuel_logs.all(),
        expenses=vehicle.expenses.all(),
    )

No changes needed inside this module.

All divisions guard against zero denominators (a brand-new vehicle with no
fuel logs yet shouldn't 500 the dashboard - it should report `None`/0 and
let the UI show "No data yet").
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Optional


def _field(obj: Any, name: str, default=0):
    """Read `name` off obj whether it's a dict, a model instance, or an
    object with the attribute set - avoids writing two code paths for
    'real querysets' vs 'test fixtures'."""
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def fuel_efficiency(distance_km: float, fuel_liters: float) -> Optional[float]:
    """km per liter. Returns None (not an error) when there's no fuel data yet."""
    if not fuel_liters:
        return None
    return round(distance_km / fuel_liters, 2)


def fleet_utilization(active_vehicles: int, total_vehicles: int) -> float:
    """Percentage of the fleet currently On Trip, 0-100."""
    if not total_vehicles:
        return 0.0
    return round((active_vehicles / total_vehicles) * 100, 2)


def operational_cost(fuel_cost: float, maintenance_cost: float) -> float:
    return round(fuel_cost + maintenance_cost, 2)


def vehicle_roi(
    revenue: float,
    maintenance_cost: float,
    fuel_cost: float,
    acquisition_cost: float,
) -> Optional[float]:
    """(Revenue - (Maintenance + Fuel)) / Acquisition Cost.

    Returned as a ratio (0.25 == 25% ROI), not pre-multiplied by 100, so the
    caller/UI decides formatting. Returns None if acquisition_cost is 0 to
    avoid a divide-by-zero crashing the reports page over a bad data entry.
    """
    if not acquisition_cost:
        return None
    return round((revenue - (maintenance_cost + fuel_cost)) / acquisition_cost, 4)


@dataclass
class VehicleReport:
    total_distance_km: float
    total_fuel_liters: float
    fuel_efficiency_km_per_l: Optional[float]
    total_fuel_cost: float
    total_maintenance_cost: float
    total_expense_cost: float
    operational_cost_total: float
    revenue: float
    roi: Optional[float]


def vehicle_report(
    *,
    acquisition_cost: float,
    trips: Iterable[Any],
    fuel_logs: Iterable[Any],
    expenses: Iterable[Any],
    revenue: float = 0.0,
    distance_field: str = "distance_km",
    fuel_field: str = "liters",
    fuel_cost_field: str = "cost",
    maintenance_cost_field: str = "cost",
    expense_cost_field: str = "amount",
) -> VehicleReport:
    """Roll up a single vehicle's trips/fuel logs/expenses into one report row.

    `expenses` is expected to already be maintenance-tagged vs. other (toll,
    etc.) upstream - pass the maintenance subset as `expenses` and any
    misc tolls/fines through `expense_cost_field` on the same iterable, or
    call twice and sum. Kept generic on purpose since the exact Expense
    model shape isn't finalized yet.
    """
    total_distance = sum(_field(t, distance_field, 0) for t in trips)
    total_fuel_liters = sum(_field(f, fuel_field, 0) for f in fuel_logs)
    total_fuel_cost = sum(_field(f, fuel_cost_field, 0) for f in fuel_logs)
    total_maintenance_cost = sum(_field(e, maintenance_cost_field, 0) for e in expenses)
    total_expense_cost = sum(_field(e, expense_cost_field, 0) for e in expenses)

    op_cost = operational_cost(total_fuel_cost, total_maintenance_cost)

    return VehicleReport(
        total_distance_km=total_distance,
        total_fuel_liters=total_fuel_liters,
        fuel_efficiency_km_per_l=fuel_efficiency(total_distance, total_fuel_liters),
        total_fuel_cost=round(total_fuel_cost, 2),
        total_maintenance_cost=round(total_maintenance_cost, 2),
        total_expense_cost=round(total_expense_cost, 2),
        operational_cost_total=op_cost,
        revenue=revenue,
        roi=vehicle_roi(revenue, total_maintenance_cost, total_fuel_cost, acquisition_cost),
    )


@dataclass
class FleetKPIs:
    """Backs the dashboard KPI cards in section 3.2."""

    active_vehicles: int
    available_vehicles: int
    vehicles_in_maintenance: int
    active_trips: int
    pending_trips: int
    drivers_on_duty: int
    fleet_utilization_pct: float


def fleet_kpis(
    *,
    total_vehicles: int,
    available_vehicles: int,
    on_trip_vehicles: int,
    in_shop_vehicles: int,
    dispatched_trips: int,
    draft_trips: int,
    drivers_on_trip: int,
) -> FleetKPIs:
    return FleetKPIs(
        active_vehicles=on_trip_vehicles,
        available_vehicles=available_vehicles,
        vehicles_in_maintenance=in_shop_vehicles,
        active_trips=dispatched_trips,
        pending_trips=draft_trips,
        drivers_on_duty=drivers_on_trip,
        fleet_utilization_pct=fleet_utilization(on_trip_vehicles, total_vehicles),
    )