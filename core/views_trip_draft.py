"""
DRAFT — not wired into urls.py yet, and imports `core.models.Vehicle/Driver/
Trip/MaintenanceLog` that don't exist until A pushes them.

This file exists so the moment those models land, hooking up the dispatch
endpoint is a 5-minute find-and-replace of field names, not a rewrite. All
the actual logic (validation, state transitions, math) already lives in
`core/services/` and is already unit-tested — these views are intentionally
thin: parse request -> call a service -> serialize response.

Expected model field names assumed here (confirm with A, adjust if the
pushed models differ):
    Vehicle: status, max_load_capacity
    Driver:  status, license_expiry_date
    Trip:    status, vehicle (FK), driver (FK), cargo_weight
"""
from datetime import date

from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.services.enums import TripStatus
from core.services.rules import TripValidationError
from core.services.state_machine import InvalidTransitionError, TripStateMachine

# from core.models import Trip
# from core.serializers import TripSerializer


class TripViewSet(ModelViewSet):
    # queryset = Trip.objects.all()
    # serializer_class = TripSerializer

    @action(detail=True, methods=["post"])
    def dispatch(self, request, pk=None):
        trip = self.get_object()

        try:
            result = TripStateMachine.dispatch(
                trip_status=trip.status,
                vehicle=trip.vehicle,
                driver=trip.driver,
                driver_license_expiry=trip.driver.license_expiry_date,
                cargo_kg=trip.cargo_weight,
                max_load_kg=trip.vehicle.max_load_capacity,
                today=date.today(),
            )
        except TripValidationError as exc:
            return Response(exc.as_dict(), status=http_status.HTTP_400_BAD_REQUEST)
        except InvalidTransitionError as exc:
            return Response({"detail": str(exc)}, status=http_status.HTTP_400_BAD_REQUEST)

        trip.status = result.trip_status.value
        trip.save()
        trip.vehicle.save()
        trip.driver.save()

        return Response(
            {
                "id": trip.id,
                "status": trip.status,
                "vehicle_status": result.vehicle_status.value,
                "driver_status": result.driver_status.value,
            }
        )

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        trip = self.get_object()
        try:
            result = TripStateMachine.complete(
                trip_status=trip.status, vehicle=trip.vehicle, driver=trip.driver
            )
        except InvalidTransitionError as exc:
            return Response({"detail": str(exc)}, status=http_status.HTTP_400_BAD_REQUEST)

        trip.status = result.trip_status.value
        # trip.final_odometer = request.data.get("final_odometer")
        # trip.fuel_consumed_liters = request.data.get("fuel_consumed_liters")
        trip.save()
        trip.vehicle.save()
        trip.driver.save()

        return Response(
            {
                "id": trip.id,
                "status": trip.status,
                "vehicle_status": result.vehicle_status.value,
                "driver_status": result.driver_status.value,
            }
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        trip = self.get_object()
        try:
            result = TripStateMachine.cancel(
                trip_status=trip.status, vehicle=trip.vehicle, driver=trip.driver
            )
        except InvalidTransitionError as exc:
            return Response({"detail": str(exc)}, status=http_status.HTTP_400_BAD_REQUEST)

        trip.status = result.trip_status.value
        trip.save()
        trip.vehicle.save()
        trip.driver.save()

        return Response(
            {
                "id": trip.id,
                "status": trip.status,
                "vehicle_status": trip.vehicle.status,
                "driver_status": trip.driver.status,
            }
        )