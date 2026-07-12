"""
Trip lifecycle & maintenance state machine.

Encodes rules 6-9 from the spec (the automatic status side-effects):

  6. Dispatching a trip  -> vehicle & driver -> On Trip
  7. Completing a trip   -> vehicle & driver -> Available
  8. Cancelling a trip   -> vehicle & driver -> Available
  9. Opening maintenance -> vehicle -> In Shop
     Closing maintenance -> vehicle -> Available (unless Retired)

Design notes
------------
* Transitions are declared in a table (`_TRIP_TRANSITIONS`) rather than
  buried in if/elif branches, so "can Trip go from Draft -> Completed
  directly?" is answerable by reading one dict, and adding a future state
  (e.g. "Delayed") means adding one line, not hunting through view code.
* Vehicle/Driver are accessed only through the `SupportsStatus` protocol
  (anything with a `.status` attribute). That means this module works today
  against a plain object/dict-wrapper in a unit test, and tomorrow against
  A's real Django model instances, with zero code changes.
* Every transition method returns a `TransitionResult` describing exactly
  what changed, which is handy both for the API response and for an audit
  log entry ("Trip #42 dispatched: vehicle Van-05 -> on_trip, driver Alex ->
  on_trip") if that becomes a bonus feature.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Protocol, runtime_checkable

from core.services.enums import DriverStatus, TripStatus, VehicleStatus
from core.services.rules import DispatchContext, DispatchRuleEngine


@runtime_checkable
class SupportsStatus(Protocol):
    status: str


class InvalidTransitionError(Exception):
    def __init__(self, from_state: str, to_state: str, entity: str = "Trip"):
        super().__init__(f"{entity} cannot move from '{from_state}' to '{to_state}'.")
        self.from_state = from_state
        self.to_state = to_state


@dataclass
class TransitionResult:
    trip_status: TripStatus
    vehicle_status: VehicleStatus | None = None
    driver_status: DriverStatus | None = None
    notes: list[str] = field(default_factory=list)


# Legal trip transitions, per section 3.5: Draft -> Dispatched -> Completed / Cancelled
_TRIP_TRANSITIONS: dict[TripStatus, set[TripStatus]] = {
    TripStatus.DRAFT: {TripStatus.DISPATCHED, TripStatus.CANCELLED},
    TripStatus.DISPATCHED: {TripStatus.COMPLETED, TripStatus.CANCELLED},
    TripStatus.COMPLETED: set(),
    TripStatus.CANCELLED: set(),
}


def _coerce_trip_status(value) -> TripStatus:
    return value if isinstance(value, TripStatus) else TripStatus(value)


class TripStateMachine:
    """Applies a trip transition and the matching vehicle/driver side-effects."""

    @staticmethod
    def _guard(current: TripStatus, target: TripStatus) -> None:
        current = _coerce_trip_status(current)
        if target not in _TRIP_TRANSITIONS.get(current, set()):
            raise InvalidTransitionError(current.value, target.value)

    @classmethod
    def dispatch(
        cls,
        *,
        trip_status: TripStatus,
        vehicle: SupportsStatus,
        driver: SupportsStatus,
        driver_license_expiry: date,
        cargo_kg: float,
        max_load_kg: float,
        today: date | None = None,
    ) -> TransitionResult:
        """Draft -> Dispatched. Validates the 6 dispatch rules first."""
        cls._guard(trip_status, TripStatus.DISPATCHED)

        ctx = DispatchContext(
            vehicle_status=vehicle.status,
            driver_status=driver.status,
            driver_license_expiry=driver_license_expiry,
            cargo_kg=cargo_kg,
            max_load_kg=max_load_kg,
            today=today or date.today(),
        )
        DispatchRuleEngine.assert_valid(ctx)  # raises TripValidationError on failure

        vehicle.status = VehicleStatus.ON_TRIP.value
        driver.status = DriverStatus.ON_TRIP.value

        return TransitionResult(
            trip_status=TripStatus.DISPATCHED,
            vehicle_status=VehicleStatus.ON_TRIP,
            driver_status=DriverStatus.ON_TRIP,
            notes=["Vehicle -> On Trip", "Driver -> On Trip"],
        )

    @classmethod
    def complete(
        cls,
        *,
        trip_status: TripStatus,
        vehicle: SupportsStatus,
        driver: SupportsStatus,
    ) -> TransitionResult:
        """Dispatched -> Completed. Frees both vehicle and driver."""
        cls._guard(trip_status, TripStatus.COMPLETED)

        vehicle.status = VehicleStatus.AVAILABLE.value
        driver.status = DriverStatus.AVAILABLE.value

        return TransitionResult(
            trip_status=TripStatus.COMPLETED,
            vehicle_status=VehicleStatus.AVAILABLE,
            driver_status=DriverStatus.AVAILABLE,
            notes=["Vehicle -> Available", "Driver -> Available"],
        )

    @classmethod
    def cancel(
        cls,
        *,
        trip_status: TripStatus,
        vehicle: SupportsStatus,
        driver: SupportsStatus,
    ) -> TransitionResult:
        """Draft -> Cancelled, or Dispatched -> Cancelled.

        Only restores vehicle/driver to Available if they were actually
        put On Trip (i.e. the trip had been dispatched). Cancelling a trip
        that was still in Draft never touched their status, so leave it be.
        """
        current = _coerce_trip_status(trip_status)
        cls._guard(current, TripStatus.CANCELLED)

        notes = []
        if current == TripStatus.DISPATCHED:
            vehicle.status = VehicleStatus.AVAILABLE.value
            driver.status = DriverStatus.AVAILABLE.value
            notes = ["Vehicle -> Available", "Driver -> Available"]

        return TransitionResult(
            trip_status=TripStatus.CANCELLED,
            vehicle_status=VehicleStatus(vehicle.status),
            driver_status=DriverStatus(driver.status),
            notes=notes,
        )


class MaintenanceStateMachine:
    """Rule 9: maintenance record open/close drives vehicle status."""

    @staticmethod
    def open(vehicle: SupportsStatus) -> VehicleStatus:
        """Creating an active maintenance record forces vehicle -> In Shop.

        Applies even mid-trip-planning: an In Shop vehicle is immediately
        excluded from the dispatch pool by VehicleOperableRule.
        """
        vehicle.status = VehicleStatus.IN_SHOP.value
        return VehicleStatus.IN_SHOP

    @staticmethod
    def close(vehicle: SupportsStatus) -> VehicleStatus:
        """Closing maintenance restores Available, unless the vehicle was
        separately marked Retired (Retired must never silently come back
        into rotation just because a work order closed)."""
        if VehicleStatus(vehicle.status) == VehicleStatus.RETIRED:
            return VehicleStatus.RETIRED
        vehicle.status = VehicleStatus.AVAILABLE.value
        return VehicleStatus.AVAILABLE