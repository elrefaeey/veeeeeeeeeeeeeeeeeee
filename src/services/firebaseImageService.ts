// خدمة رفع الصور على Firebase Storage
// حل نهائي لمشكلة حجم Firestore - ارفع براحتك!

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import imageCompression from 'browser-image-compression';

export interface ImageUploadResult {
  url: string;
  success: boolean;
  error?: string;
  path?: string; // مسار الصورة في Storage للحذف لاحقاً
}

class FirebaseImageService {
  /**
   * ضغط الصورة قبل الرفع
   */
  async compressImage(file: File, maxSizeMB: number = 2, quality: number = 0.8): Promise<File> {
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
   * رفع صورة واحدة على Firebase Storage
   */
  async uploadImage(
    file: File,
    folder: string = 'products',
    maxSizeMB: number = 2
  ): Promise<ImageUploadResult> {
    try {
      const originalSizeMB = file.size / (1024 * 1024);
      console.log(`📤 بدء رفع الصورة: ${file.name} (${originalSizeMB.toFixed(2)}MB)`);

      // ضغط الصورة
      const compressedFile = await this.compressImage(file, maxSizeMB);
      
      // إنشاء اسم فريد للصورة
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 9);
      const fileName = `${timestamp}_${randomStr}.jpg`;
      const filePath = `${folder}/${fileName}`;
      
      // رفع الصورة على Firebase Storage
      console.log('🚀 جاري رفع الصورة على Firebase Storage...');
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, compressedFile);
      
      // الحصول على رابط الصورة
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('✅ تم رفع الصورة بنجاح!');
      
      return {
        url: downloadURL,
        success: true,
        path: filePath,
      };
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
  async uploadMultipleImages(
    files: File[],
    folder: string = 'products'
  ): Promise<ImageUploadResult[]> {
    const uploadPromises = files.map(file => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * حذف صورة من Firebase Storage
   */
  async deleteImage(imagePath: string): Promise<boolean> {
    try {
      const imageRef = ref(storage, imagePath);
      await deleteObject(imageRef);
      console.log('✅ تم حذف الصورة بنجاح');
      return true;
    } catch (error) {
      console.error('❌ Error deleting image:', error);
      return false;
    }
  }

  /**
   * التحقق من صحة رابط الصورة
   */
  isValidImageUrl(url: string): boolean {
    if (!url) return false;
    
    // Firebase Storage URL
    if (url.includes('firebasestorage.googleapis.com')) return true;
    
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

export const firebaseImageService = new FirebaseImageService();
