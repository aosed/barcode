from django.shortcuts import render
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import QRCode
from .serializers import (
    QRCodeSerializer, 
    QRCodeCreateSerializer, 
    QRCodeVerifySerializer,
    QRCodeStatsSerializer
)


def index(request):
    """الصفحة الرئيسية"""
    return render(request, 'index.html')


class QRCodeViewSet(viewsets.ModelViewSet):
    """ViewSet لإدارة رموز QR"""
    
    queryset = QRCode.objects.all()
    serializer_class = QRCodeSerializer
    
    def get_serializer_class(self):
        """اختيار Serializer المناسب حسب العملية"""
        if self.action == 'create':
            return QRCodeCreateSerializer
        return QRCodeSerializer
    
    def create(self, request, *args, **kwargs):
        """إنشاء رمز QR جديد"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # التحقق من عدم وجود رقم مكرر
        number = serializer.validated_data['number']
        if QRCode.objects.filter(number=number).exists():
            return Response(
                {'error': f'الرقم {number} موجود مسبقاً'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        qr_code = serializer.save()
        response_serializer = QRCodeSerializer(qr_code)
        
        return Response(
            {
                'message': 'تم إنشاء رمز QR بنجاح',
                'qr_code': response_serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['post'])
    def verify(self, request):
        """التحقق من رمز QR"""
        serializer = QRCodeVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        content = serializer.validated_data['content']
        qr_code = QRCode.find_by_content(content)
        
        if qr_code:
            qr_serializer = QRCodeSerializer(qr_code)
            return Response({
                'found': True,
                'message': 'تم العثور على رمز QR',
                'qr_code': qr_serializer.data
            })
        else:
            return Response({
                'found': False,
                'message': 'لم يتم العثور على رمز QR',
                'content': content
            })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """إحصائيات رموز QR"""
        now = timezone.now()
        today = now.date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        stats = {
            'total_qr_codes': QRCode.objects.count(),
            'created_today': QRCode.objects.filter(created_at__date=today).count(),
            'created_this_week': QRCode.objects.filter(created_at__date__gte=week_ago).count(),
            'created_this_month': QRCode.objects.filter(created_at__date__gte=month_ago).count(),
        }
        
        serializer = QRCodeStatsSerializer(stats)
        return Response(serializer.data)
