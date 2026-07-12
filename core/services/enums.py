"""
Shared status enums for TransitOps.

These mirror the `Status values` lists in the spec (section 3.3, 3.4, 3.5)
exactly, so that once A's models.py lands, the model's `choices=` can import
these directly instead of redefining them:

    class Vehicle(models.Model):
        status = models.CharField(
            max_length=20,
            choices=[(s.value, s.label) for s in VehicleStatus],
            default=VehicleStatus.AVAILABLE.value,
        )

Using enums (instead of raw strings scattered across views/serializers) means
a typo like "on_trip " or "OnTrip" fails fast instead of silently breaking a
dispatch rule at 2am during the demo.
"""
from __future__ import annotations

from enum import Enum


class VehicleStatus(str, Enum):
    AVAILABLE = "available"
    ON_TRIP = "on_trip"
    IN_SHOP = "in_shop"
    RETIRED = "retired"

    @property
    def label(self) -> str:
        return {
            VehicleStatus.AVAILABLE: "Available",
            VehicleStatus.ON_TRIP: "On Trip",
            VehicleStatus.IN_SHOP: "In Shop",
            VehicleStatus.RETIRED: "Retired",
        }[self]

    @classmethod
    def dispatchable(cls) -> frozenset["VehicleStatus"]:
        """Statuses eligible to appear in the dispatch selection pool."""
        return frozenset({cls.AVAILABLE})


class DriverStatus(str, Enum):
    AVAILABLE = "available"
    ON_TRIP = "on_trip"
    OFF_DUTY = "off_duty"
    SUSPENDED = "suspended"

    @property
    def label(self) -> str:
        return {
            DriverStatus.AVAILABLE: "Available",
            DriverStatus.ON_TRIP: "On Trip",
            DriverStatus.OFF_DUTY: "Off Duty",
            DriverStatus.SUSPENDED: "Suspended",
        }[self]

    @classmethod
    def dispatchable(cls) -> frozenset["DriverStatus"]:
        return frozenset({cls.AVAILABLE})


class TripStatus(str, Enum):
    DRAFT = "draft"
    DISPATCHED = "dispatched"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

    @property
    def label(self) -> str:
        return self.value.capitalize()


class MaintenanceStatus(str, Enum):
    OPEN = "open"       # active -> vehicle forced to IN_SHOP
    CLOSED = "closed"    # closed -> vehicle restored (unless retired)