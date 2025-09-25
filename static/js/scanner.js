// مسح رموز QR باستخدام مكتبة qr-scanner
class QRScanner {
    constructor() {
        this.scanner = null;
        this.isScanning = false;
        this.hasFoundResult = false;
        this.scannerArea = document.getElementById('scannerArea');
        this.startBtn = document.getElementById('startScanBtn');
        this.stopBtn = document.getElementById('stopScanBtn');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkCameraSupport();
    }

    async checkCameraSupport() {
        try {
            // التحقق من دعم المتصفح للكاميرا
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showCameraError('المتصفح لا يدعم الوصول إلى الكاميرا. يرجى استخدام متصفح حديث مثل Chrome أو Firefox.');
                return false;
            }

            // التحقق من وجود كاميرات متاحة
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length === 0) {
                this.showCameraError('لا توجد كاميرا متاحة على هذا الجهاز.');
                return false;
            }

            console.log(`Found ${videoDevices.length} camera(s):`, videoDevices);
            return true;

        } catch (error) {
            console.error('Error checking camera support:', error);
            this.showCameraError('حدث خطأ أثناء التحقق من دعم الكاميرا.');
            return false;
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => {
            this.startScanning();
        });

        this.stopBtn.addEventListener('click', () => {
            this.stopScanning();
        });
    }

    async startScanning() {
        try {
            // التحقق من دعم الكاميرا أولاً
            const cameraSupported = await this.checkCameraSupport();
            if (!cameraSupported) {
                return;
            }

            // طلب إذن الكاميرا صراحة
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                });
                // إيقاف الـ stream مؤقتاً لأن QrScanner سيتولى الأمر
                stream.getTracks().forEach(track => track.stop());
            } catch (permissionError) {
                console.error('Camera permission error:', permissionError);
                this.handleScannerError(permissionError);
                return;
            }

            // إنشاء عنصر الفيديو
            const videoElement = document.createElement('video');
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.setAttribute('playsinline', 'true');

            // تنظيف منطقة المسح
            this.scannerArea.innerHTML = '';
            this.scannerArea.appendChild(videoElement);
            this.scannerArea.classList.add('scanning');

            // إعداد المسح مع خيارات محسنة
            this.scanner = new QrScanner(
                videoElement,
                (result) => this.handleScanResult(result.data),
                {
                    returnDetailedScanResult: true,
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    maxScansPerSecond: 3, // تقليل العدد لتحسين الأداء
                    preferredCamera: 'environment', // الكاميرا الخلفية
                    calculateScanRegion: (video) => {
                        // تحديد منطقة مسح أصغر لتحسين الأداء
                        const smallerDimension = Math.min(video.videoWidth, video.videoHeight);
                        const scanRegionSize = Math.round(0.7 * smallerDimension);
                        const x = Math.round((video.videoWidth - scanRegionSize) / 2);
                        const y = Math.round((video.videoHeight - scanRegionSize) / 2);
                        return {
                            x: x,
                            y: y,
                            width: scanRegionSize,
                            height: scanRegionSize,
                        };
                    }
                }
            );

            // بدء المسح
            await this.scanner.start();
            
            this.isScanning = true;
            this.hasFoundResult = false;
            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'inline-flex';

            console.log('QR Scanner started successfully');

            // إضافة مؤشر بصري للمسح
            this.showScanningIndicator();

        } catch (error) {
            console.error('Error starting QR scanner:', error);
            this.handleScannerError(error);
        }
    }

    showScanningIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'scanning-indicator';
        indicator.innerHTML = `
            <div class="scan-line"></div>
            <div class="scan-corners">
                <div class="corner top-left"></div>
                <div class="corner top-right"></div>
                <div class="corner bottom-left"></div>
                <div class="corner bottom-right"></div>
            </div>
        `;
        this.scannerArea.appendChild(indicator);
    }

    stopScanning() {
        if (this.scanner) {
            this.scanner.stop();
            this.scanner.destroy();
            this.scanner = null;
        }

        this.isScanning = false;
        this.hasFoundResult = false;
        this.scannerArea.classList.remove('scanning');
        this.showScannerPlaceholder();
        
        this.startBtn.style.display = 'inline-flex';
        this.stopBtn.style.display = 'none';

        console.log('QR Scanner stopped');
    }

    handleScanResult(code) {
        console.log('QR Code detected:', code);

        // تجنب معالجة نفس النتيجة عدة مرات
        if (this.hasFoundResult) {
            return;
        }

        this.hasFoundResult = true;

        // إيقاف المسح مؤقتاً لمعالجة النتيجة
        if (this.scanner) {
            this.scanner.stop();
        }

        // إرسال النتيجة إلى المدير الرئيسي
        if (window.qrManager) {
            window.qrManager.handleQRScanResult(code);
        }

        // إعادة تشغيل المسح بعد فترة قصيرة
        setTimeout(() => {
            this.hasFoundResult = false;
            if (this.isScanning && this.scanner) {
                this.scanner.start().catch(error => {
                    console.error('Error restarting scanner:', error);
                });
            }
        }, 2000);
    }

    handleScannerError(error) {
        console.error('Scanner error:', error);
        
        let errorMessage = 'حدث خطأ أثناء تشغيل الكاميرا';
        let suggestions = [];
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'تم رفض الإذن للوصول إلى الكاميرا';
            suggestions = [
                'اضغط على أيقونة الكاميرا في شريط العنوان واختر "السماح"',
                'في Chrome: اذهب إلى الإعدادات > الخصوصية والأمان > إعدادات الموقع > الكاميرا',
                'في Firefox: اضغط على أيقونة القفل بجانب العنوان واختر "السماح بالكاميرا"',
                'أعد تحميل الصفحة بعد تغيير الإعدادات'
            ];
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'لا توجد كاميرا متاحة على هذا الجهاز';
            suggestions = [
                'تأكد من توصيل كاميرا ويب خارجية إذا كنت تستخدم حاسوباً مكتبياً',
                'تحقق من أن الكاميرا تعمل في تطبيقات أخرى',
                'أعد تشغيل المتصفح أو الجهاز'
            ];
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'المتصفح لا يدعم الوصول إلى الكاميرا';
            suggestions = [
                'استخدم متصفحاً حديثاً مثل Chrome أو Firefox أو Edge',
                'تأكد من تحديث المتصفح إلى أحدث إصدار',
                'في بيئة الإنتاج، تأكد من استخدام HTTPS'
            ];
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'الكاميرا مستخدمة من تطبيق آخر';
            suggestions = [
                'أغلق جميع التطبيقات الأخرى التي قد تستخدم الكاميرا',
                'أغلق علامات تبويب المتصفح الأخرى التي تستخدم الكاميرا',
                'أعد تشغيل المتصفح'
            ];
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = 'إعدادات الكاميرا المطلوبة غير متاحة';
            suggestions = [
                'جرب كاميرا أخرى إذا كان لديك أكثر من كاميرا',
                'أعد تشغيل التطبيق'
            ];
        }

        this.showCameraError(errorMessage, suggestions);
        this.stopScanning();
    }

    showScannerPlaceholder() {
        this.scannerArea.innerHTML = `
            <div class="scanner-placeholder">
                <i class="fas fa-qrcode scanner-icon"></i>
                <p>اضغط "بدء المسح" لتشغيل الكاميرا</p>
                <small>تأكد من منح المتصفح الإذن بالوصول إلى الكاميرا</small>
            </div>
        `;
    }

    showCameraError(message, suggestions = []) {
        const suggestionsHtml = suggestions.length > 0 ? `
            <div class="error-suggestions">
                <h4>حلول مقترحة:</h4>
                <ul>
                    ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
            </div>
        ` : `
            <div class="error-suggestions">
                <h4>حلول مقترحة:</h4>
                <ul>
                    <li>تأكد من منح المتصفح الإذن بالوصول إلى الكاميرا</li>
                    <li>تحقق من أن الكاميرا غير مستخدمة من تطبيق آخر</li>
                    <li>جرب إعادة تحميل الصفحة أو إعادة تشغيل المتصفح</li>
                    <li>في بيئة الإنتاج، تأكد من استخدام HTTPS</li>
                </ul>
            </div>
        `;

        this.scannerArea.innerHTML = `
            <div class="scanner-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>مشكلة في الوصول إلى الكاميرا</h3>
                <p class="error-message">${message}</p>
                ${suggestionsHtml}
                <div class="error-actions">
                    <button class="btn btn-secondary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i>
                        إعادة تحميل الصفحة
                    </button>
                    <button class="btn btn-primary" onclick="window.qrScanner.startScanning()">
                        <i class="fas fa-camera"></i>
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        `;
    }
}

// إنشاء مثيل من الماسح عند تحميل الصفحة
let qrScanner;
document.addEventListener('DOMContentLoaded', () => {
    qrScanner = new QRScanner();
    window.qrScanner = qrScanner; // جعله متاحاً عالمياً
});

