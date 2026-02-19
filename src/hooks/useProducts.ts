import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  type: string;
  sizes: string[];
  sizesAvailability?: { size: string; available: boolean; outOfStock?: boolean }[];
  image: string;
  description: string;
  offer?: boolean;
  offerEndTime?: number;
  offerDiscount?: number;
  colors?: { 
    color: string; 
    image: string; 
    images?: string[]; 
    available?: boolean; 
    outOfStock?: boolean;
    sizes?: Array<string | { size: string; available: boolean; outOfStock?: boolean }>;
  }[];
  sizeImages?: { size: string; image: string; images?: string[] }[];
  soldOut?: boolean;
  displayOrder?: number; // ترتيب الظهور
}

// دالة لمعالجة colors عند الاسترجاع من Firebase
const normalizeColorsFromFirebase = (colors: any[] = []): Product['colors'] => {
  if (!colors || !Array.isArray(colors)) return [];
  return colors.map(c => {
    // إذا كان images موجود (الشكل الجديد)
    if (Array.isArray(c.images) && c.images.length > 0) {
      return {
        color: c.color || '',
        image: c.images[0], // أول صورة
        images: c.images, // احتفظ بالـ array أيضاً للتوافق
        available: c.available !== false, // default true
        outOfStock: c.outOfStock || false, // default false
        sizes: c.sizes || [] // المقاسات الخاصة باللون
      };
    }
    // إذا كان image موجود (الشكل القديم)
    if (c.image) {
      return {
        color: c.color || '',
        image: c.image,
        images: [c.image],
        available: c.available !== false, // default true
        outOfStock: c.outOfStock || false, // default false
        sizes: c.sizes || [] // المقاسات الخاصة باللون
      };
    }
    return null;
  }).filter(Boolean) as Product['colors'];
};

// دالة لمعالجة sizeImages عند الاسترجاع من Firebase
const normalizeSizeImagesFromFirebase = (sizeImages: any[] = []): Product['sizeImages'] => {
  if (!sizeImages || !Array.isArray(sizeImages)) return [];
  return sizeImages.map(si => {
    // إذا كان images موجود (الشكل الجديد)
    if (Array.isArray(si.images) && si.images.length > 0) {
      return {
        size: si.size || '',
        image: si.images[0], // أول صورة
        images: si.images // احتفظ بالـ array أيضاً للتوافق
      };
    }
    // إذا كان image موجود (الشكل القديم)
    if (si.image) {
      return {
        size: si.size || '',
        image: si.image,
        images: [si.image]
      };
    }
    return null;
  }).filter(Boolean) as Product['sizeImages'];
};

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const productsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
            category: data.category || '',
            type: data.type || '',
            sizes: Array.isArray(data.sizes) ? data.sizes : [],
            sizesAvailability: Array.isArray(data.sizesAvailability) 
              ? data.sizesAvailability 
              : Array.isArray(data.sizes) 
                ? data.sizes.map((s: string) => ({ size: s, available: true, outOfStock: false }))
                : [],
            image: data.image || '',
            description: data.description || '',
            offer: data.offer || false,
            offerEndTime: data.offerEndTime || undefined,
            offerDiscount: data.offerDiscount || undefined,
            colors: normalizeColorsFromFirebase(data.colors),
            sizeImages: normalizeSizeImagesFromFirebase(data.sizeImages),
            soldOut: data.soldOut || false,
            displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : undefined,
          } as Product;
        });
        // ترتيب المنتجات حسب displayOrder
        productsData.sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));
        setProducts(productsData);
        setLoading(false);
      },
      (error) => {
        console.error('🔥 Error fetching products:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { products, loading };
};
