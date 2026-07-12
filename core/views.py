from django.shortcuts import render
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import RoleTokenSerializer
class RoleTokenView(TokenObtainPairView):
    serializer_class = RoleTokenSerializer
# Create your views here.
