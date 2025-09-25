// ميزات PWA - Service Worker والتثبيت
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.setupInstallPrompt();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/static/sw.js');
                console.log('Service Worker registered successfully:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    setupInstallPrompt() {
        const installBtn = document.getElementById('installBtn');
        
        // إخفاء زر التثبيت افتراضياً
        installBtn.style.display = 'none';

        // الاستماع لحدث beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            // منع إظهار النافذة التلقائية
            e.preventDefault();
            
            // حفظ الحدث للاستخدام لاحقاً
            this.deferredPrompt = e;
            
            // إظهار زر التثبيت
            installBtn.style.display = 'inline-flex';
        });

        // معالج النقر على زر التثبيت
        installBtn.addEventListener('click', async () => {
            if (!this.deferredPrompt) {
                return;
            }

            // إظهار نافذة التثبيت
            this.deferredPrompt.prompt();

            // انتظار اختيار المستخدم
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                qrManager.showToast('تم تثبيت التطبيق بنجاح', 'success');
            } else {
                console.log('User dismissed the install prompt');
            }

            // إعادة تعيين المتغير
            this.deferredPrompt = null;
            installBtn.style.display = 'none';
        });

        // إخفاء زر التثبيت إذا كان التطبيق مثبتاً بالفعل
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            installBtn.style.display = 'none';
            qrManager.showToast('تم تثبيت التطبيق بنجاح', 'success');
        });
    }
}

// تشغيل PWA Manager عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new PWAManager();
});

