from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from core.views import RoleTokenView, RegisterView, VehicleViewSet, DriverViewSet, MaintenanceLogViewSet, FuelLogViewSet, ExpenseViewSet, DashboardView
from core.views_trip import TripViewSet, VehicleReportView, ExportCSVView

router = DefaultRouter()
router.register('vehicles', VehicleViewSet)
router.register('drivers', DriverViewSet)
router.register('maintenance', MaintenanceLogViewSet)
router.register('fuel-logs', FuelLogViewSet)
router.register('expenses', ExpenseViewSet)
router.register('trips', TripViewSet, basename='trip')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', RoleTokenView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
    path('api/register/', RegisterView.as_view()),
    path('api/dashboard/', DashboardView.as_view()),
    path('api/reports/vehicles/<int:pk>/', VehicleReportView.as_view()),
    path('api/reports/export/', ExportCSVView.as_view()),
    path('api/', include(router.urls)),
]
