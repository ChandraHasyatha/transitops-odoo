from rest_framework.permissions import BasePermission

class IsRole(BasePermission):
    allowed_roles = []
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in self.allowed_roles

class IsFleetManager(IsRole):
    allowed_roles = ['fleet_manager']

class IsDispatcher(IsRole):
    allowed_roles = ['dispatcher']

class IsSafetyOfficer(IsRole):
    allowed_roles = ['safety_officer']

class IsFinancialAnalyst(IsRole):
    allowed_roles = ['financial_analyst']