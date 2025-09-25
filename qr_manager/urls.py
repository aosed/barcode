from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# إنشاء router لـ API
router = DefaultRouter()
router.register(r'qrcodes', views.QRCodeViewSet)

urlpatterns = [
    # الصفحة الرئيسية
    path('', views.index, name='index'),
    
    # API endpoints
    path('api/', include(router.urls)),
]

