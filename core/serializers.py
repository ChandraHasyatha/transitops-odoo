from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Vehicle, Driver, MaintenanceLog, FuelLog, Expense, Trip

User = get_user_model()


class RoleTokenSerializer(TokenObtainPairSerializer):
    """
    Logs a user in with EMAIL + PASSWORD instead of username + password.
    We fully replace the parent's validate() rather than trying to bend
    SimpleJWT's username_field mechanics, since USERNAME_FIELD on the User
    model is still 'username' internally (username = email, set at
    registration time — see RegisterSerializer below).
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Drop the default 'username' input field, replace with 'email'.
        self.fields.pop(self.username_field, None)
        self.fields['email'] = serializers.EmailField()

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password')

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {'detail': 'No account found with this email.'}
            )

        if not user.check_password(password):
            raise serializers.ValidationError(
                {'detail': 'Incorrect email or password.'}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {'detail': 'This account has been deactivated.'}
            )

        refresh = self.get_token(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        token['email'] = user.email
        token['full_name'] = user.get_full_name() or user.username
        return token


class RegisterSerializer(serializers.ModelSerializer):
    """
    Handles new user self-registration:
    Full Name, Email, Password, Confirm Password, Role.
    `username` is auto-set to the email, so the caller never provides one.
    """
    full_name = serializers.CharField(write_only=True, max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['full_name', 'email', 'password', 'confirm_password', 'role']

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_role(self, value):
        valid_roles = dict(User.ROLE_CHOICES).keys()
        if value not in valid_roles:
            raise serializers.ValidationError('Please select a valid role.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError(
                {'confirm_password': 'Passwords do not match.'}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        full_name = validated_data.pop('full_name').strip()
        first_name, _, last_name = full_name.partition(' ')
        email = validated_data['email']

        user = User(
            username=email,  # email doubles as the internal username
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=validated_data['role'],
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'

    def validate_registration_number(self, value):
        return value.strip().upper()


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = '__all__'


class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = '__all__'
        read_only_fields = ('status', 'created_at')


class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLog
        fields = '__all__'
        read_only_fields = ['closed_at']


class FuelLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelLog
        fields = '__all__'


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'


class UpdateUsernameSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, min_length=3)

    def validate_username(self, value):
        if get_user_model().objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value.strip()
