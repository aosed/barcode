// نظام إدارة رموز QR - الملف الرئيسي
class QRManager {
    constructor() {
        this.apiBase = '/api/qrcodes/';
        this.currentTab = 'add';
        this.qrCodes = [];
        this.lastScannedCode = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadQRCodes();
        this.showTab('add');
    }

    setupEventListeners() {
        // التبويبات
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.closest('.tab-btn').dataset.tab;
                this.showTab(tab);
            });
        });

        // نموذج إضافة رمز QR
        document.getElementById('addQRForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addQRCode();
        });

        // نموذج التحقق اليدوي
        document.getElementById('manualVerifyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.verifyQRCode();
        });

        // أزرار الرأس
        document.getElementById('statsBtn').addEventListener('click', () => {
            this.showStats();
        });

        document.getElementById('refreshListBtn').addEventListener('click', () => {
            this.loadQRCodes();
        });

        // إغلاق النافذة المنبثقة عند النقر خارجها
        document.getElementById('statsModal').addEventListener('click', (e) => {
            if (e.target.id === 'statsModal') {
                this.closeModal();
            }
        });
    }

    showTab(tabName) {
        // إخفاء جميع التبويبات
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // إظهار التبويب المحدد
        document.getElementById(tabName + 'Tab').classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        this.currentTab = tabName;

        // تحميل البيانات حسب التبويب
        if (tabName === 'list') {
            this.loadQRCodes();
        }
    }

    async addQRCode() {
        const form = document.getElementById('addQRForm');
        const formData = new FormData(form);
        
        const data = {
            number: formData.get('number').trim(),
            name: formData.get('name').trim(),
            description: formData.get('description').trim()
        };

        if (!data.number) {
            this.showToast('يرجى إدخال الرقم', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(this.apiBase, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast(result.message || 'تم إنشاء رمز QR بنجاح', 'success');
                form.reset();
                this.loadQRCodes();
            } else {
                this.showToast(result.error || 'حدث خطأ أثناء إنشاء رمز QR', 'error');
            }
        } catch (error) {
            console.error('Error adding QR code:', error);
            this.showToast('حدث خطأ في الاتصال', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async verifyQRCode() {
        const input = document.getElementById('manualQRInput');
        const content = input.value.trim();

        if (!content) {
            this.showToast('يرجى إدخال محتوى رمز QR', 'error');
            return;
        }

        await this.processQRContent(content);
        input.value = '';
    }

    async processQRContent(content) {
        // تجنب معالجة نفس الرمز مرتين متتاليتين
        if (this.lastScannedCode === content) {
            return;
        }
        this.lastScannedCode = content;

        this.showLoading(true);

        try {
            const response = await fetch(this.apiBase + 'verify/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content })
            });

            const result = await response.json();
            this.displayScanResult(result);

        } catch (error) {
            console.error('Error verifying QR code:', error);
            this.showToast('حدث خطأ في الاتصال', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayScanResult(result) {
        const resultDiv = document.getElementById('scanResult');
        
        if (result.found) {
            const qr = result.qr_code;
            resultDiv.innerHTML = `
                <div class="scan-result success">
                    <h4><i class="fas fa-check-circle"></i> تم العثور على رمز QR</h4>
                    <div class="qr-details">
                        <p><strong>الرقم:</strong> ${qr.number}</p>
                        ${qr.name ? `<p><strong>الاسم:</strong> ${qr.name}</p>` : ''}
                        ${qr.description ? `<p><strong>الوصف:</strong> ${qr.description}</p>` : ''}
                        <p><strong>تاريخ الإنشاء:</strong> ${this.formatDate(qr.created_at)}</p>
                    </div>
                </div>
            `;
            this.showToast('تم العثور على رمز QR', 'success');
        } else {
            resultDiv.innerHTML = `
                <div class="scan-result error">
                    <h4><i class="fas fa-times-circle"></i> لم يتم العثور على رمز QR</h4>
                    <p>المحتوى المسح: <code>${result.content}</code></p>
                    <p>هذا الرمز غير مسجل في النظام</p>
                </div>
            `;
            this.showToast('لم يتم العثور على رمز QR', 'error');
        }
        
        resultDiv.style.display = 'block';
    }

    async loadQRCodes() {
        const listDiv = document.getElementById('qrList');
        listDiv.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';

        try {
            const response = await fetch(this.apiBase);
            const data = await response.json();
            
            this.qrCodes = data.results || data;
            this.displayQRCodes();
        } catch (error) {
            console.error('Error loading QR codes:', error);
            listDiv.innerHTML = '<div class="error">حدث خطأ أثناء تحميل البيانات</div>';
        }
    }

    displayQRCodes() {
        const listDiv = document.getElementById('qrList');
        
        if (this.qrCodes.length === 0) {
            listDiv.innerHTML = '<div class="empty">لا توجد رموز QR مسجلة</div>';
            return;
        }

        const html = this.qrCodes.map(qr => `
            <div class="qr-item">
                <div class="qr-item-header">
                    <div class="qr-item-number">${qr.number}</div>
                    <div class="qr-item-actions">
                        <button class="btn btn-small btn-secondary" onclick="qrManager.deleteQRCode(${qr.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${qr.name ? `<div class="qr-item-name">${qr.name}</div>` : ''}
                ${qr.description ? `<div class="qr-item-description">${qr.description}</div>` : ''}
                <div class="qr-item-date">تم الإنشاء: ${this.formatDate(qr.created_at)}</div>
            </div>
        `).join('');

        listDiv.innerHTML = html;
    }

    async deleteQRCode(id) {
        if (!confirm('هل أنت متأكد من حذف هذا الرمز؟')) {
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(this.apiBase + id + '/', {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showToast('تم حذف رمز QR بنجاح', 'success');
                this.loadQRCodes();
            } else {
                this.showToast('حدث خطأ أثناء الحذف', 'error');
            }
        } catch (error) {
            console.error('Error deleting QR code:', error);
            this.showToast('حدث خطأ في الاتصال', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async showStats() {
        const modal = document.getElementById('statsModal');
        const content = document.getElementById('statsContent');
        
        content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';
        modal.style.display = 'block';

        try {
            const response = await fetch(this.apiBase + 'stats/');
            const stats = await response.json();

            content.innerHTML = `
                <div class="stat-item">
                    <span class="stat-value">${stats.total_qr_codes}</span>
                    <span class="stat-label">إجمالي رموز QR</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.created_today}</span>
                    <span class="stat-label">اليوم</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.created_this_week}</span>
                    <span class="stat-label">هذا الأسبوع</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.created_this_month}</span>
                    <span class="stat-label">هذا الشهر</span>
                </div>
            `;
        } catch (error) {
            console.error('Error loading stats:', error);
            content.innerHTML = '<div class="error">حدث خطأ أثناء تحميل الإحصائيات</div>';
        }
    }

    closeModal() {
        document.getElementById('statsModal').style.display = 'none';
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'block' : 'none';
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 'info-circle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // إظهار الإشعار
        setTimeout(() => toast.classList.add('show'), 100);
        
        // إخفاء الإشعار
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 3000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // معالج نتائج المسح من scanner.js
    handleQRScanResult(content) {
        this.processQRContent(content);
    }
}

// إنشاء مثيل من المدير عند تحميل الصفحة
let qrManager;
document.addEventListener('DOMContentLoaded', () => {
    qrManager = new QRManager();
});

// دالة إغلاق النافذة المنبثقة (للاستخدام في HTML)
function closeModal() {
    qrManager.closeModal();
}

