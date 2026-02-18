// خدمة رفع الصور محلياً - تخزين في public folder
// الصور هتتحفظ في المشروع نفسه!

import imageCompression from 'browser-image-compression';

export interface ImageUploadResult {
  url: string;
  success: boolean;
  error?: string;
}

class LocalStorageImageService {
  /**
   * ضغط الصورة
   */
  async compressImage(file: File, maxSizeMB: number = 0.05, quality: number = 0.6): Promise<File> {
    try {
      const fileSizeMB = file.size / (1024 * 1024);
      
      if (fileSizeMB <= maxSizeMB) {
        console.log(`✓ الصورة صغيرة (${fileSizeMB.toFixed(2)}MB)`);
        return file;
      }

      console.log(`⚙️ جاري ضغط الصورة من ${fileSizeMB.toFixed(2)}MB...`);

      const options = {
        maxSizeMB,
        maxWidthOrHeight: 800, // دقة أقل
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: quality,
      };

      const compressed = await imageCompression(file, options);
      console.log(`✓ تم الضغط! الحجم: ${(compressed.size / (1024 * 1024)).toFixed(2)}MB`);
      
      return compressed;
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    }
  }

  /**
   * تحويل الصورة لـ Data URL (محلي في المتصفح)
   */
  async convertToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * حفظ الصورة محلياً وإرجاع رابط
   * ملحوظة: الصور هتتخزن في localStorage (حد أقصى ~5-10MB لكل المشروع)
   */
  async uploadImage(
    file: File,
    maxSizeMB: number = 0.05 // ضغط قوي جداً - 50KB فقط!
  ): Promise<ImageUploadResult> {
    try {
      const originalSizeMB = file.size / (1024 * 1024);
      console.log(`📤 بدء معالجة الصورة: ${file.name} (${originalSizeMB.toFixed(2)}MB)`);

      // ضغط الصورة بشكل قوي جداً
      const compressedFile = await this.compressImage(file, maxSizeMB, 0.6);
      
      // تحويل لـ Data URL
      const dataURL = await this.convertToDataURL(compressedFile);
      
      // حساب الحجم
      const sizeKB = (dataURL.length * 3) / 4 / 1024;
      console.log(`✅ حجم الصورة النهائي: ${sizeKB.toFixed(2)}KB`);
      
      // تحذير إذا كانت كبيرة
      if (sizeKB > 100) {
        console.warn(`⚠️ الصورة كبيرة: ${sizeKB.toFixed(2)}KB - قد تسبب مشاكل`);
      }
      
      return {
        url: dataURL,
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
  async uploadMultipleImages(files: File[]): Promise<ImageUploadResult[]> {
    const uploadPromises = files.map(file => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }

  /**
   * حساب الحجم الإجمالي للمنتج
   */
  calculateProductSize(productData: any): number {
    const jsonStr = JSON.stringify(productData);
    return jsonStr.length;
  }

  /**
   * التحقق من أن المنتج لن يتجاوز حد Firestore
   */
  isProductSizeValid(productData: any): { valid: boolean; sizeKB: number } {
    const size = this.calculateProductSize(productData);
    const sizeKB = size / 1024;
    const maxSizeKB = 1000; // 1MB حد Firestore
    
    return {
      valid: sizeKB < maxSizeKB,
      sizeKB: Math.round(sizeKB)
    };
  }
}

export const localStorageImageService = new LocalStorageImageService();
