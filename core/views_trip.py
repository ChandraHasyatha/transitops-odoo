"""
Wired against the real models A pushed (core/models.py):
    Vehicle: status, max_load_kg
    Driver:  status, license_expiry
    Trip:    status, vehicle (FK), driver (FK), cargo_weight_kg,
             planned_distance_km, final_odometer, fuel_consumed_l, revenue
    MaintenanceLog: vehicle (FK), is_active, cost
    FuelLog: vehicle (FK), liters, cost, date
    Expense: vehicle (FK), amount, date, category

Logic itself is untouched from core/services/ — this file is intentionally
thin: parse request -> call a service -> serialize response.
"""
from datetime import date

from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from core.models import Driver, Expense, FuelLog, MaintenanceLog, Trip, Vehicle
from core.serializers import (
    DriverSerializer,
    TripSerializer,
    VehicleSerializer,
)
from core.services.csv_export import csv_streaming_response
from core.services.enums import VehicleStatus
from core.services.reports import fleet_kpis, vehicle_report
from core.services.rules import TripValidationError
from core.services.state_machine import (
    InvalidTransitionError,
    MaintenanceStateMachine,
    TripStateMachine,
)


class VehicleViewSet(ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    filterset_fields = ["status", "vehicle_type", "region"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("dispatchable") == "true":
            qs = qs.filter(status=VehicleStatus.AVAILABLE.value)
        return qs


class DriverViewSet(ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    filterset_fields = ["status"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("dispatchable") == "true":
            qs = qs.filter(status="available", license_expiry__gte=date.today())
        return qs


class TripViewSet(ModelViewSet):
    queryset = Trip.objects.select_related("vehicle", "driver").all()
    serializer_class = TripSerializer
    filterset_fields = ["status", "vehicle", "driver"]

    @action(detail=True, methods=["post"], url_path="dispatch")
    def dispatch_trip(self, request, pk=None):
        trip = self.get_object()
        try:
            result = TripStateMachine.dispatch(
                trip_status=trip.status,
                vehicle=trip.vehicle,
                driver=trip.driver,
                driver_license_expiry=trip.driver.license_expiry,
                cargo_kg=trip.cargo_weight_kg,
                max_load_kg=trip.vehicle.max_load_kg,
                today=date.today(),
            )
        except TripValidationError as exc:
            return Response(exc.as_dict(), status=http_status.HTTP_400_BAD_REQUEST)
        except InvalidTransitionError as exc:
            return Response({"detail": str(exc)}, status=http_status.HTTP_400_BAD_REQUEST)

        trip.status = result.trip_status.value
        trip.save(update_fields=["status"])
        trip.vehicle.save(update_fields=["status"])
        trip.driver.save(update_fields=["status"])

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
        if "final_odometer" in request.data:
            trip.final_odometer = request.data["final_odometer"]
        if "fuel_consumed_liters" in request.data:
            trip.fuel_consumed_l = request.data["fuel_consumed_liters"]
        trip.save()
        trip.vehicle.save(update_fields=["status"])
        trip.driver.save(update_fields=["status"])

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
        trip.save(update_fields=["status"])
        trip.vehicle.save(update_fields=["status"])
        trip.driver.save(update_fields=["status"])

        return Response(
            {
                "id": trip.id,
                "status": trip.status,
                "vehicle_status": trip.vehicle.status,
                "driver_status": trip.driver.status,
            }
        )


class MaintenanceOpenView(APIView):
    """POST /api/maintenance/  {"vehicle": <id>, "description": "...", "cost": ...}
    Creates an active maintenance record and forces the vehicle to In Shop."""

    def post(self, request):
        vehicle = Vehicle.objects.get(pk=request.data["vehicle"])
        log = MaintenanceLog.objects.create(
            vehicle=vehicle,
            description=request.data.get("description", ""),
            cost=request.data.get("cost", 0),
            is_active=True,
        )
        new_status = MaintenanceStateMachine.open(vehicle)
        vehicle.save(update_fields=["status"])
        return Response(
            {"id": log.id, "vehicle": vehicle.id, "vehicle_status": new_status.value},
            status=http_status.HTTP_201_CREATED,
        )


class MaintenanceCloseView(APIView):
    """POST /api/maintenance/{id}/close/ - restores vehicle unless Retired."""

    def post(self, request, pk):
        from django.utils import timezone

        log = MaintenanceLog.objects.select_related("vehicle").get(pk=pk)
        log.is_active = False
        log.closed_at = timezone.now()
        log.save(update_fields=["is_active", "closed_at"])
        new_status = MaintenanceStateMachine.close(log.vehicle)
        log.vehicle.save(update_fields=["status"])
        return Response({"id": log.id, "vehicle": log.vehicle.id, "vehicle_status": new_status.value})


class VehicleReportView(APIView):
    def get(self, request, pk):
        vehicle = Vehicle.objects.get(pk=pk)
        trips = Trip.objects.filter(vehicle=vehicle, status="completed").values(
            "planned_distance_km"
        )
        fuel_logs = FuelLog.objects.filter(vehicle=vehicle).values("liters", "cost")
        expenses = MaintenanceLog.objects.filter(vehicle=vehicle).values("cost")
        total_revenue = sum(
            t.revenue for t in Trip.objects.filter(vehicle=vehicle, status="completed")
        )

        report = vehicle_report(
            acquisition_cost=vehicle.acquisition_cost,
            trips=trips,
            fuel_logs=fuel_logs,
            expenses=expenses,
            revenue=total_revenue,
            distance_field="planned_distance_km",
            maintenance_cost_field="cost",
        )
        return Response(
            {
                "vehicle_id": vehicle.id,
                "total_distance_km": report.total_distance_km,
                "total_fuel_liters": report.total_fuel_liters,
                "fuel_efficiency_km_per_l": report.fuel_efficiency_km_per_l,
                "total_fuel_cost": report.total_fuel_cost,
                "total_maintenance_cost": report.total_maintenance_cost,
                "operational_cost_total": report.operational_cost_total,
                "revenue": report.revenue,
                "roi": report.roi,
            }
        )


class DashboardKPIView(APIView):
    def get(self, request):
        total_vehicles = Vehicle.objects.count()
        kpis = fleet_kpis(
            total_vehicles=total_vehicles,
            available_vehicles=Vehicle.objects.filter(status="available").count(),
            on_trip_vehicles=Vehicle.objects.filter(status="on_trip").count(),
            in_shop_vehicles=Vehicle.objects.filter(status="in_shop").count(),
            dispatched_trips=Trip.objects.filter(status="dispatched").count(),
            draft_trips=Trip.objects.filter(status="draft").count(),
            drivers_on_trip=Driver.objects.filter(status="on_trip").count(),
        )
        return Response(kpis.__dict__)


class ExportCSVView(APIView):
    """GET /api/reports/export/?type=trips|fuel_logs|expenses|vehicles"""

    EXPORTS = {
        "trips": (Trip, ["id", "source", "destination", "status", "cargo_weight_kg",
                          "planned_distance_km", "revenue", "created_at"]),
        "fuel_logs": (FuelLog, ["id", "vehicle_id", "liters", "cost", "date"]),
        "expenses": (Expense, ["id", "vehicle_id", "category", "amount", "date"]),
        "vehicles": (Vehicle, ["id", "registration_number", "model_name", "status",
                                "max_load_kg", "odometer", "acquisition_cost"]),
    }

    def get(self, request):
        export_type = request.query_params.get("type", "trips")
        if export_type not in self.EXPORTS:
            return Response({"detail": f"Unknown export type '{export_type}'."}, status=400)
        model, fields = self.EXPORTS[export_type]
        rows = model.objects.all().values(*fields)
        return csv_streaming_response(fields, rows, filename=f"{export_type}.csv")