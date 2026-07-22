from django.shortcuts import render
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import RoleTokenSerializer,RegisterSerializer,VehicleSerializer,DriverSerializer,MaintenanceLogSerializer, FuelLogSerializer, ExpenseSerializer
from .models import Vehicle, Driver,MaintenanceLog, FuelLog, Expense,Trip
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions, generics, status
from .permissions import IsFleetManager,IsSafetyOfficer,IsFinancialAnalyst
from django.utils import timezone
from rest_framework.views import APIView
from django.db.models import Count

class RoleTokenView(TokenObtainPairView):
    serializer_class = RoleTokenSerializer


class RegisterView(generics.CreateAPIView):
    """
    POST /api/register/  { full_name, email, password, confirm_password, role }
    Open to anyone (AllowAny) — this is how new users get into the database
    without an admin manually creating them in Django Admin.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'message': 'Registration successful. You can now log in.',
                'email': user.email,
                'role': user.role,
            },
            status=status.HTTP_201_CREATED,
        )


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    filterset_fields = ['vehicle_type', 'status', 'region']
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsFleetManager()]
        return [permissions.IsAuthenticated()]

class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    filterset_fields = ['status']
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsSafetyOfficer()]
        return [permissions.IsAuthenticated()]
    

class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'close']:
            return [permissions.IsAuthenticated(), IsFleetManager()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        log = serializer.save()
        # Rule 8: creating active maintenance -> vehicle In Shop
        log.vehicle.status = 'in_shop'
        log.vehicle.save()

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        log = self.get_object()
        log.is_active = False
        log.closed_at = timezone.now()
        log.save()
        # Rule 9: closing restores Available unless retired
        if log.vehicle.status != 'retired':
            log.vehicle.status = 'available'
            log.vehicle.save()
        return Response(MaintenanceLogSerializer(log).data)


class FuelLogViewSet(viewsets.ModelViewSet):
    queryset = FuelLog.objects.all()
    serializer_class = FuelLogSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsFinancialAnalyst()]
        return [permissions.IsAuthenticated()]


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsFinancialAnalyst()]
        return [permissions.IsAuthenticated()]


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        vehicles = Vehicle.objects.all()
        drivers = Driver.objects.all()
        trips = Trip.objects.all()

        # optional filters
        vehicle_type = request.query_params.get('vehicle_type')
        region = request.query_params.get('region')
        status_filter = request.query_params.get('status')

        if vehicle_type:
            vehicles = vehicles.filter(vehicle_type=vehicle_type)
        if region:
            vehicles = vehicles.filter(region=region)
        if status_filter:
            vehicles = vehicles.filter(status=status_filter)

        total_vehicles = vehicles.exclude(status='retired').count()
        active_vehicles = vehicles.filter(status__in=['available', 'on_trip']).count()
        available_vehicles = vehicles.filter(status='available').count()
        in_maintenance = vehicles.filter(status='in_shop').count()
        on_trip_count = vehicles.filter(status='on_trip').count()

        active_trips = trips.filter(status='dispatched').count()
        pending_trips = trips.filter(status='draft').count()
        drivers_on_duty = drivers.filter(status='on_trip').count()

        utilization = 0
        if total_vehicles:
            utilization = round((on_trip_count / total_vehicles) * 100, 1)

        return Response({
            'active_vehicles': active_vehicles,
            'available_vehicles': available_vehicles,
            'vehicles_in_maintenance': in_maintenance,
            'active_trips': active_trips,
            'pending_trips': pending_trips,
            'drivers_on_duty': drivers_on_duty,
            'fleet_utilization_pct': utilization,
        })