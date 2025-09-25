from django.db import models
from django.utils import timezone
import re


class QRCode(models.Model):
    """نموذج لتخزين رموز QR"""
    
    # الحقول الأساسية
    number = models.CharField(max_length=100, verbose_name="الرقم")
    name = models.CharField(max_length=200, blank=True, null=True, verbose_name="الاسم")
    description = models.TextField(blank=True, null=True, verbose_name="الوصف")
    
    # الحقول التقنية
    raw_content = models.TextField(verbose_name="المحتوى الخام لرمز QR")
    created_at = models.DateTimeField(default=timezone.now, verbose_name="تاريخ الإنشاء")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاريخ التحديث")
    
    class Meta:
        verbose_name = "رمز QR"
        verbose_name_plural = "رموز QR"
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.number} - {self.name or 'بدون اسم'}"
    
    @classmethod
    def extract_number_from_content(cls, content):
        """استخراج الرقم من محتوى رمز QR"""
        if not content:
            return None
            
        # إذا كان المحتوى رقماً فقط
        if content.isdigit():
            return content
            
        # البحث عن أرقام في النص
        numbers = re.findall(r'\d+', content)
        if numbers:
            # إرجاع أطول رقم موجود
            return max(numbers, key=len)
            
        return None
    
    @classmethod
    def find_by_content(cls, content):
        """البحث عن رمز QR بناءً على المحتوى"""
        # البحث المباشر بالمحتوى الخام
        qr_code = cls.objects.filter(raw_content=content).first()
        if qr_code:
            return qr_code
            
        # استخراج الرقم والبحث به
        number = cls.extract_number_from_content(content)
        if number:
            qr_code = cls.objects.filter(number=number).first()
            if qr_code:
                return qr_code
                
        return None
