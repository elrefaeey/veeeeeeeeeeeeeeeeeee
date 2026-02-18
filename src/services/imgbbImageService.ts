// خدمة رفع الصور على ImgBB - مجاني 100%!
// لا يحتاج Firebase Storage - حل بديل كامل

import imageCompression from 'browser-image-compression';

export interface ImageUploadResult {
  url: string;
  success: boolean;
  error?: string;
}

class ImgBBImageService {
  // API Key مجاني من ImgBB - يمكنك الحصول على واحد من https://api.imgbb.com/
  private apiKey = 'd2075c2e85c6bca19e0a56ba6e02c632'; // مفتاح تجريبي

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
        maxWidthOrHeight: 1920, // جودة عالية
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
   * تحويل File إلى Base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // إزالة البادئة data:image/...;base64,
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * رفع صورة واحدة على ImgBB
   */
  async uploadImage(file: File, maxSizeMB: number = 5): Promise<ImageUploadResult> {
    try {
      const originalSizeMB = file.size / (1024 * 1024);
      console.log(`📤 بدء رفع الصورة: ${file.name} (${originalSizeMB.toFixed(2)}MB)`);

      // ضغط الصورة
      const compressedFile = await this.compressImage(file, maxSizeMB);
      
      // تحويل إلى Base64
      const base64Image = await this.fileToBase64(compressedFile);
      
      // رفع على ImgBB
      console.log('🚀 جاري رفع الصورة على ImgBB...');
      
      const formData = new FormData();
      formData.append('image', base64Image);
      formData.append('key', this.apiKey);
      
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success && result.data?.url) {
        console.log('✅ تم رفع الصورة بنجاح!');
        return {
          url: result.data.url,
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
    
    // ImgBB URL
    if (url.includes('i.ibb.co') || url.includes('imgbb.com')) return true;
    
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

export const imgbbImageService = new ImgBBImageService();
