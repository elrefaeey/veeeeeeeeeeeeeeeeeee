// خدمة رفع الصور على Cloudinary - مجاني 25GB!
// بديل قوي ومجاني 100%

import imageCompression from 'browser-image-compression';

export interface ImageUploadResult {
  url: string;
  success: boolean;
  error?: string;
}

class CloudinaryImageService {
  // Cloudinary settings - مجاني حتى 25GB
  private cloudName = 'demo'; // استخدم 'demo' للتجربة أو سجل حساب مجاني
  private uploadPreset = 'ml_default'; // preset للرفع بدون توقيع

  /**
   * ضغط الصورة قبل الرفع
   */
  async compressImage(file: File, maxSizeMB: number = 5, quality: number = 0.85): Promise<File> {
    try {
      const fileSizeMB = file.size / (1024 * 1024);
      
      if (fileSizeMB <= maxSizeMB) {
        console.log(`✓ الصورة صغيرة (${fileSizeMB.toFixed(2)}MB) - لا حاجة للضغط`);
        return file;
      }

      console.log(`⚙️ جاري ضغط الصورة من ${fileSizeMB.toFixed(2)}MB إلى ${maxSizeMB}MB...`);

      const options = {
        maxSizeMB,
        maxWidthOrHeight: 1920,
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
   * رفع صورة واحدة على Cloudinary
   */
  async uploadImage(file: File, maxSizeMB: number = 5): Promise<ImageUploadResult> {
    try {
      const originalSizeMB = file.size / (1024 * 1024);
      console.log(`📤 بدء رفع الصورة: ${file.name} (${originalSizeMB.toFixed(2)}MB)`);

      // ضغط الصورة
      const compressedFile = await this.compressImage(file, maxSizeMB);
      
      // إنشاء FormData
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', this.uploadPreset);
      formData.append('cloud_name', this.cloudName);
      
      // رفع على Cloudinary
      console.log('🚀 جاري رفع الصورة على Cloudinary...');
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();
      
      if (result.secure_url) {
        console.log('✅ تم رفع الصورة بنجاح!');
        return {
          url: result.secure_url,
          success: true,
        };
      } else {
        throw new Error(result.error?.message || 'فشل رفع الصورة');
      }
    } catch (error: any) {
      console.error('❌ Error uploading image:', error);
      return {
        url: '',
        success: false,
        error: error.message || 'فشل رفع الصورة',
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
   * التحقق من صحة رابط الصورة
   */
  isValidImageUrl(url: string): boolean {
    if (!url) return false;
    
    // Cloudinary URL
    if (url.includes('cloudinary.com')) return true;
    
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

export const cloudinaryImageService = new CloudinaryImageService();
