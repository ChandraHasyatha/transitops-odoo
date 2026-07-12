from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from core.models import Driver, Expense, FuelLog, MaintenanceLog, Trip, Vehicle


class RoleTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        return token


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = "__all__"


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = "__all__"


class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = "__all__"
        read_only_fields = ("status", "created_at")


class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLog
        fields = "__all__"


class FuelLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelLog
        fields = "__all__"


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = "__all__"