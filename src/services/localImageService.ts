// خدمة رفع الصور - تخزين محلي في Firestore كـ Base64
// بدون أي خدمات خارجية أو مشاكل CORS!

import imageCompression from 'browser-image-compression';

export interface ImageUploadResult {
  url: string;
  success: boolean;
  error?: string;
}

// تخزين الصور كـ Base64 - بدون خدمات خارجية!

class LocalImageService {
  /**
   * ضغط الصورة بذكاء - يدعم صور كبيرة جداً
   */
  async compressImage(file: File, maxSizeMB: number = 1, quality: number = 0.85): Promise<File> {
    try {
      const fileSizeMB = file.size / (1024 * 1024);
      
      // إذا كانت الصورة صغيرة، لا داعي للضغط
      if (fileSizeMB <= maxSizeMB) {
        console.log(`✓ الصورة صغيرة (${fileSizeMB.toFixed(2)}MB) - لا حاجة للضغط`);
        return file;
      }

      console.log(`⚙️ جاري ضغط الصورة من ${fileSizeMB.toFixed(2)}MB إلى ${maxSizeMB}MB...`);

      const options = {
        maxSizeMB,
        maxWidthOrHeight: 2048, // جودة عالية
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: quality,
      };

      const compressed = await imageCompression(file, options);
      const compressedSizeMB = compressed.size / (1024 * 1024);
      console.log(`✓ تم الضغط بنجاح! الحجم الجديد: ${compressedSizeMB.toFixed(2)}MB`);
      
      return compressed;
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    }
  }

  /**
   * تحويل الصورة إلى Base64
   */
  async convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * رفع صورة واحدة - تخزين كـ Base64
   */
  async uploadImage(
    file: File,
    maxSizeMB: number = 1,
    quality: number = 0.85
  ): Promise<ImageUploadResult> {
    try {
      const originalSizeMB = file.size / (1024 * 1024);
      console.log(`📤 بدء معالجة الصورة: ${file.name} (${originalSizeMB.toFixed(2)}MB)`);

      // ضغط الصورة
      const compressedFile = await this.compressImage(file, maxSizeMB, quality);
      
      // تحويل إلى Base64
      console.log('🚀 جاري تحويل الصورة...');
      const base64 = await this.convertToBase64(compressedFile);
      console.log('✅ تم تحويل الصورة بنجاح!');
      
      return {
        url: base64,
        success: true,
      };
    } catch (error: any) {
      console.error('❌ Error processing image:', error);
      return {
        url: '',
        success: false,
        error: error.message || 'فشل معالجة الصورة',
      };
    }
  }

  /**
   * رفع عدة صور
   */
  async uploadMultipleImages(
    files: File[],
    maxSizeMB: number = 1
  ): Promise<ImageUploadResult[]> {
    const uploadPromises = files.map(file => this.uploadImage(file, maxSizeMB));
    return Promise.all(uploadPromises);
  }

  /**
   * التحقق من صحة رابط الصورة
   */
  isValidImageUrl(url: string): boolean {
    if (!url) return false;
    
    // Base64 image
    if (url.startsWith('data:image/')) return true;
    
    // HTTP/HTTPS URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }
    
    return false;
  }
}

export const localImageService = new LocalImageService();
