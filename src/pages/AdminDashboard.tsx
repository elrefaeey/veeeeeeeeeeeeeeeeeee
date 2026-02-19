import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LogOut, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Product } from '@/hooks/useProducts';
import { EGYPT_GOVS } from '../lib/egyptGovs';
import { LocalImageUploader } from '@/components/LocalImageUploader';
import { localStorageImageService } from '@/services/localStorageImageService';

// الحد الأقصى لحجم الصور (50MB - دعم صور كبيرة)
const MAX_IMAGE_SIZE_MB = 50;

const AdminDashboard = () => {
  const { user } = useFirebase();
  const { logout } = useFirebaseAuth();
  const { products, loading } = useProducts();
  const navigate = useNavigate();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'offers' | 'orders' | 'policies'>('products');

  // عند تحميل منتج قديم أو تهيئة افتراضية
  const normalizeColors = (colors: any[] = []) =>
    colors.map(c => ({
      color: c.color || '',
      images: c.images ? c.images : c.image ? [c.image] : [''],
      available: c.available !== undefined ? c.available : true, // default true
      outOfStock: c.outOfStock || false, // default false
      sizes: c.sizes || [] // المقاسات الخاصة باللون
    }));

  // 1. تعديل تهيئة sizeImages في formData و newOfferForm
  const normalizeSizeImages = (arr: any[] = []) =>
    arr.map(s => ({
      size: s.size,
      images: s.images ? s.images : s.image ? [s.image] : ['']
    }));

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    type: '',
    sizes: [] as string[],
    sizesAvailability: [] as { size: string; available: boolean; outOfStock?: boolean }[],
    image: '',
    description: '',
    colors: normalizeColors([{ color: '', images: [''], available: true, outOfStock: false, sizes: [] }]),
    sizeImages: normalizeSizeImages([]),
    soldOut: false,
    displayOrder: undefined,
  });

  const [isAddOfferOpen, setIsAddOfferOpen] = useState(false);
  const [offerTab, setOfferTab] = useState<'existing' | 'new'>('existing');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [offerTime, setOfferTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [offerDiscount, setOfferDiscount] = useState('');
  const [newOffer, setNewOffer] = useState({
    name: '',
    price: '',
    image: '',
    offerDiscount: ''
  });
  const [newOfferTime, setNewOfferTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [editOfferProduct, setEditOfferProduct] = useState(null);
  const [editOfferOpen, setEditOfferOpen] = useState(false);
  const [editOfferDiscount, setEditOfferDiscount] = useState(0);
  const [editOfferTime, setEditOfferTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [typeOptions, setTypeOptions] = useState<string[]>([]);

  const [editingCategory, setEditingCategory] = useState(false);
  const [editedCategory, setEditedCategory] = useState('');

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const offerProducts = products.filter(p => p.offer && (!p.offerEndTime || p.offerEndTime > Date.now()));

  // Get unique categories from products
  const categoryOptions = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(set);
  }, [products]);

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    products.forEach(product => {
      if (!map.has(product.category)) map.set(product.category, []);
      map.get(product.category)!.push(product);
    });
    return map;
  }, [products]);

  // 1. Define all delivery areas from EGYPT_GOVS
  const DELIVERY_AREAS = Object.entries(EGYPT_GOVS || {}).flatMap(
    ([governorate, centers]) => centers.map(center => ({ ...center, governorate }))
  );

  // 1. إضافة حالة للعداد الموحد
  const [globalOfferTime, setGlobalOfferTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [globalOfferEndTime, setGlobalOfferEndTime] = useState<number | null>(null);

  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const [newOfferForm, setNewOfferForm] = useState({
    name: '',
    price: '',
    category: '',
    type: '',
    sizes: [] as string[],
    image: '',
    description: '',
    colors: normalizeColors([{ color: '', images: [''], available: true, outOfStock: false, sizes: [] }]),
    sizeImages: normalizeSizeImages([]),
    offerDiscount: '',
  });

  // حالة الطلبات
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // حالة السياسات
  const [returnPolicy, setReturnPolicy] = useState('');
  const [shippingPolicy, setShippingPolicy] = useState('');
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [currentYear, setCurrentYear] = useState(0);

  React.useEffect(() => {
    if (!user) {
      navigate('/admin-login');
    }
  }, [user, navigate]);

  // تحديث المنتجات القديمة لتتوافق مع النظام الجديد
  React.useEffect(() => {
    const migrateOldProducts = async () => {
      if (!user || products.length === 0) return;
      
      let needsUpdate = false;
      const updates: Promise<void>[] = [];
      
      for (const product of products) {
        // تحقق إذا المنتج محتاج تحديث
        const hasOldStructure = product.colors && product.colors.some(c => !c.sizes || c.sizes.length === 0);
        
        if (hasOldStructure && product.sizes && product.sizes.length > 0) {
          needsUpdate = true;
          
          // تحديث كل لون ليكون عنده نفس المقاسات
          const updatedColors = (product.colors || []).map(color => ({
            ...color,
            sizes: product.sizes.map(size => {
              const sizeAvail = product.sizesAvailability?.find(sa => sa.size === size);
              return {
                size,
                available: sizeAvail ? sizeAvail.available : true,
                outOfStock: sizeAvail?.outOfStock || false
              };
            })
          }));
          
          const updatePromise = updateDoc(doc(db, 'products', product.id), {
            colors: updatedColors
          });
          
          updates.push(updatePromise);
        }
      }
      
      if (needsUpdate && updates.length > 0) {
        try {
          await Promise.all(updates);
          console.log(`✅ تم تحديث ${updates.length} منتج للنظام الجديد`);
          toast({
            title: '✅ تم تحديث المنتجات',
            description: `تم تحديث ${updates.length} منتج للنظام الجديد`,
          });
        } catch (error) {
          console.error('❌ خطأ في تحديث المنتجات:', error);
        }
      }
    };
    
    migrateOldProducts();
  }, [user, products]);

  // جلب الطلبات من Firebase
  React.useEffect(() => {
    const fetchOrders = async () => {
      try {
        setOrdersLoading(true);
        const now = new Date();
        const weekNumber = getWeekNumber(now);
        const year = now.getFullYear();

        setCurrentWeek(weekNumber);
        setCurrentYear(year);

        // جلب طلبات الأسبوع الحالي
        const ordersQuery = query(
          collection(db, 'orders'),
          where('weekNumber', '==', weekNumber),
          where('year', '==', year)
        );

        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log('📋 Orders fetched:', ordersData);
        setOrders(ordersData);
      } catch (error) {
        console.error('❌ Error fetching orders:', error);
      } finally {
        setOrdersLoading(false);
      }
    };

    if (user) {
      fetchOrders();
      fetchPolicies();
    }
  }, [user, navigate]);

  // جلب السياسات من Firebase
  const fetchPolicies = async () => {
    try {
      const policiesDoc = await getDoc(doc(db, 'settings', 'policies'));
      if (policiesDoc.exists()) {
        const data = policiesDoc.data();
        setReturnPolicy(data.returnPolicy || '');
        setShippingPolicy(data.shippingPolicy || '');
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setPoliciesLoading(false);
    }
  };

  // حفظ السياسات في Firebase
  const savePolicies = async () => {
    try {
      const policiesRef = doc(db, 'settings', 'policies');
      await updateDoc(policiesRef, {
        returnPolicy,
        shippingPolicy,
        updatedAt: Date.now()
      }).catch(async () => {
        // إذا لم يكن موجود، استخدم setDoc
        await setDoc(policiesRef, {
          returnPolicy,
          shippingPolicy,
          updatedAt: Date.now()
        });
      });
      
      toast({
        title: 'تم حفظ السياسات بنجاح',
      });
    } catch (error) {
      console.error('Error saving policies:', error);
      toast({
        title: 'خطأ في حفظ السياسات',
        variant: 'destructive',
      });
    }
  };

  // دالة لحساب رقم الأسبوع
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // دالة لحذف طلبات الأسبوع (إعادة تعيين)
  const resetWeeklyOrders = async () => {
    if (!confirm('هل أنت متأكد من حذف جميع طلبات هذا الأسبوع؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      return;
    }

    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('weekNumber', '==', currentWeek),
        where('year', '==', currentYear)
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const deletePromises = ordersSnapshot.docs.map(doc => deleteDoc(doc.ref));

      await Promise.all(deletePromises);
      setOrders([]);

      toast({
        title: 'تم حذف جميع الطلبات بنجاح',
        variant: 'default',
      });
    } catch (error) {
      console.error('❌ Error deleting orders:', error);
      toast({
        title: 'حدث خطأ أثناء حذف الطلبات',
        variant: 'destructive',
      });
    }
  };

  // دالة لتحديث حالة الطلب
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      toast({
        title: 'تم تحديث حالة الطلب',
        variant: 'default',
      });
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      toast({
        title: 'حدث خطأ أثناء تحديث الطلب',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      category: '',
      type: '',
      sizes: [],
      sizesAvailability: [],
      image: '',
      description: '',
      colors: normalizeColors([{ color: '', images: [''], available: true, outOfStock: false }]),
      sizeImages: normalizeSizeImages([]),
      soldOut: false,
      displayOrder: undefined,
    });
  };

  const handleSizeToggle = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) {
      toast({
        title: 'خطأ',
        description: 'يجب اختيار تصنيف للمنتج',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'جاري إضافة المنتج...',
      description: 'يرجى الانتظار',
    });
    
    try {
      // تحويل البيانات لـ plain objects باستخدام JSON parse/stringify
      const dataToSave = JSON.parse(JSON.stringify({
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        type: formData.type || '',
        sizes: formData.sizes || [],
        sizesAvailability: (formData.sizesAvailability || []).map(s => ({
          size: s.size,
          available: s.available !== false,
          outOfStock: s.outOfStock || false
        })),
        image: formData.image,
        description: formData.description,
        colors: (formData.colors || [])
          .filter(c => c.color && c.images && c.images.length > 0)
          .map(c => ({
            color: c.color,
            images: c.images || [],
            available: c.available !== false,
            outOfStock: c.outOfStock || false,
            sizes: (c.sizes || []).map(s => ({
              size: typeof s === 'string' ? s : s.size,
              available: typeof s === 'string' ? true : (s.available !== false),
              outOfStock: typeof s === 'string' ? false : (s.outOfStock || false)
            }))
          })),
        sizeImages: (formData.sizeImages || []).map(s => ({
          size: s.size,
          images: s.images || []
        })),
        soldOut: formData.soldOut || false,
        displayOrder: formData.displayOrder !== undefined ? formData.displayOrder : null,
      }));

      await addDoc(collection(db, 'products'), dataToSave);
      
      toast({
        title: '✅ تم إضافة المنتج بنجاح',
        description: 'المنتج متاح الآن في المتجر',
      });
      
      resetForm();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: 'خطأ في إضافة المنتج',
        description: error instanceof Error ? error.message : 'حاول مرة أخرى',
        variant: 'destructive',
      });
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!formData.category) {
      alert('يجب اختيار تصنيف للمنتج');
      return;
    }
    try {
      // تحويل البيانات لـ plain objects
      const dataToSave = JSON.parse(JSON.stringify({
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        type: formData.type || '',
        sizes: formData.sizes || [],
        sizesAvailability: (formData.sizesAvailability || []).map(s => ({
          size: s.size,
          available: s.available !== false,
          outOfStock: s.outOfStock || false
        })),
        image: formData.image,
        description: formData.description,
        colors: (formData.colors || [])
          .filter(c => c.color && c.images && c.images.length > 0)
          .map(c => ({
            color: c.color,
            images: c.images || [],
            available: c.available !== false,
            outOfStock: c.outOfStock || false,
            sizes: (c.sizes || []).map(s => ({
              size: typeof s === 'string' ? s : s.size,
              available: typeof s === 'string' ? true : (s.available !== false),
              outOfStock: typeof s === 'string' ? false : (s.outOfStock || false)
            }))
          })),
        sizeImages: (formData.sizeImages || []).map(s => ({
          size: s.size,
          images: s.images || []
        })),
        soldOut: formData.soldOut || false,
        displayOrder: formData.displayOrder !== undefined ? formData.displayOrder : null,
      }));

      // التحقق من حجم المنتج
      const sizeCheck = localStorageImageService.isProductSizeValid(dataToSave);
      console.log(`📊 حجم المنتج: ${sizeCheck.sizeKB}KB`);
      
      if (!sizeCheck.valid) {
        toast({
          title: '⚠️ المنتج كبير جداً!',
          description: `الحجم: ${sizeCheck.sizeKB}KB (الحد الأقصى: 1000KB). قلل عدد الصور أو احذف بعضها.`,
          variant: 'destructive',
        });
        return;
      }

      if (sizeCheck.sizeKB > 800) {
        toast({
          title: '⚠️ تحذير',
          description: `حجم المنتج: ${sizeCheck.sizeKB}KB. قريب من الحد الأقصى!`,
        });
      }

      await updateDoc(doc(db, 'products', editingProduct.id), dataToSave);
      
      toast({
        title: '✅ تم تحديث المنتج بنجاح',
      });
      
      resetForm();
      setIsEditModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'خطأ في تحديث المنتج',
        description: error instanceof Error ? error.message : 'حاول مرة أخرى',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setConfirmDialog({
      open: true,
      title: 'حذف المنتج',
      message: 'هل أنت متأكد من حذف هذا المنتج؟',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'products', productId));
          toast({
            title: '✅ تم حذف المنتج بنجاح',
          });
        } catch (error) {
          console.error('Error deleting product:', error);
          toast({
            title: 'خطأ في حذف المنتج',
            variant: 'destructive',
          });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  const openEditModal = async (product: Product) => {
    // جلب أحدث بيانات المنتج من Firestore
    const docRef = doc(db, 'products', product.id);
    const snap = await getDoc(docRef);
    let freshProduct: Product = product;
    if (snap.exists()) {
      const data = snap.data();
      freshProduct = {
        id: snap.id,
        name: data.name || '',
        price: data.price || '',
        category: data.category || '',
        type: data.type || '',
        sizes: data.sizes || [],
        image: data.image || '',
        description: data.description || '',
        colors: data.colors || [],
        sizeImages: data.sizeImages || [],
        soldOut: data.soldOut || false,
        displayOrder: data.displayOrder,
        offer: data.offer,
        offerDiscount: data.offerDiscount,
        offerEndTime: data.offerEndTime,
      };
    }
    
    // دالة لحساب حجم الصورة بالـ KB
    const getImageSizeKB = (dataUrl: string): number => {
      if (!dataUrl || !dataUrl.startsWith('data:')) return 0;
      return (dataUrl.length * 3) / 4 / 1024;
    };
    
    // حذف الصور الكبيرة تلقائياً (أكبر من 80KB)
    let removedCount = 0;
    
    // تنظيف الصورة الرئيسية
    if (freshProduct.image && getImageSizeKB(freshProduct.image) > 80) {
      freshProduct.image = '';
      removedCount++;
    }
    
    // تنظيف صور الألوان
    if (freshProduct.colors && freshProduct.colors.length > 0) {
      freshProduct.colors = freshProduct.colors.map(color => {
        if (color.images && color.images.length > 0) {
          const filteredImages = color.images.filter(img => {
            const size = getImageSizeKB(img);
            if (size > 80) {
              removedCount++;
              return false;
            }
            return true;
          });
          return { ...color, images: filteredImages };
        }
        return color;
      }).filter(color => color.images && color.images.length > 0);
    }
    
    // تنظيف صور المقاسات
    if (freshProduct.sizeImages && freshProduct.sizeImages.length > 0) {
      freshProduct.sizeImages = freshProduct.sizeImages.map(sizeImg => {
        if (sizeImg.images && sizeImg.images.length > 0) {
          const filteredImages = sizeImg.images.filter(img => {
            const size = getImageSizeKB(img);
            if (size > 80) {
              removedCount++;
              return false;
            }
            return true;
          });
          return { ...sizeImg, images: filteredImages };
        }
        return sizeImg;
      }).filter(sizeImg => sizeImg.images && sizeImg.images.length > 0);
    }
    
    // التحقق من الحجم بعد التنظيف
    const sizeCheck = localStorageImageService.isProductSizeValid(freshProduct);
    console.log(`📊 حجم المنتج بعد التنظيف: ${sizeCheck.sizeKB}KB`);
    
    if (removedCount > 0) {
      toast({
        title: `🗑️ تم حذف ${removedCount} صورة قديمة كبيرة`,
        description: `حجم المنتج الآن: ${sizeCheck.sizeKB}KB`,
      });
    }
    
    // إذا لسه كبير، نحذف كل حاجة
    if (sizeCheck.sizeKB > 900) {
      const confirmDelete = confirm(
        `⚠️ المنتج لسه كبير جداً (${sizeCheck.sizeKB}KB)!\n\n` +
        `لازم نحذف كل الصور القديمة عشان تقدر تعدل المنتج.\n\n` +
        `اضغط OK للمتابعة`
      );
      
      if (confirmDelete) {
        freshProduct.colors = [];
        freshProduct.sizeImages = [];
        freshProduct.image = '';
        
        toast({
          title: '🗑️ تم حذف كل الصور',
          description: 'ارفع صور جديدة مضغوطة (كل صورة أقل من 50KB)',
        });
      } else {
        return; // إلغاء فتح المودال
      }
    }
    
    // حفظ التغييرات في Firestore إذا تم حذف صور
    if (removedCount > 0 || sizeCheck.sizeKB > 900) {
      try {
        const cleanData = JSON.parse(JSON.stringify({
          name: freshProduct.name,
          price: freshProduct.price,
          category: freshProduct.category,
          type: freshProduct.type,
          sizes: freshProduct.sizes,
          image: freshProduct.image,
          description: freshProduct.description,
          colors: freshProduct.colors,
          sizeImages: freshProduct.sizeImages,
          soldOut: freshProduct.soldOut,
          displayOrder: freshProduct.displayOrder,
        }));
        
        await updateDoc(doc(db, 'products', freshProduct.id), cleanData);
        console.log('✅ تم حفظ المنتج المنظف في Firestore');
      } catch (error) {
        console.error('Error saving cleaned product:', error);
      }
    }
    
    setEditingProduct(freshProduct);
    setFormData({
      name: freshProduct.name,
      price: freshProduct.price.toString(),
      category: freshProduct.category,
      type: freshProduct.type,
      sizes: freshProduct.sizes || [],
      sizesAvailability: freshProduct.sizesAvailability || (freshProduct.sizes || []).map(s => ({ size: s, available: true })),
      image: freshProduct.image,
      description: freshProduct.description,
      colors: normalizeColors(freshProduct.colors),
      sizeImages: normalizeSizeImages(freshProduct.sizeImages),
      soldOut: freshProduct.soldOut || false,
      displayOrder: freshProduct.displayOrder,
    });
    setIsEditModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];



  // 2. دالة لضبط العداد وتحديث كل المنتجات التي عليها عرض
  const handleSetGlobalOfferTimer = async () => {
    const totalMs = (globalOfferTime.days * 24 * 60 * 60 + globalOfferTime.hours * 60 * 60 + globalOfferTime.minutes * 60 + globalOfferTime.seconds) * 1000;
    
    if (totalMs <= 0) {
      toast({
        title: 'Please set a valid timer duration',
        variant: 'destructive',
      });
      return;
    }
    
    const endTime = Date.now() + totalMs;
    setGlobalOfferEndTime(endTime);
    
    // تحديث كل المنتجات التي عليها عرض
    const batch = offerProducts.map(p => updateDoc(doc(db, 'products', p.id), { offerEndTime: endTime }));
    await Promise.all(batch);
    
    toast({
      title: 'Timer synced successfully',
      description: `All offers will expire at ${new Date(endTime).toLocaleString()}`,
    });
  };

  const handleAddNewOfferProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferForm.name || !newOfferForm.price || !newOfferForm.image) {
      toast({
        title: 'يجب ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }
    const price = parseFloat(newOfferForm.price);
    const offerDiscount = parseFloat(newOfferForm.offerDiscount || '0');
    const endTime = globalOfferEndTime || null;

    try {
      // تحويل البيانات لـ plain objects باستخدام JSON parse/stringify
      const dataToSave = JSON.parse(JSON.stringify({
        name: newOfferForm.name,
        price,
        offer: true,
        offerDiscount,
        offerEndTime: endTime,
        category: newOfferForm.category,
        type: newOfferForm.type || '',
        sizes: newOfferForm.sizes || [],
        colors: (newOfferForm.colors || [])
          .filter(c => c.color && c.images && c.images.length > 0)
          .map(c => ({
            color: c.color,
            images: c.images || [],
            available: c.available !== false,
            outOfStock: c.outOfStock || false
          })),
        sizeImages: (newOfferForm.sizeImages || []).map(s => ({
          size: s.size,
          images: s.images || []
        })),
        image: newOfferForm.image,
        description: newOfferForm.description,
      }));

      await addDoc(collection(db, 'products'), dataToSave);
      
      setIsAddOfferOpen(false);
      setNewOfferForm({
        name: '',
        price: '',
        category: '',
        type: '',
        sizes: [],
        image: '',
        description: '',
        colors: normalizeColors([{ color: '', images: [''], available: true, outOfStock: false }]),
        sizeImages: normalizeSizeImages([]),
        offerDiscount: '',
      });
      toast({
        title: 'تم إضافة المنتج بنجاح مع العرض',
        variant: 'default',
      });
    } catch (err) {
      console.error('Error adding new offer product:', err);
      toast({
        title: 'حدث خطأ أثناء إضافة المنتج',
        description: err instanceof Error ? err.message : 'حاول مرة أخرى',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50/50">
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border-b border-stone-700 flex items-center min-h-[5rem] py-4 px-4 md:px-8 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row shadow-none items-center gap-2 md:gap-4 text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-playfair font-black tracking-[0.2em] md:tracking-[0.3em] text-white uppercase drop-shadow-lg">VEE ADMIN</h1>
            <div className="hidden md:block h-4 w-px bg-stone-600 mx-2" />
            <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-stone-400 font-bold">{user.email}</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={() => navigate('/')}
              className="text-[9px] md:text-[10px] uppercase tracking-widest text-stone-300 hover:text-white transition-colors font-bold"
            >
              View Store
            </button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="rounded-none border-stone-600 bg-transparent text-white hover:bg-white hover:text-stone-900 transition-all uppercase tracking-widest text-[9px] md:text-[10px] h-8 md:h-10 px-4 md:px-6"
            >
              <LogOut className="w-3 h-3 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Tabs Navigation */}
        <div className="flex overflow-x-auto no-scrollbar gap-8 md:gap-12 mb-8 md:mb-16 border-b-2 border-stone-200">
          {[
            { id: 'products', label: 'Inventory', icon: '📦' },
            { id: 'offers', label: 'Curation', icon: '✨' },
            { id: 'orders', label: `Orders (${orders.length})`, icon: '🛍️' },
            { id: 'policies', label: 'Policies', icon: '📋' }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`pb-4 text-[10px] md:text-[11px] uppercase tracking-[0.2em] md:tracking-[0.3em] font-black transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                ? 'text-stone-900'
                : 'text-stone-400 hover:text-stone-600'
                }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-rose-500 animate-in fade-in slide-in-from-bottom-1 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-playfair font-black text-stone-900 uppercase">Inventory</h2>
                <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-stone-500 font-bold">Manage your collection • {products.length} items</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  onClick={() => navigate('/admin/products-order')}
                  variant="outline"
                  className="rounded-lg h-11 md:h-12 border-2 border-stone-300 hover:bg-stone-100 transition tracking-[0.2em] px-6 md:px-8 text-[9px] md:text-[10px] font-black uppercase w-full sm:w-auto shadow-sm"
                >
                  🔄 ترتيب المنتجات
                </Button>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => resetForm()}
                      className="rounded-lg h-11 md:h-12 bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 transition tracking-[0.2em] px-6 md:px-8 text-[9px] md:text-[10px] font-black uppercase shadow-lg hover:shadow-xl w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Piece
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full bg-gradient-to-br from-white to-stone-50">
                  <DialogHeader className="border-b border-stone-200 pb-4">
                    <DialogTitle className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                      إضافة منتج جديد
                    </DialogTitle>
                  </DialogHeader>
                  <DialogDescription className="text-stone-600 text-sm">
                    املأ البيانات التالية لإضافة منتج جديد إلى المتجر
                  </DialogDescription>
                  <form onSubmit={handleAddProduct} className="space-y-6">
                    {/* معلومات أساسية */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
                      <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                        المعلومات الأساسية
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name" className="text-stone-700 font-semibold mb-2 block">اسم المنتج</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            required
                            placeholder="مثال: فستان صيفي"
                            className="border-stone-300 focus:border-pink-500 focus:ring-pink-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="price" className="text-stone-700 font-semibold mb-2 block">السعر (جنيه)</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                            required
                            placeholder="0.00"
                            className="border-stone-300 focus:border-pink-500 focus:ring-pink-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* التصنيف */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
                      <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                        التصنيف
                      </h3>
                      <div>
                        <Label htmlFor="category" className="text-stone-700 font-semibold mb-2 block">اختر التصنيف</Label>
                        <div className="flex gap-2 items-center">
                          <select
                            id="category"
                            value={formData.category}
                            onChange={e => {
                              if (e.target.value === '+new') {
                                setShowNewCategoryInput(true);
                                setNewCategory('');
                              } else {
                                setShowNewCategoryInput(false);
                                setFormData(prev => ({ ...prev, category: e.target.value as string }));
                              }
                            }}
                            className="w-full border border-stone-300 rounded-lg px-4 py-2.5 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition"
                          >
                            {formData.category === '' && <option value="">اختر التصنيف</option>}
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                            <option value="+new">+ إضافة تصنيف جديد</option>
                          </select>
                          {!showNewCategoryInput && formData.category && !editingCategory && (
                            <button
                              type="button"
                              className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 transition text-sm font-semibold shadow-md"
                              onClick={() => {
                                setEditingCategory(true);
                                setEditedCategory(formData.category);
                              }}
                            >
                              تعديل
                            </button>
                          )}
                        </div>
                        {showNewCategoryInput && (
                          <div className="flex gap-2 mt-3 p-4 bg-pink-50 rounded-lg border border-pink-200">
                            <input
                              type="text"
                              className="flex-1 border border-pink-300 rounded-lg px-4 py-2 focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                              placeholder="ادخل اسم التصنيف الجديد"
                              value={newCategory}
                              onChange={e => setNewCategory(e.target.value)}
                            />
                            <button
                              type="button"
                              className="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold hover:from-pink-600 hover:to-rose-600 transition shadow-md"
                              onClick={async () => {
                                if (newCategory.trim()) {
                                  await addCategory(newCategory);
                                  setShowNewCategoryInput(false);
                                  setNewCategory('');
                                  setFormData(prev => ({ ...prev, category: newCategory }));
                                }
                              }}
                            >
                              حفظ
                            </button>
                          </div>
                        )}
                        {editingCategory && (
                          <div className="flex gap-2 mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <input
                              type="text"
                              className="flex-1 border border-amber-300 rounded-lg px-4 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                              value={editedCategory}
                              onChange={e => setEditedCategory(e.target.value)}
                            />
                            <button
                              type="button"
                              className="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold hover:from-pink-600 hover:to-rose-600 transition shadow-md"
                              onClick={async () => {
                                const catObj = categories.find(cat => cat.name === formData.category);
                                if (catObj && editedCategory.trim() && editedCategory !== catObj.name) {
                                  await updateCategory(catObj.id, editedCategory.trim());
                                  setFormData(prev => ({ ...prev, category: editedCategory.trim() }));
                                }
                                setEditingCategory(false);
                              }}
                            >
                              حفظ
                            </button>
                            <button
                              type="button"
                              className="px-6 py-2 rounded-lg bg-stone-200 text-stone-700 hover:bg-stone-300 transition font-semibold"
                              onClick={() => setEditingCategory(false)}
                            >
                              إلغاء
                            </button>
                          </div>
                        )}
                        
                        {/* قائمة التصنيفات مع أيقونات التعديل والمسح */}
                        {categories.length > 0 && (
                          <div className="mt-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
                            <p className="text-xs font-bold text-stone-600 mb-3 uppercase tracking-wider">التصنيفات الحالية</p>
                            <div className="space-y-2">
                              {categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200 hover:border-pink-300 transition group">
                                  <span className="font-semibold text-stone-700">{cat.name}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition opacity-0 group-hover:opacity-100"
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, category: cat.name }));
                                        setEditingCategory(true);
                                        setEditedCategory(cat.name);
                                      }}
                                      title="تعديل التصنيف"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition opacity-0 group-hover:opacity-100"
                                      onClick={() => {
                                        const productsInCategory = products.filter(p => p.category === cat.name);
                                        setConfirmDialog({
                                          open: true,
                                          title: '⚠️ حذف التصنيف',
                                          message: `هل أنت متأكد من حذف التصنيف "${cat.name}"?\n\nتحذير: سيتم حذف ${productsInCategory.length} منتج في هذا التصنيف!`,
                                          onConfirm: async () => {
                                            try {
                                              // حذف كل المنتجات في هذا التصنيف
                                              for (const product of productsInCategory) {
                                                await deleteDoc(doc(db, 'products', product.id));
                                              }
                                              // حذف التصنيف
                                              await deleteCategory(cat.id);
                                              if (formData.category === cat.name) {
                                                setFormData(prev => ({ ...prev, category: '' }));
                                              }
                                              toast({
                                                title: '✅ تم الحذف',
                                                description: `تم حذف التصنيف "${cat.name}" و ${productsInCategory.length} منتج`,
                                              });
                                            } catch (error) {
                                              toast({
                                                title: 'خطأ في الحذف',
                                                variant: 'destructive',
                                              });
                                            }
                                            setConfirmDialog({ ...confirmDialog, open: false });
                                          },
                                        });
                                      }}
                                      title="حذف التصنيف وجميع منتجاته"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* الألوان */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
                      <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                        الألوان المتاحة
                      </h3>
                      {formData.colors.map((c, idx) => (
                        <div key={idx} className="bg-gradient-to-r from-stone-50 to-pink-50 border-2 border-stone-200 p-4 rounded-xl mb-3 hover:border-pink-300 transition">
                          <div className="flex items-center gap-3 mb-3">
                            <Input
                              placeholder="اسم اللون (مثال: أحمر)"
                              value={c.color}
                              onChange={e => {
                                const newColors = [...formData.colors];
                                newColors[idx].color = e.target.value;
                                setFormData(prev => ({ ...prev, colors: newColors }));
                              }}
                              className="flex-1 border-stone-300 focus:border-pink-500"
                            />
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-stone-200">
                              <input
                                type="checkbox"
                                id={`color-available-${idx}`}
                                checked={c.available !== false}
                                onChange={e => {
                                  const newColors = [...formData.colors];
                                  newColors[idx].available = e.target.checked;
                                  // لو علمت على "متاح"، اطفي "نفذ"
                                  if (e.target.checked) {
                                    newColors[idx].outOfStock = false;
                                  }
                                  setFormData(prev => ({ ...prev, colors: newColors }));
                                }}
                                className="w-4 h-4 text-pink-500 focus:ring-pink-500"
                              />
                              <Label htmlFor={`color-available-${idx}`} className="text-sm font-semibold cursor-pointer">متاح</Label>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-rose-200">
                              <input
                                type="checkbox"
                                id={`color-outofstock-${idx}`}
                                checked={c.outOfStock || false}
                                onChange={e => {
                                  const newColors = [...formData.colors];
                                  newColors[idx].outOfStock = e.target.checked;
                                  // لو علمت على "نفذ"، اطفي "متاح"
                                  if (e.target.checked) {
                                    newColors[idx].available = false;
                                  }
                                  setFormData(prev => ({ ...prev, colors: newColors }));
                                }}
                                className="w-4 h-4 text-rose-500 focus:ring-rose-500"
                              />
                              <Label htmlFor={`color-outofstock-${idx}`} className="text-sm font-semibold text-rose-600 cursor-pointer">نفذ</Label>
                            </div>
                            {formData.colors.length > 1 && (
                              <Button type="button" variant="destructive" size="sm" className="rounded-lg shadow-md" onClick={() => {
                                setFormData(prev => ({ ...prev, colors: prev.colors.filter((_, i) => i !== idx) }));
                              }}>حذف</Button>
                            )}
                          </div>
                          {/* صور اللون */}
                          <div className="space-y-2">
                            {(c.images || []).map((img, imgIdx) => (
                              <div key={imgIdx} className="flex flex-col gap-2">
                                <LocalImageUploader
                                  value={img}
                                  onChange={(url) => {
                                    const newColors = [...formData.colors];
                                    newColors[idx].images[imgIdx] = url;
                                    setFormData(prev => ({ ...prev, colors: newColors }));
                                  }}
                                  maxSizeMB={50}
                                  allowUrl={true}
                                  placeholder="رابط صورة اللون أو ارفع صورة"
                                />
                                {c.images.length > 1 && (
                                  <Button type="button" variant="destructive" size="sm" className="rounded-lg" onClick={() => {
                                    const newColors = [...formData.colors];
                                    newColors[idx].images.splice(imgIdx, 1);
                                    setFormData(prev => ({ ...prev, colors: newColors }));
                                  }}>حذف الصورة</Button>
                                )}
                              </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" className="w-full rounded-lg border-2 border-dashed border-pink-300 hover:bg-pink-50 hover:border-pink-500 transition" onClick={() => {
                              const newColors = [...formData.colors];
                              newColors[idx].images.push('');
                              setFormData(prev => ({ ...prev, colors: newColors }));
                            }}>
                              + إضافة صورة أخرى
                            </Button>
                          </div>

                          {/* المقاسات الخاصة باللون */}
                          <div className="mt-4 p-4 bg-white rounded-lg border-2 border-amber-200">
                            <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                              المقاسات المتاحة لهذا اللون
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {availableSizes.map(size => {
                                const colorSizes = c.sizes || [];
                                const sizeObj = colorSizes.find((s: any) => (typeof s === 'string' ? s : s.size) === size);
                                const isSelected = !!sizeObj;
                                
                                return (
                                  <button
                                    type="button"
                                    key={size}
                                    className={`px-4 py-2 rounded-lg border-2 font-bold transition-all ${
                                      isSelected 
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-md' 
                                        : 'bg-white text-stone-700 border-stone-300 hover:border-amber-300'
                                    }`}
                                    onClick={() => {
                                      const newColors = [...formData.colors];
                                      const colorSizes = newColors[idx].sizes || [];
                                      
                                      if (isSelected) {
                                        // إزالة المقاس
                                        newColors[idx].sizes = colorSizes.filter((s: any) => 
                                          (typeof s === 'string' ? s : s.size) !== size
                                        );
                                      } else {
                                        // إضافة المقاس
                                        newColors[idx].sizes = [...colorSizes, { size, available: true, outOfStock: false }];
                                      }
                                      
                                      setFormData(prev => ({ ...prev, colors: newColors }));
                                    }}
                                  >
                                    {size}
                                  </button>
                                );
                              })}
                            </div>

                            {/* عرض المقاسات المختارة مع حالتها */}
                            {(c.sizes || []).length > 0 && (
                              <div className="space-y-2 mt-3">
                                <p className="text-xs font-bold text-stone-600 uppercase">حالة المقاسات:</p>
                                {(c.sizes || []).map((sizeObj: any, sizeIdx: number) => {
                                  const size = typeof sizeObj === 'string' ? sizeObj : sizeObj.size;
                                  const available = typeof sizeObj === 'string' ? true : (sizeObj.available !== false);
                                  const outOfStock = typeof sizeObj === 'string' ? false : (sizeObj.outOfStock || false);
                                  
                                  return (
                                    <div key={sizeIdx} className="flex items-center gap-3 p-2 bg-stone-50 rounded-lg">
                                      <span className="font-bold text-sm min-w-[50px]">{size}</span>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          id={`color-${idx}-size-${sizeIdx}-available`}
                                          checked={available}
                                          onChange={e => {
                                            const newColors = [...formData.colors];
                                            const colorSizes = [...(newColors[idx].sizes || [])];
                                            if (typeof colorSizes[sizeIdx] === 'string') {
                                              colorSizes[sizeIdx] = { size: colorSizes[sizeIdx], available: e.target.checked, outOfStock: false };
                                            } else {
                                              colorSizes[sizeIdx] = { ...colorSizes[sizeIdx], available: e.target.checked };
                                              if (e.target.checked) {
                                                colorSizes[sizeIdx].outOfStock = false;
                                              }
                                            }
                                            newColors[idx].sizes = colorSizes;
                                            setFormData(prev => ({ ...prev, colors: newColors }));
                                          }}
                                          className="w-4 h-4 text-green-500 focus:ring-green-500"
                                        />
                                        <Label htmlFor={`color-${idx}-size-${sizeIdx}-available`} className="text-xs font-semibold cursor-pointer">متاح</Label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          id={`color-${idx}-size-${sizeIdx}-outofstock`}
                                          checked={outOfStock}
                                          onChange={e => {
                                            const newColors = [...formData.colors];
                                            const colorSizes = [...(newColors[idx].sizes || [])];
                                            if (typeof colorSizes[sizeIdx] === 'string') {
                                              colorSizes[sizeIdx] = { size: colorSizes[sizeIdx], available: !e.target.checked, outOfStock: e.target.checked };
                                            } else {
                                              colorSizes[sizeIdx] = { ...colorSizes[sizeIdx], outOfStock: e.target.checked };
                                              if (e.target.checked) {
                                                colorSizes[sizeIdx].available = false;
                                              }
                                            }
                                            newColors[idx].sizes = colorSizes;
                                            setFormData(prev => ({ ...prev, colors: newColors }));
                                          }}
                                          className="w-4 h-4 text-rose-500 focus:ring-rose-500"
                                        />
                                        <Label htmlFor={`color-${idx}-size-${sizeIdx}-outofstock`} className="text-xs font-semibold text-rose-600 cursor-pointer">خلص</Label>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" className="w-full rounded-lg border-2 border-dashed border-pink-400 hover:bg-gradient-to-r hover:from-pink-500 hover:to-rose-500 hover:text-white transition font-bold" onClick={() => setFormData(prev => ({ ...prev, colors: [...prev.colors, { color: '', images: [''], available: true, outOfStock: false, sizes: [] }] }))}>
                        + إضافة لون جديد
                      </Button>
                    </div>

                    {/* صور المقاسات (اختياري) */}
                    {formData.sizes.length > 0 && (
                      <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
                        <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                          صور المقاسات (اختياري)
                        </h3>
                        <p className="text-sm text-stone-600 mb-4 bg-pink-50 p-3 rounded-lg border border-pink-200">
                          💡 يمكنك إضافة صورة توضيحية لكل مقاس (مثال: صورة توضح الطول والعرض)
                        </p>
                        <div className="space-y-4">
                          {formData.sizes.map((size) => {
                            // البحث عن صور المقاس أو إنشاء كائن جديد
                            let si = formData.sizeImages.find(img => img.size === size);
                            if (!si) {
                              // إضافة المقاس للـ sizeImages إذا لم يكن موجود
                              si = { size, images: [''] };
                              setFormData(prev => ({
                                ...prev,
                                sizeImages: [...prev.sizeImages, si]
                              }));
                            }
                            
                            return (
                              <div key={size} className="bg-gradient-to-br from-white to-pink-50 border-2 border-pink-200 p-5 rounded-xl shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                  <span className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-sm rounded-lg shadow-md">{size}</span>
                                </div>

                                <div className="space-y-3">
                                  <Label className="text-xs font-bold text-pink-700 uppercase tracking-wider">صورة توضيحية للمقاس</Label>
                                  {si.images.map((img, imgIdx) => (
                                    <div key={imgIdx} className="bg-white border-2 border-pink-200 p-4 rounded-lg">
                                      <LocalImageUploader
                                        value={img}
                                        onChange={(url) => {
                                          setFormData(prev => {
                                            const newSizeImages = [...prev.sizeImages];
                                            const idx = newSizeImages.findIndex(imgObj => imgObj.size === size);
                                            if (idx >= 0) {
                                              newSizeImages[idx].images[imgIdx] = url;
                                            } else {
                                              newSizeImages.push({ size, images: [url] });
                                            }
                                            return { ...prev, sizeImages: newSizeImages };
                                          });
                                        }}
                                        maxSizeMB={MAX_IMAGE_SIZE_MB}
                                        allowUrl={true}
                                        placeholder={`رابط صورة المقاس ${size} (اختياري)`}
                                      />
                                      {si.images.length > 1 && (
                                        <Button type="button" variant="destructive" size="sm" className="w-full mt-2 rounded-lg" onClick={() => {
                                          setFormData(prev => {
                                            const newSizeImages = [...prev.sizeImages];
                                            const idx = newSizeImages.findIndex(imgObj => imgObj.size === size);
                                            if (idx >= 0) {
                                              newSizeImages[idx].images.splice(imgIdx, 1);
                                            }
                                            return { ...prev, sizeImages: newSizeImages };
                                          });
                                        }}>
                                          <Trash2 className="w-3 h-3 mr-1" />
                                          حذف الصورة
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  <Button type="button" variant="outline" size="sm" className="w-full rounded-lg border-2 border-dashed border-pink-300 hover:border-pink-500 hover:bg-pink-50 transition" onClick={() => {
                                    setFormData(prev => {
                                      const newSizeImages = [...prev.sizeImages];
                                      const idx = newSizeImages.findIndex(imgObj => imgObj.size === size);
                                      if (idx >= 0) {
                                        newSizeImages[idx].images.push('');
                                      } else {
                                        newSizeImages.push({ size, images: [''] });
                                      }
                                      return { ...prev, sizeImages: newSizeImages };
                                    });
                                  }}>
                                    <Plus className="w-4 h-4 mr-1" />
                                    إضافة صورة أخرى
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* الوصف والإعدادات */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
                      <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                        الوصف والإعدادات
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="description" className="text-stone-700 font-semibold mb-2 block">وصف المنتج</Label>
                          <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full border-2 border-stone-300 rounded-lg px-4 py-3 h-24 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition"
                            required
                            placeholder="اكتب وصف تفصيلي للمنتج..."
                          />
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-rose-50 rounded-lg border-2 border-rose-200">
                          <input
                            type="checkbox"
                            id="soldOut"
                            checked={formData.soldOut || false}
                            onChange={e => setFormData(prev => ({ ...prev, soldOut: e.target.checked }))}
                            className="w-5 h-5 text-rose-500 focus:ring-rose-500 rounded"
                          />
                          <Label htmlFor="soldOut" className="text-rose-700 font-bold cursor-pointer">نفد من المخزون (Sold Out)</Label>
                        </div>

                        <div>
                          <Label htmlFor="displayOrder" className="text-stone-700 font-semibold mb-2 block">ترتيب الظهور</Label>
                          <Input
                            id="displayOrder"
                            type="number"
                            min="0"
                            value={formData.displayOrder ?? ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: e.target.value ? parseInt(e.target.value) : undefined }))}
                            className="border-2 border-stone-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                            placeholder="أدخل رقم الترتيب"
                          />
                          <p className="text-xs text-stone-500 mt-2 bg-stone-50 p-2 rounded">💡 الرقم الأصغر يظهر أولاً (0 = أول منتج)</p>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-lg shadow-xl transform hover:scale-[1.02] transition-all">
                      ✨ إضافة المنتج
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-10 h-10 border-2 border-stone-100 border-t-stone-900 animate-spin rounded-full" />
                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-black">Refining View...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-12 md:gap-y-16">
                {products.map((product, idx) => (
                  <div key={product.id + '-' + idx} className="group">
                    <div className="relative aspect-[3/4] bg-stone-50 overflow-hidden rounded-sm mb-6 border border-stone-100">
                      <img
                        src={product.colors && product.colors.length > 0
                          ? ((product.colors[0] as any).images && (product.colors[0] as any).images.length > 0
                            ? (product.colors[0] as any).images[0]
                            : (product.colors[0] as any).image)
                          : product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                        <button
                          onClick={() => openEditModal(product)}
                          className="w-10 h-10 bg-white border border-stone-100 text-stone-900 flex items-center justify-center hover:bg-stone-50 transition shadow-xl"
                          title="Edit Piece"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="w-10 h-10 bg-white border border-stone-100 text-rose-900 flex items-center justify-center hover:bg-rose-50 transition shadow-xl"
                          title="Archive Piece"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start pt-1">
                        <div className="space-y-1">
                          <h3 className="text-xs font-playfair font-black text-stone-900 uppercase tracking-tight line-clamp-1">{product.name}</h3>
                          <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">{product.category}</p>
                        </div>
                        <span className="text-xs font-black text-stone-900">EGP {product.price}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 opacity-60">
                        {product.sizes.map(size => (
                          <span key={size} className="text-[8px] border border-stone-200 px-1.5 py-0.5 uppercase tracking-tighter text-stone-500 font-medium">{size}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-stone-50">
                <DialogHeader className="border-b-2 border-stone-200 pb-4">
                  <DialogTitle className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Edit className="w-5 h-5 text-white" />
                    </div>
                    تعديل المنتج
                  </DialogTitle>
                </DialogHeader>
                <DialogDescription className="text-stone-600 text-sm mt-2">
                  قم بتعديل بيانات المنتج أدناه ثم اضغط حفظ لتحديث المنتج
                </DialogDescription>
                <form onSubmit={handleEditProduct} className="space-y-6 mt-4">
                  <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-stone-200">
                    <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      المعلومات الأساسية
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-name" className="text-stone-700 font-semibold mb-2 block">اسم المنتج</Label>
                        <Input
                          id="edit-name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          required
                          className="border-stone-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-price" className="text-stone-700 font-semibold mb-2 block">السعر (جنيه)</Label>
                        <Input
                          id="edit-price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                          required
                          className="border-stone-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-stone-200">
                    <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      التصنيف
                    </h3>
                    <div>
                      <Label htmlFor="edit-category" className="text-stone-700 font-semibold mb-2 block">اختر التصنيف</Label>
                      <div className="flex gap-2 items-center">
                        <select
                          id="edit-category"
                          value={showNewCategoryInput ? '+new' : formData.category}
                          onChange={e => {
                            if (e.target.value === '+new') {
                              setShowNewCategoryInput(true);
                              setNewCategory('');
                            } else {
                              setShowNewCategoryInput(false);
                              setFormData(prev => ({ ...prev, category: e.target.value as string }));
                            }
                          }}
                          className="w-full border-2 border-stone-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                        >
                          {categoryOptions.map((opt, idx) => (
                            <option key={opt + '-' + idx} value={opt}>{opt}</option>
                          ))}
                          <option value="+new">+ إضافة تصنيف جديد</option>
                        </select>
                        {!showNewCategoryInput && formData.category && !editingCategory && (
                          <button
                            type="button"
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition text-sm font-semibold shadow-md"
                            onClick={() => {
                              setEditingCategory(true);
                              setEditedCategory(formData.category);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {showNewCategoryInput && (
                        <div className="flex gap-2 mt-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                          <input
                            type="text"
                            className="flex-1 border-2 border-blue-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholder="ادخل اسم التصنيف الجديد"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                          />
                          <button
                            type="button"
                            className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold hover:from-blue-600 hover:to-indigo-600 transition shadow-md"
                            onClick={() => {
                              if (['Men', 'Women', 'Kids'].includes(newCategory)) {
                                setFormData(prev => ({ ...prev, category: newCategory as any }));
                                setShowNewCategoryInput(false);
                              }
                            }}
                          >
                            حفظ
                          </button>
                        </div>
                      )}
                      {editingCategory && (
                        <div className="flex gap-2 mt-3 p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                          <input
                            type="text"
                            className="flex-1 border-2 border-amber-300 rounded-lg px-4 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                            value={editedCategory}
                            onChange={e => setEditedCategory(e.target.value)}
                          />
                          <button
                            type="button"
                            className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold hover:from-blue-600 hover:to-indigo-600 transition shadow-md"
                            onClick={async () => {
                              if (['Men', 'Women', 'Kids'].includes(editedCategory) && editedCategory !== formData.category) {
                                // Replace old category with new in options
                                const oldCategory = formData.category;
                                const idx = categoryOptions.indexOf(oldCategory);
                                if (idx !== -1) categoryOptions[idx] = editedCategory;
                                setFormData(prev => ({ ...prev, category: editedCategory as any }));
                                setEditingCategory(false);
                                // Update all products in Firestore with oldCategory
                                try {
                                  const q = query(collection(db, 'products'), where('category', '==', oldCategory));
                                  const snapshot = await getDocs(q);
                                  const batch = [];
                                  snapshot.forEach(docSnap => {
                                    batch.push(updateDoc(doc(db, 'products', docSnap.id), { category: editedCategory as any }));
                                  });
                                  await Promise.all(batch);
                                } catch (err) {
                                  console.error('Error updating category in products:', err);
                                }
                              } else {
                                setEditingCategory(false);
                              }
                            }}
                          >
                            حفظ
                          </button>
                          <button
                            type="button"
                            className="px-6 py-2 rounded-lg bg-stone-200 text-stone-700 hover:bg-stone-300 transition font-semibold"
                            onClick={() => setEditingCategory(false)}
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-stone-900 mb-4 block">الألوان المتاحة</Label>
                    {formData.colors.map((c, idx) => (
                      <div key={idx} className="bg-gradient-to-br from-white to-stone-50 border-2 border-stone-200 p-5 rounded-xl mb-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                          <Input
                            placeholder="اسم اللون (مثال: أحمر)"
                            value={c.color}
                            onChange={e => {
                              const newColors = [...formData.colors];
                              newColors[idx].color = e.target.value;
                              setFormData(prev => ({ ...prev, colors: newColors }));
                            }}
                            className="flex-1 border-stone-300 focus:border-pink-500 font-semibold"
                          />
                          {formData.colors.length > 1 && (
                            <Button type="button" variant="destructive" size="sm" className="rounded-lg shadow-md" onClick={() => {
                              setFormData(prev => ({ ...prev, colors: prev.colors.filter((_, i) => i !== idx) }));
                            }}>
                              <Trash2 className="w-4 h-4 mr-1" />
                              حذف اللون
                            </Button>
                          )}
                        </div>

                        {/* حالة اللون */}
                        <div className="flex items-center gap-4 mb-4 p-3 bg-white rounded-lg border border-stone-200">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`edit-color-available-${idx}`}
                              checked={c.available !== false}
                              onChange={e => {
                                const newColors = [...formData.colors];
                                newColors[idx].available = e.target.checked;
                                if (e.target.checked) {
                                  newColors[idx].outOfStock = false;
                                }
                                setFormData(prev => ({ ...prev, colors: newColors }));
                              }}
                              className="w-5 h-5 text-green-500 focus:ring-green-500 rounded"
                            />
                            <Label htmlFor={`edit-color-available-${idx}`} className="text-sm font-bold text-green-700 cursor-pointer">✓ متاح</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`edit-color-outofstock-${idx}`}
                              checked={c.outOfStock || false}
                              onChange={e => {
                                const newColors = [...formData.colors];
                                newColors[idx].outOfStock = e.target.checked;
                                if (e.target.checked) {
                                  newColors[idx].available = false;
                                }
                                setFormData(prev => ({ ...prev, colors: newColors }));
                              }}
                              className="w-5 h-5 text-rose-500 focus:ring-rose-500 rounded"
                            />
                            <Label htmlFor={`edit-color-outofstock-${idx}`} className="text-sm font-bold text-rose-700 cursor-pointer">✗ نفذ من المخزون</Label>
                          </div>
                        </div>

                        {/* صور اللون */}
                        <div className="space-y-3">
                          <Label className="text-xs font-bold text-stone-600 uppercase tracking-wider">صور اللون</Label>
                          {(c.images || []).map((img, imgIdx) => (
                            <div key={imgIdx} className="bg-white border-2 border-stone-200 p-4 rounded-lg">
                              <LocalImageUploader
                                value={img}
                                onChange={(url) => {
                                  const newColors = [...formData.colors];
                                  newColors[idx].images[imgIdx] = url;
                                  setFormData(prev => ({ ...prev, colors: newColors }));
                                }}
                                maxSizeMB={MAX_IMAGE_SIZE_MB}
                                allowUrl={true}
                                placeholder="رابط صورة اللون أو ارفع صورة"
                              />
                              {c.images.length > 1 && (
                                <Button type="button" variant="destructive" size="sm" className="w-full mt-2 rounded-lg" onClick={() => {
                                  const newColors = [...formData.colors];
                                  newColors[idx].images.splice(imgIdx, 1);
                                  setFormData(prev => ({ ...prev, colors: newColors }));
                                }}>
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  حذف الصورة
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" className="w-full rounded-lg border-2 border-dashed border-stone-300 hover:border-pink-400 hover:bg-pink-50 transition" onClick={() => {
                            const newColors = [...formData.colors];
                            newColors[idx].images.push('');
                            setFormData(prev => ({ ...prev, colors: newColors }));
                          }}>
                            <Plus className="w-4 h-4 mr-1" />
                            إضافة صورة أخرى
                          </Button>
                        </div>

                        {/* المقاسات الخاصة باللون */}
                        <div className="mt-4 p-4 bg-white rounded-lg border-2 border-amber-200">
                          <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                            المقاسات المتاحة لهذا اللون
                          </h4>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {availableSizes.map(size => {
                              const colorSizes = c.sizes || [];
                              const sizeObj = colorSizes.find((s: any) => (typeof s === 'string' ? s : s.size) === size);
                              const isSelected = !!sizeObj;
                              
                              return (
                                <button
                                  type="button"
                                  key={size}
                                  className={`px-4 py-2 rounded-lg border-2 font-bold transition-all ${
                                    isSelected 
                                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-md' 
                                      : 'bg-white text-stone-700 border-stone-300 hover:border-amber-300'
                                  }`}
                                  onClick={() => {
                                    const newColors = [...formData.colors];
                                    const colorSizes = newColors[idx].sizes || [];
                                    
                                    if (isSelected) {
                                      // إزالة المقاس
                                      newColors[idx].sizes = colorSizes.filter((s: any) => 
                                        (typeof s === 'string' ? s : s.size) !== size
                                      );
                                    } else {
                                      // إضافة المقاس
                                      newColors[idx].sizes = [...colorSizes, { size, available: true, outOfStock: false }];
                                    }
                                    
                                    setFormData(prev => ({ ...prev, colors: newColors }));
                                  }}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>

                          {/* عرض المقاسات المختارة مع حالتها */}
                          {(c.sizes || []).length > 0 && (
                            <div className="space-y-2 mt-3">
                              <p className="text-xs font-bold text-stone-600 uppercase">حالة المقاسات:</p>
                              {(c.sizes || []).map((sizeObj: any, sizeIdx: number) => {
                                const size = typeof sizeObj === 'string' ? sizeObj : sizeObj.size;
                                const available = typeof sizeObj === 'string' ? true : (sizeObj.available !== false);
                                const outOfStock = typeof sizeObj === 'string' ? false : (sizeObj.outOfStock || false);
                                
                                return (
                                  <div key={sizeIdx} className="flex items-center gap-3 p-2 bg-stone-50 rounded-lg">
                                    <span className="font-bold text-sm min-w-[50px]">{size}</span>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id={`edit-color-${idx}-size-${sizeIdx}-available`}
                                        checked={available}
                                        onChange={e => {
                                          const newColors = [...formData.colors];
                                          const colorSizes = [...(newColors[idx].sizes || [])];
                                          if (typeof colorSizes[sizeIdx] === 'string') {
                                            colorSizes[sizeIdx] = { size: colorSizes[sizeIdx], available: e.target.checked, outOfStock: false };
                                          } else {
                                            colorSizes[sizeIdx] = { ...colorSizes[sizeIdx], available: e.target.checked };
                                            if (e.target.checked) {
                                              colorSizes[sizeIdx].outOfStock = false;
                                            }
                                          }
                                          newColors[idx].sizes = colorSizes;
                                          setFormData(prev => ({ ...prev, colors: newColors }));
                                        }}
                                        className="w-4 h-4 text-green-500 focus:ring-green-500"
                                      />
                                      <Label htmlFor={`edit-color-${idx}-size-${sizeIdx}-available`} className="text-xs font-semibold cursor-pointer">متاح</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id={`edit-color-${idx}-size-${sizeIdx}-outofstock`}
                                        checked={outOfStock}
                                        onChange={e => {
                                          const newColors = [...formData.colors];
                                          const colorSizes = [...(newColors[idx].sizes || [])];
                                          if (typeof colorSizes[sizeIdx] === 'string') {
                                            colorSizes[sizeIdx] = { size: colorSizes[sizeIdx], available: !e.target.checked, outOfStock: e.target.checked };
                                          } else {
                                            colorSizes[sizeIdx] = { ...colorSizes[sizeIdx], outOfStock: e.target.checked };
                                            if (e.target.checked) {
                                              colorSizes[sizeIdx].available = false;
                                            }
                                          }
                                          newColors[idx].sizes = colorSizes;
                                          setFormData(prev => ({ ...prev, colors: newColors }));
                                        }}
                                        className="w-4 h-4 text-rose-500 focus:ring-rose-500"
                                      />
                                      <Label htmlFor={`edit-color-${idx}-size-${sizeIdx}-outofstock`} className="text-xs font-semibold text-rose-600 cursor-pointer">خلص</Label>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="w-full rounded-lg border-2 border-dashed border-pink-400 hover:bg-gradient-to-r hover:from-pink-500 hover:to-rose-500 hover:text-white transition font-bold shadow-md" onClick={() => setFormData(prev => ({ ...prev, colors: [...prev.colors, { color: '', images: [''], available: true, outOfStock: false, sizes: [] }] }))}>
                      <Plus className="w-5 h-5 mr-2" />
                      إضافة لون جديد
                    </Button>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-stone-200">
                    <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      المقاسات المتاحة
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {availableSizes.map((size, idx) => (
                        <button
                          key={size + '-' + idx}
                          type="button"
                          onClick={() => handleSizeToggle(size)}
                          className={`px-6 py-3 rounded-xl border-2 font-bold transition-all transform hover:scale-105 shadow-md ${
                            formData.sizes.includes(size) 
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-500 shadow-lg' 
                              : 'bg-white text-stone-700 border-stone-300 hover:border-blue-300'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* صور كل مقاس */}
                  {formData.sizes.length > 0 && (
                    <div className="mb-4">
                      <Label className="block mb-4 font-bold text-stone-900 text-sm">صور وحالة كل مقاس</Label>
                      <div className="space-y-4">
                        {formData.sizes.map((size) => {
                          const si = formData.sizeImages.find(img => img.size === size) || { size, images: [''] };
                          const sizeAvail = formData.sizesAvailability?.find(sa => sa.size === size);
                          const isAvailable = sizeAvail ? sizeAvail.available : true;
                          const isOutOfStock = sizeAvail?.outOfStock || false;
                          
                          return (
                            <div key={size} className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 p-5 rounded-xl shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <span className="px-4 py-2 bg-blue-600 text-white font-black text-sm rounded-lg shadow-md">{size}</span>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border-2 border-green-200">
                                      <input
                                        type="checkbox"
                                        id={`edit-size-available-${size}`}
                                        checked={isAvailable}
                                        onChange={e => {
                                          setFormData(prev => {
                                            const newAvail = prev.sizesAvailability || prev.sizes.map(s => ({ size: s, available: true, outOfStock: false }));
                                            const idx = newAvail.findIndex(sa => sa.size === size);
                                            if (idx >= 0) {
                                              newAvail[idx].available = e.target.checked;
                                              if (e.target.checked) newAvail[idx].outOfStock = false;
                                            } else {
                                              newAvail.push({ size, available: e.target.checked, outOfStock: false });
                                            }
                                            return { ...prev, sizesAvailability: newAvail };
                                          });
                                        }}
                                        className="w-5 h-5 text-green-500 focus:ring-green-500 rounded"
                                      />
                                      <Label htmlFor={`edit-size-available-${size}`} className="text-sm font-bold text-green-700 cursor-pointer">✓ متاح</Label>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border-2 border-rose-200">
                                      <input
                                        type="checkbox"
                                        id={`edit-size-outofstock-${size}`}
                                        checked={isOutOfStock}
                                        onChange={e => {
                                          setFormData(prev => {
                                            const newAvail = prev.sizesAvailability || prev.sizes.map(s => ({ size: s, available: true, outOfStock: false }));
                                            const idx = newAvail.findIndex(sa => sa.size === size);
                                            if (idx >= 0) {
                                              newAvail[idx].outOfStock = e.target.checked;
                                              if (e.target.checked) newAvail[idx].available = false;
                                            } else {
                                              newAvail.push({ size, available: !e.target.checked, outOfStock: e.target.checked });
                                            }
                                            return { ...prev, sizesAvailability: newAvail };
                                          });
                                        }}
                                        className="w-5 h-5 text-rose-500 focus:ring-rose-500 rounded"
                                      />
                                      <Label htmlFor={`edit-size-outofstock-${size}`} className="text-sm font-bold text-rose-700 cursor-pointer">✗ نفذ</Label>
                                    </div>
                                  </div>
                                </div>
                                <Button type="button" variant="destructive" size="sm" className="rounded-lg shadow-md" onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    sizes: prev.sizes.filter(s => s !== size),
                                    sizeImages: prev.sizeImages.filter(img => img.size !== size),
                                    sizesAvailability: prev.sizesAvailability?.filter(sa => sa.size !== size)
                                  }));
                                }}>
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  حذف المقاس
                                </Button>
                              </div>

                              <div className="space-y-3">
                                <Label className="text-xs font-bold text-blue-700 uppercase tracking-wider">صور المقاس</Label>
                                {si.images.map((img, imgIdx) => (
                                  <div key={imgIdx} className="bg-white border-2 border-blue-200 p-4 rounded-lg">
                                    <LocalImageUploader
                                      value={img}
                                      onChange={(url) => {
                                        const newSizeImages = prev => prev.sizeImages.map(imgObj =>
                                          imgObj.size === size
                                            ? { ...imgObj, images: imgObj.images.map((im, i) => i === imgIdx ? url : im) }
                                            : imgObj
                                        );
                                        setFormData(prev => ({ ...prev, sizeImages: newSizeImages(prev) }));
                                      }}
                                      maxSizeMB={MAX_IMAGE_SIZE_MB}
                                      allowUrl={true}
                                      placeholder={`صورة المقاس (${size}) أو ارفع صورة`}
                                    />
                                    {si.images.length > 1 && (
                                      <Button type="button" variant="destructive" size="sm" className="w-full mt-2 rounded-lg" onClick={() => {
                                        const newSizeImages = prev => prev.sizeImages.map(imgObj =>
                                          imgObj.size === size
                                            ? { ...imgObj, images: imgObj.images.filter((_, i) => i !== imgIdx) }
                                            : imgObj
                                        );
                                        setFormData(prev => ({ ...prev, sizeImages: newSizeImages(prev) }));
                                      }}>
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        حذف الصورة
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" className="w-full rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition" onClick={() => {
                                  const newSizeImages = prev => prev.sizeImages.map(imgObj =>
                                    imgObj.size === size
                                      ? { ...imgObj, images: [...imgObj.images, ''] }
                                      : imgObj
                                  );
                                  setFormData(prev => ({ ...prev, sizeImages: newSizeImages(prev) }));
                                }}>
                                  <Plus className="w-4 h-4 mr-1" />
                                  إضافة صورة أخرى
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-stone-200">
                    <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      الوصف والإعدادات
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-description" className="text-stone-700 font-semibold mb-2 block">وصف المنتج</Label>
                        <textarea
                          id="edit-description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full border-2 border-stone-300 rounded-lg px-4 py-3 h-24 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                          required
                          placeholder="اكتب وصف تفصيلي للمنتج..."
                        />
                      </div>

                      <div className="flex items-center gap-4 p-4 bg-rose-50 rounded-lg border-2 border-rose-200">
                        <input
                          type="checkbox"
                          id="edit-soldOut"
                          checked={formData.soldOut || false}
                          onChange={e => setFormData(prev => ({ ...prev, soldOut: e.target.checked }))}
                          className="w-5 h-5 text-rose-500 focus:ring-rose-500 rounded"
                        />
                        <Label htmlFor="edit-soldOut" className="text-rose-700 font-bold cursor-pointer">نفد من المخزون (Sold Out)</Label>
                      </div>

                      <div>
                        <Label htmlFor="edit-displayOrder" className="text-stone-700 font-semibold mb-2 block">ترتيب الظهور</Label>
                        <Input
                          id="edit-displayOrder"
                          type="number"
                          min="0"
                          value={formData.displayOrder ?? ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: e.target.value ? parseInt(e.target.value) : undefined }))}
                          className="border-2 border-stone-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder="أدخل رقم الترتيب"
                        />
                        <p className="text-xs text-stone-500 mt-2 bg-stone-50 p-2 rounded">💡 الرقم الأصغر يظهر أولاً (0 = أول منتج)</p>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-lg shadow-xl transform hover:scale-[1.02] transition-all">
                    💾 حفظ التعديلات
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
        {activeTab === 'offers' && (
          <div>
            <div className="flex flex-col lg:flex-row items-start justify-between mb-8 md:mb-12 gap-8">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-playfair font-black text-stone-900 uppercase">Curation</h2>
                <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-stone-400 font-bold">Manage limited time offers</p>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-end w-full lg:w-auto bg-white p-4 md:p-6 border border-stone-100 shadow-sm">
                <div className="grid grid-cols-4 gap-2 md:gap-4 w-full md:w-auto">
                  {[
                    { label: 'Days', key: 'days', max: 99 },
                    { label: 'Hrs', key: 'hours', max: 23 },
                    { label: 'Min', key: 'minutes', max: 59 },
                    { label: 'Sec', key: 'seconds', max: 59 }
                  ].map(unit => (
                    <div key={unit.key} className="space-y-1.5 md:space-y-2">
                      <Label className="text-[7px] md:text-[8px] uppercase tracking-widest text-stone-400 font-black text-center block">{unit.label}</Label>
                      <input
                        type="number"
                        min="0"
                        max={unit.max}
                        className="w-full h-8 md:h-10 border border-stone-100 bg-stone-50 text-center text-[10px] md:text-xs font-bold focus:border-stone-900 outline-none transition"
                        value={globalOfferTime[unit.key as keyof typeof globalOfferTime]}
                        onChange={e => setGlobalOfferTime(t => ({ ...t, [unit.key]: +e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 md:gap-4 w-full md:w-auto">
                  <Button
                    variant="outline"
                    className="flex-1 md:w-32 h-8 md:h-10 border-stone-200 rounded-none uppercase tracking-widest text-[8px] md:text-[9px] font-black hover:bg-stone-900 hover:text-white transition-all shadow-md"
                    onClick={handleSetGlobalOfferTimer}
                  >
                    Sync Timer
                  </Button>
                  <Dialog open={isAddOfferOpen} onOpenChange={setIsAddOfferOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1 md:w-32 h-8 md:h-10 bg-stone-950 text-white rounded-none uppercase tracking-widest text-[8px] md:text-[9px] font-black hover:bg-stone-800 transition-all shadow-md">
                        Add Offer
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="font-playfair font-black uppercase tracking-widest text-xl">Create Special Offer</DialogTitle>
                      </DialogHeader>
                      <DialogDescription className="text-xs uppercase tracking-widest text-stone-400">
                        {globalOfferEndTime 
                          ? `Timer is set. Offers will expire at ${new Date(globalOfferEndTime).toLocaleString()}`
                          : 'Set timer above first, then add offers'}
                      </DialogDescription>
                      <div className="flex mb-8 gap-1 pt-4">
                        {['existing', 'new'].map(tab => (
                          <button
                            key={tab}
                            className={`flex-1 py-3 text-[10px] uppercase tracking-[0.2em] font-black transition-all border ${offerTab === tab
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-white text-stone-400 border-stone-100 hover:bg-stone-50'
                              }`}
                            onClick={() => setOfferTab(tab as any)}
                          >
                            {tab === 'existing' ? 'Library Piece' : 'New Creation'}
                          </button>
                        ))}
                      </div>

                      {offerTab === 'existing' && (
                        <form className="space-y-6" onSubmit={async (e) => {
                          e.preventDefault();
                          if (!selectedProductId) {
                            toast({
                              title: 'Please select a product',
                              variant: 'destructive',
                            });
                            return;
                          }
                          if (!offerDiscount || Number(offerDiscount) <= 0) {
                            toast({
                              title: 'Please enter a valid discount percentage',
                              variant: 'destructive',
                            });
                            return;
                          }
                          
                          // حساب وقت انتهاء العرض تلقائياً إذا لم يكن موجود
                          let endTime = globalOfferEndTime;
                          if (!endTime) {
                            const totalMs = (globalOfferTime.days * 24 * 60 * 60 + globalOfferTime.hours * 60 * 60 + globalOfferTime.minutes * 60 + globalOfferTime.seconds) * 1000;
                            if (totalMs > 0) {
                              endTime = Date.now() + totalMs;
                              setGlobalOfferEndTime(endTime);
                            }
                          }
                          
                          try {
                            await updateDoc(doc(db, 'products', selectedProductId), {
                              offer: true,
                              offerDiscount: Number(offerDiscount),
                              offerEndTime: endTime
                            });
                            toast({
                              title: 'Offer added successfully',
                            });
                            setIsAddOfferOpen(false);
                            setSelectedProductId('');
                            setOfferDiscount('');
                          } catch (err) {
                            console.error('Error saving offer:', err);
                            toast({
                              title: 'Error adding offer',
                              variant: 'destructive',
                            });
                          }
                        }}>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest font-black text-stone-400">Select Piece</Label>
                            <select
                              className="w-full h-12 border border-stone-100 px-4 text-sm focus:border-stone-900 outline-none transition"
                              value={selectedProductId}
                              onChange={e => setSelectedProductId(e.target.value)}
                            >
                              <option value="">Choose from collections...</option>
                              {Array.from(productsByCategory.entries() as IterableIterator<[string, Product[]]>)
                                .filter(([category]) => !!category)
                                .map(([category, prods], idx) => (
                                  <optgroup key={String(category) + '-' + idx} label={String(category).toUpperCase()} className="text-[10px] font-black tracking-widest">
                                    {prods.map((product, idx) => (
                                      <option key={product.id + '-' + idx} value={product.id}>{product.name}</option>
                                    ))}
                                  </optgroup>
                                ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest font-black text-stone-400">Discount Percentage</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              className="rounded-none border-stone-100 h-12 focus:border-stone-900"
                              value={offerDiscount}
                              onChange={e => setOfferDiscount(e.target.value)}
                              placeholder="e.g. 15"
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full h-12 bg-stone-950 text-white rounded-none uppercase tracking-[0.3em] text-xs font-black shadow-xl"
                          >
                            Lock Offer
                          </Button>
                        </form>
                      )}

                      {offerTab === 'new' && (
                        <form onSubmit={handleAddNewOfferProduct} className="space-y-6">
                          {/* Simplified for brevity while keeping logic */}
                          <p className="text-[10px] uppercase tracking-widest text-stone-400 italic text-center">Refer to Inventory to add complex pieces first for best results.</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase tracking-widest font-black text-stone-400">Name</Label>
                              <Input
                                value={newOfferForm.name}
                                onChange={e => setNewOfferForm(prev => ({ ...prev, name: e.target.value }))}
                                className="rounded-none border-stone-100 h-12"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase tracking-widest font-black text-stone-400">Price (EGP)</Label>
                              <Input
                                type="number"
                                value={newOfferForm.price}
                                onChange={e => setNewOfferForm(prev => ({ ...prev, price: e.target.value }))}
                                className="rounded-none border-stone-100 h-12"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest font-black text-stone-400">Image URL</Label>
                            <Input
                              value={newOfferForm.image}
                              onChange={e => setNewOfferForm(prev => ({ ...prev, image: e.target.value }))}
                              className="rounded-none border-stone-100 h-12"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest font-black text-stone-400">Discount (%)</Label>
                            <Input
                              type="number"
                              value={newOfferForm.offerDiscount}
                              onChange={e => setNewOfferForm(prev => ({ ...prev, offerDiscount: e.target.value }))}
                              className="rounded-none border-stone-100 h-12"
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full h-12 bg-stone-950 text-white rounded-none uppercase tracking-[0.3em] text-xs font-black"
                          >
                            Create & Launch
                          </Button>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex justify-between items-center border-b border-stone-100 pb-4 mb-8 md:mb-12">
                <h3 className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] font-black text-stone-900">Live Curation</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[7px] md:text-[8px] uppercase tracking-widest"
                    onClick={async () => {
                      // عرض كل المنتجات اللي عليها offer=true
                      const allOffers = products.filter(p => p.offer === true);
                      const expiredOffers = allOffers.filter(p => p.offerEndTime && p.offerEndTime < Date.now());
                      const activeOffers = allOffers.filter(p => !p.offerEndTime || p.offerEndTime > Date.now());
                      
                      console.log('=== OFFERS DEBUG ===');
                      console.log('Total offers:', allOffers.length);
                      console.log('Active offers:', activeOffers.length);
                      console.log('Expired offers:', expiredOffers.length);
                      console.log('Current time:', Date.now(), new Date().toLocaleString());
                      
                      if (expiredOffers.length > 0) {
                        console.log('\n=== EXPIRED OFFERS ===');
                        expiredOffers.forEach(p => {
                          console.log(`${p.name}:`, {
                            offerEndTime: p.offerEndTime,
                            endDate: p.offerEndTime ? new Date(p.offerEndTime).toLocaleString() : 'N/A',
                            expired: p.offerEndTime ? (Date.now() - p.offerEndTime) / 1000 / 60 : 0,
                            discount: p.offerDiscount
                          });
                        });
                      }
                      
                      if (activeOffers.length > 0) {
                        console.log('\n=== ACTIVE OFFERS ===');
                        activeOffers.forEach(p => {
                          console.log(`${p.name}:`, {
                            offerEndTime: p.offerEndTime,
                            endDate: p.offerEndTime ? new Date(p.offerEndTime).toLocaleString() : 'No expiry',
                            discount: p.offerDiscount
                          });
                        });
                      }
                      
                      toast({
                        title: `Found ${allOffers.length} offers`,
                        description: `${activeOffers.length} active, ${expiredOffers.length} expired. Check console.`,
                      });
                    }}
                  >
                    Debug Offers
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-[7px] md:text-[8px] uppercase tracking-widest bg-rose-600 hover:bg-rose-700"
                    onClick={async () => {
                      const expiredOffers = products.filter(p => p.offer === true && p.offerEndTime && p.offerEndTime < Date.now());
                      
                      if (expiredOffers.length === 0) {
                        toast({
                          title: 'No expired offers found',
                        });
                        return;
                      }
                      
                      if (!confirm(`Extend ${expiredOffers.length} expired offers by 7 days?`)) return;
                      
                      const newEndTime = Date.now() + (7 * 24 * 60 * 60 * 1000);
                      
                      try {
                        await Promise.all(
                          expiredOffers.map(p => 
                            updateDoc(doc(db, 'products', p.id), { offerEndTime: newEndTime })
                          )
                        );
                        toast({
                          title: 'Offers extended successfully',
                          description: `${expiredOffers.length} offers extended to ${new Date(newEndTime).toLocaleDateString()}`,
                        });
                      } catch (err) {
                        console.error('Error extending offers:', err);
                        toast({
                          title: 'Error extending offers',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    Extend Expired
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-[7px] md:text-[8px] uppercase tracking-widest bg-red-600 hover:bg-red-700"
                    onClick={async () => {
                      const allOffers = products.filter(p => p.offer === true || p.offerDiscount || p.offerEndTime);
                      
                      if (allOffers.length === 0) {
                        toast({
                          title: 'No offers to clear',
                        });
                        return;
                      }
                      
                      const confirmMsg = `⚠️ WARNING ⚠️\n\nThis will PERMANENTLY remove ALL offers from ${allOffers.length} products:\n- Remove offer flag\n- Remove discount percentage\n- Remove end time\n\nAre you absolutely sure?`;
                      
                      if (!confirm(confirmMsg)) return;
                      
                      // تأكيد مرة ثانية
                      if (!confirm('Last chance! This cannot be undone. Continue?')) return;
                      
                      try {
                        await Promise.all(
                          allOffers.map(p => 
                            updateDoc(doc(db, 'products', p.id), {
                              offer: false,
                              offerDiscount: 0,
                              offerEndTime: null
                            })
                          )
                        );
                        
                        // مسح التايمر العام
                        setGlobalOfferTime({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                        setGlobalOfferEndTime(null);
                        
                        toast({
                          title: 'All offers cleared successfully',
                          description: `Removed offers from ${allOffers.length} products`,
                        });
                      } catch (err) {
                        console.error('Error clearing offers:', err);
                        toast({
                          title: 'Error clearing offers',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    Clear All Offers
                  </Button>
                </div>
              </div>
              {offerProducts.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-stone-200 space-y-4">
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-stone-300 font-bold italic">No active offers circulating currently.</p>
                  <p className="text-[8px] text-stone-400">Products need offer=true, offerDiscount, and valid offerEndTime</p>
                  <p className="text-[8px] text-rose-400">Click "Debug Offers" to see expired offers</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                  {offerProducts.map((product, idx) => {
                    const hasDiscount = product.offerDiscount && product.offerDiscount > 0;
                    const newPrice = hasDiscount ? Math.round(product.price * (1 - product.offerDiscount / 100)) : product.price;
                    return (
                      <div key={product.id + '-' + idx} className="group border border-stone-100 bg-white shadow-sm overflow-hidden">
                        <div className="relative aspect-[4/5] overflow-hidden">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700" />
                          <div className="absolute top-2 md:top-4 left-2 md:left-4 bg-stone-900 text-white text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 md:px-3 py-1 md:py-1.5 shadow-xl">
                            -{product.offerDiscount}%
                          </div>
                        </div>
                        <div className="p-3 md:p-6 space-y-3 md:space-y-4">
                          <div className="text-center space-y-1">
                            <h4 className="text-[10px] md:text-xs font-playfair font-black text-stone-900 uppercase tracking-widest line-clamp-1">{product.name}</h4>
                            <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3">
                              <span className="text-stone-300 line-through text-[8px] md:text-[10px]">EGP {product.price}</span>
                              <span className="text-stone-900 font-black text-[10px] md:text-xs italic">EGP {newPrice}</span>
                            </div>
                          </div>

                          <div className="pt-3 md:pt-4 border-t border-stone-50 flex flex-col items-center gap-2 md:gap-3">
                            <span className="text-[7px] md:text-[8px] uppercase tracking-widest text-stone-400 font-bold italic">
                              {product.offerEndTime ? new Date(product.offerEndTime).toLocaleDateString() : 'Continuous'}
                            </span>
                            <div className="flex w-full gap-1 md:gap-2">
                              <button
                                onClick={() => {
                                  setEditOfferProduct(product);
                                  setEditOfferDiscount(product.offerDiscount || 0);
                                  setEditOfferOpen(true);
                                }}
                                className="flex-1 h-7 md:h-9 border border-stone-100 text-stone-900 text-[7px] md:text-[9px] uppercase tracking-widest font-black hover:bg-stone-50 transition"
                              >
                                Adjust
                              </button>
                              <button
                                onClick={async () => {
                                  await updateDoc(doc(db, 'products', product.id), { offer: false, offerDiscount: 0, offerEndTime: null });
                                }}
                                className="flex-1 h-7 md:h-9 border border-stone-100 text-rose-800 text-[7px] md:text-[9px] uppercase tracking-widest font-black hover:bg-rose-50 transition"
                              >
                                End
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-8 md:space-y-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 md:p-8 border border-stone-100 shadow-sm mb-8 md:mb-12 gap-6 w-full">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-playfair font-black text-stone-900 uppercase">Registry</h2>
                <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-stone-400 font-bold">Monitor recent acquisitions</p>
              </div>
              <Button
                variant="outline"
                onClick={resetWeeklyOrders}
                disabled={orders.length === 0}
                className="rounded-none border-stone-200 text-rose-900 hover:bg-rose-50 text-[9px] md:text-[10px] uppercase tracking-widest font-bold h-10 px-6 w-full sm:w-auto"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Reset Records
              </Button>
            </div>
            <div className="space-y-12">
              <div className="space-y-1">
                <h2 className="text-3xl font-playfair font-black text-stone-900 uppercase">Registry</h2>
                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Monitor recent acquisitions</p>
              </div>

              {ordersLoading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <div className="w-10 h-10 border-2 border-stone-100 border-t-stone-900 animate-spin rounded-full" />
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-black">Scanning Records...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-stone-200">
                  <p className="text-[10px] uppercase tracking-widest text-stone-300 font-bold">No orders recorded in the registry.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                  {orders.map((order: any, idx) => (
                    <div key={order.id || idx} className="bg-white border border-stone-100 shadow-sm overflow-hidden">
                      <div className="p-4 md:p-6 border-b border-stone-50 flex flex-wrap justify-between items-center gap-4">
                        <div className="space-y-1">
                          <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-stone-400 font-black">Order Reference</span>
                          <h4 className="text-[10px] md:text-xs font-bold text-stone-900">#{order.id?.slice(-8).toUpperCase() || (idx + 1)}</h4>
                        </div>
                        <div className="flex items-center gap-3 md:gap-4">
                          <select
                            className={`text-[8px] md:text-[9px] uppercase tracking-widest font-black px-2 md:px-4 py-1.5 md:py-2 border transition-colors outline-none h-8 md:h-10 ${order.status === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                              order.status === 'confirmed' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                                order.status === 'delivered' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                  'bg-rose-50 border-rose-100 text-rose-700'
                              }`}
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <span className="text-[8px] md:text-[9px] uppercase tracking-widest text-stone-400 font-bold whitespace-nowrap">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h5 className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] font-black text-stone-900 pb-2 border-b border-stone-50">Client Intelligence</h5>
                          <div className="space-y-2 text-[10px] md:text-xs">
                            <div className="flex justify-between">
                              <span className="text-stone-400 uppercase tracking-tighter text-[8px] md:text-[9px]">Name</span>
                              <span className="font-bold text-stone-900">{order.customerInfo.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-400 uppercase tracking-tighter text-[8px] md:text-[9px]">Phone</span>
                              <span className="font-bold text-stone-900">{order.customerInfo.phone}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-400 uppercase tracking-tighter text-[8px] md:text-[9px]">Location</span>
                              <span className="font-bold text-stone-900 line-clamp-1">{order.customerInfo.governorate}</span>
                            </div>
                            <p className="mt-2 p-2 bg-stone-50 border border-stone-100 text-[9px] md:text-[10px] text-stone-600 leading-relaxed italic">
                              {order.customerInfo.address} - {order.customerInfo.center}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h5 className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] font-black text-stone-900 pb-2 border-b border-stone-50">Manifest</h5>
                          <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                            {order.items.map((item: any, itemIdx: number) => (
                              <div key={itemIdx} className="flex justify-between items-start text-[9px] md:text-[10px]">
                                <div className="space-y-0.5">
                                  <p className="font-black text-stone-900 uppercase tracking-tight line-clamp-1">{item.name}</p>
                                  <p className="text-stone-400 font-medium">QTY: {item.quantity} | {item.size} | {item.color}</p>
                                </div>
                                <span className="font-bold text-stone-900">EGP {item.totalPrice}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-3 md:pt-4 border-t border-stone-50 space-y-1">
                            <div className="flex justify-between text-[8px] md:text-[9px] uppercase tracking-widest text-stone-400">
                              <span>Delivery</span>
                              <span>EGP {order.totals.deliveryPrice}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-stone-900">Total</span>
                              <span className="text-xs md:text-sm font-black text-stone-950">EGP {order.totals.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 md:p-8 border border-stone-100 shadow-sm mb-8 gap-6">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-playfair font-black text-stone-900 uppercase">Policies</h2>
                <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-stone-400 font-bold">Manage store policies</p>
              </div>
              <Button
                onClick={savePolicies}
                className="rounded-none bg-stone-900 text-white hover:bg-stone-800 text-[9px] md:text-[10px] uppercase tracking-widest font-bold h-10 px-6 w-full sm:w-auto"
              >
                Save Policies
              </Button>
            </div>

            {policiesLoading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-10 h-10 border-2 border-stone-100 border-t-stone-900 animate-spin rounded-full" />
                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-black">Loading...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Return Policy */}
                <div className="bg-white border border-stone-100 p-6 md:p-8">
                  <Label className="text-sm uppercase tracking-widest font-black text-stone-900 mb-4 block">
                    سياسة الاسترجاع والاستبدال (Return & Exchange Policy)
                  </Label>
                  <textarea
                    value={returnPolicy}
                    onChange={(e) => setReturnPolicy(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-4 py-3 h-64 text-sm leading-relaxed focus:outline-none focus:border-stone-900"
                    placeholder="اكتب سياسة الاسترجاع والاستبدال هنا..."
                  />
                  <p className="text-xs text-stone-500 mt-2">ستظهر هذه السياسة في الفوتر وصفحة السلة</p>
                </div>

                {/* Shipping Policy */}
                <div className="bg-white border border-stone-100 p-6 md:p-8">
                  <Label className="text-sm uppercase tracking-widest font-black text-stone-900 mb-4 block">
                    سياسة الشحن (Shipping Policy)
                  </Label>
                  <textarea
                    value={shippingPolicy}
                    onChange={(e) => setShippingPolicy(e.target.value)}
                    className="w-full border border-stone-300 rounded-md px-4 py-3 h-64 text-sm leading-relaxed focus:outline-none focus:border-stone-900"
                    placeholder="اكتب سياسة الشحن هنا..."
                  />
                  <p className="text-xs text-stone-500 mt-2">ستظهر هذه السياسة في الفوتر</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-stone-900">{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-600 whitespace-pre-line text-base">
              {confirmDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-lg">إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDialog.onConfirm}
              className="rounded-lg bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;


