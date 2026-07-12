"""
Dispatch validation engine.

Why not one big `if/elif` function?
------------------------------------
The spec has 9 mandatory business rules and a hackathon judge will poke at
each one individually ("what happens if I try to dispatch a suspended
driver with a valid vehicle?"). A single tangled function makes that hard to
test and easy to regress when someone tweaks a condition at hour 7.

Instead each rule is its own object with one job. `DispatchRuleEngine` runs
them all and returns *every* violation at once (better UX than "fix one
error, resubmit, hit the next error"), while `assert_valid()` gives views a
fail-fast call that raises with all messages joined.

This is deliberately decoupled from Django: `DispatchContext` is a plain
dataclass built from plain values (strings/numbers/date), so this module has
zero dependency on models existing yet. Once A pushes `Vehicle`/`Driver`,
wiring looks like:

    ctx = DispatchContext(
        vehicle_status=vehicle.status,
        driver_status=driver.status,
        driver_license_expiry=driver.license_expiry_date,
        cargo_kg=trip.cargo_weight,
        max_load_kg=vehicle.max_load_capacity,
        today=date.today(),
    )
    DispatchRuleEngine.assert_valid(ctx)
"""
from __future__ import annotations

import abc
from dataclasses import dataclass
from datetime import date
from typing import Optional

from core.services.enums import DriverStatus, VehicleStatus


class TripValidationError(Exception):
    """Raised when one or more dispatch rules fail.

    Carries structured `errors` (list of {code, message}) so a DRF view can
    return a 400 with per-field detail instead of one flat string, e.g.:

        {
          "detail": "Cargo exceeds vehicle capacity; Driver license expired",
          "errors": [
            {"code": "CARGO_OVER_CAPACITY", "message": "..."},
            {"code": "DRIVER_LICENSE_EXPIRED", "message": "..."}
          ]
        }
    """

    def __init__(self, violations: list["RuleViolation"]):
        self.violations = violations
        super().__init__("; ".join(v.message for v in violations))

    def as_dict(self) -> dict:
        return {
            "detail": str(self),
            "errors": [{"code": v.code, "message": v.message} for v in self.violations],
        }


@dataclass(frozen=True)
class RuleViolation:
    code: str
    message: str


@dataclass(frozen=True)
class DispatchContext:
    """Everything a dispatch rule needs to know, and nothing it doesn't."""

    vehicle_status: VehicleStatus
    driver_status: DriverStatus
    driver_license_expiry: date
    cargo_kg: float
    max_load_kg: float
    today: date = None  # defaulted in __post_init__

    def __post_init__(self):
        if self.today is None:
            object.__setattr__(self, "today", date.today())
        # Accept raw strings too (e.g. values pulled straight off a model
        # field before the enum coercion) so callers don't have to remember
        # to wrap everything themselves.
        if not isinstance(self.vehicle_status, VehicleStatus):
            object.__setattr__(self, "vehicle_status", VehicleStatus(self.vehicle_status))
        if not isinstance(self.driver_status, DriverStatus):
            object.__setattr__(self, "driver_status", DriverStatus(self.driver_status))


class BaseRule(abc.ABC):
    code: str = "RULE_VIOLATION"

    @abc.abstractmethod
    def check(self, ctx: DispatchContext) -> Optional[str]:
        """Return an error message if the rule is violated, else None."""
        raise NotImplementedError


class VehicleOperableRule(BaseRule):
    """Rule: Retired or In Shop vehicles must never appear in dispatch."""

    code = "VEHICLE_NOT_OPERABLE"

    def check(self, ctx: DispatchContext) -> Optional[str]:
        if ctx.vehicle_status in (VehicleStatus.RETIRED, VehicleStatus.IN_SHOP):
            return f"Vehicle is {ctx.vehicle_status.label} and cannot be dispatched."
        return None


class VehicleFreeRule(BaseRule):
    """Rule: A vehicle already On Trip cannot be assigned to another trip."""

    code = "VEHICLE_ALREADY_ON_TRIP"

    def check(self, ctx: DispatchContext) -> Optional[str]:
        if ctx.vehicle_status == VehicleStatus.ON_TRIP:
            return "Vehicle is already on an active trip."
        return None


class DriverSuspendedRule(BaseRule):
    """Rule: Drivers with Suspended status cannot be assigned to trips."""

    code = "DRIVER_SUSPENDED"

    def check(self, ctx: DispatchContext) -> Optional[str]:
        if ctx.driver_status == DriverStatus.SUSPENDED:
            return "Driver is suspended and cannot be assigned."
        return None


class DriverLicenseValidRule(BaseRule):
    """Rule: Drivers with expired licenses cannot be assigned to trips."""

    code = "DRIVER_LICENSE_EXPIRED"

    def check(self, ctx: DispatchContext) -> Optional[str]:
        if ctx.driver_license_expiry < ctx.today:
            return f"Driver's license expired on {ctx.driver_license_expiry.isoformat()}."
        return None


class DriverFreeRule(BaseRule):
    """Rule: A driver already On Trip cannot be assigned to another trip."""

    code = "DRIVER_ALREADY_ON_TRIP"

    def check(self, ctx: DispatchContext) -> Optional[str]:
        if ctx.driver_status == DriverStatus.ON_TRIP:
            return "Driver is already on an active trip."
        return None


class CargoCapacityRule(BaseRule):
    """Rule: Cargo weight must not exceed the vehicle's max load capacity."""

    code = "CARGO_OVER_CAPACITY"

    def check(self, ctx: DispatchContext) -> Optional[str]:
        if ctx.cargo_kg > ctx.max_load_kg:
            return (
                f"Cargo weight {ctx.cargo_kg}kg exceeds vehicle's max load "
                f"capacity of {ctx.max_load_kg}kg."
            )
        return None


class DispatchRuleEngine:
    """Runs the full rule chain and collects every violation."""

    RULES: tuple[BaseRule, ...] = (
        VehicleOperableRule(),
        VehicleFreeRule(),
        DriverSuspendedRule(),
        DriverLicenseValidRule(),
        DriverFreeRule(),
        CargoCapacityRule(),
    )

    @classmethod
    def validate(cls, ctx: DispatchContext) -> list[RuleViolation]:
        violations = []
        for rule in cls.RULES:
            message = rule.check(ctx)
            if message:
                violations.append(RuleViolation(code=rule.code, message=message))
        return violations

    @classmethod
    def assert_valid(cls, ctx: DispatchContext) -> None:
        violations = cls.validate(ctx)
        if violations:
            raise TripValidationError(violations)

    @classmethod
    def is_valid(cls, ctx: DispatchContext) -> bool:
        return not cls.validate(ctx)