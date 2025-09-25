from rest_framework import serializers
from .models import QRCode


class QRCodeSerializer(serializers.ModelSerializer):
    """Serializer لنموذج QRCode"""
    
    class Meta:
        model = QRCode
        fields = ['id', 'number', 'name', 'description', 'raw_content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """إنشاء رمز QR جديد"""
        # إذا لم يتم تمرير raw_content، استخدم number
        if 'raw_content' not in validated_data:
            validated_data['raw_content'] = validated_data['number']
        
        return super().create(validated_data)


class QRCodeCreateSerializer(serializers.Serializer):
    """Serializer لإنشاء رمز QR جديد"""
    
    number = serializers.CharField(max_length=100)
    name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    
    def create(self, validated_data):
        """إنشاء رمز QR جديد"""
        # استخدام number كـ raw_content افتراضياً
        validated_data['raw_content'] = validated_data['number']
        return QRCode.objects.create(**validated_data)


class QRCodeVerifySerializer(serializers.Serializer):
    """Serializer للتحقق من رمز QR"""
    
    content = serializers.CharField()
    
    def validate_content(self, value):
        """التحقق من صحة المحتوى"""
        if not value or not value.strip():
            raise serializers.ValidationError("محتوى رمز QR مطلوب")
        return value.strip()


class QRCodeStatsSerializer(serializers.Serializer):
    """Serializer لإحصائيات رموز QR"""
    
    total_qr_codes = serializers.IntegerField()
    created_today = serializers.IntegerField()
    created_this_week = serializers.IntegerField()
    created_this_month = serializers.IntegerField()

