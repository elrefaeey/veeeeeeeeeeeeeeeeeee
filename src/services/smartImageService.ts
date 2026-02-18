// حل نهائي ذكي: تقسيم الصور لقطع صغيرة وتخزينها في Firestore
// بدون Firebase Storage - بدون خدمات خارجية - مجاني 100%

import imageCompression from 'browser-image-compression';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ImageUploadResult {
  url: string;
  success: boolean;
  error?: string;
  imageId?: string; // معرف الصورة في Firestore
}

class SmartImageService {
  private readonly CHUNK_SIZE = 900000; // 900KB لكل قطعة (أقل من 1MB)
  private readonly COLLECTION_NAME = 'image_chunks';

  /**
   * ضغط الصورة بشكل قوي
   */
  async compressImage(file: File): Promise<File> {
    try {
      const fileSizeMB = file.size / (1024 * 1024);
      console.log(`⚙️ جاري ضغط الصورة من ${fileSizeMB.toFixed(2)}MB...`);

      const options = {
        maxSizeMB: 0.3, // ضغط قوي لـ 300KB
        maxWidthOrHeight: 1200, // جودة جيدة
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.75,
      };

      const compressed = await imageCompression(file, options);
      const compressedSizeMB = compressed.size / (1024 * 1024);
      console.log(`✓ تم الضغط! الحجم الجديد: ${compressedSizeMB.toFixed(2)}MB`);
      
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
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * تقسيم Base64 إلى قطع صغيرة
   */
  private splitBase64(base64: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < base64.length; i += chunkSize) {
      chunks.push(base64.substring(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * رفع صورة واحدة (مقسمة إلى قطع)
   */
  async uploadImage(file: File): Promise<ImageUploadResult> {
    try {
      const originalSizeMB = file.size / (1024 * 1024);
      console.log(`📤 بدء رفع الصورة: ${file.name} (${originalSizeMB.toFixed(2)}MB)`);

      // ضغط الصورة
      const compressedFile = await this.compressImage(file);
      
      // تحويل إلى Base64
      const base64 = await this.fileToBase64(compressedFile);
      
      // تقسيم إلى قطع
      const chunks = this.splitBase64(base64, this.CHUNK_SIZE);
      console.log(`📦 تم تقسيم الصورة إلى ${chunks.length} قطعة`);
      
      // إنشاء معرف فريد للصورة
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // رفع كل قطعة على Firestore
      console.log('🚀 جاري رفع القطع...');
      const uploadPromises = chunks.map((chunk, index) => 
        addDoc(collection(db, this.COLLECTION_NAME), {
          imageId,
          chunkIndex: index,
          totalChunks: chunks.length,
          data: chunk,
          createdAt: new Date().toISOString(),
        })
      );
      
      await Promise.all(uploadPromises);
      console.log('✅ تم رفع الصورة بنجاح!');
      
      // إرجاع معرف الصورة كـ URL
      return {
        url: `firestore://${imageId}`,
        success: true,
        imageId,
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
   * تحميل صورة من Firestore
   */
  async downloadImage(imageId: string): Promise<string | null> {
    try {
      console.log(`📥 جاري تحميل الصورة: ${imageId}`);
      
      // جلب كل القطع
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('imageId', '==', imageId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.error('الصورة غير موجودة');
        return null;
      }
      
      // ترتيب القطع
      const chunks: { index: number; data: string }[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        chunks.push({
          index: data.chunkIndex,
          data: data.data,
        });
      });
      
      chunks.sort((a, b) => a.index - b.index);
      
      // دمج القطع
      const base64 = chunks.map(c => c.data).join('');
      console.log('✅ تم تحميل الصورة بنجاح!');
      
      return base64;
    } catch (error) {
      console.error('❌ Error downloading image:', error);
      return null;
    }
  }

  /**
   * حذف صورة من Firestore
   */
  async deleteImage(imageId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('imageId', '==', imageId)
      );
      
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
      
      await Promise.all(deletePromises);
      console.log('✅ تم حذف الصورة بنجاح');
      return true;
    } catch (error) {
      console.error('❌ Error deleting image:', error);
      return false;
    }
  }

  /**
   * التحقق من نوع الرابط
   */
  isFirestoreUrl(url: string): boolean {
    return url.startsWith('firestore://');
  }

  /**
   * استخراج imageId من الرابط
   */
  extractImageId(url: string): string | null {
    if (this.isFirestoreUrl(url)) {
      return url.replace('firestore://', '');
    }
    return null;
  }

  /**
   * رفع عدة صور
   */
  async uploadMultipleImages(files: File[]): Promise<ImageUploadResult[]> {
    const uploadPromises = files.map(file => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }
}

export const smartImageService = new SmartImageService();
