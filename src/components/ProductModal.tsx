import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, isOpen, onClose }) => {
  // All hooks must be before any return
  const [quantity, setQuantity] = useState(1);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['']);
  const { addItem } = useCart();
  const quantityRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // إعداد الصور: صور الألوان أولاً فقط، بدون صور المقاسات في البداية
  const colorImages = (product?.colors || []).flatMap(c => (Array.isArray((c as any).images) ? (c as any).images : (c as any).image ? [(c as any).image] : [])).filter(Boolean);
  const colorNames = (product?.colors || []).map(c => c.color).filter(Boolean);
  const sizeImages = (product?.sizeImages || []).flatMap(si => (Array.isArray((si as any).images) ? (si as any).images : (si as any).image ? [(si as any).image] : [])).filter(Boolean);

  // إضافة الصورة الرئيسية للمنتج كبديل إذا لم تكن موجودة في الألوان
  const mainImage = product?.image && !colorImages.includes(product.image) ? [product.image] : [];

  // دمج الصور - صور الألوان أولاً، ثم الصورة الرئيسية فقط (بدون صور المقاسات)
  const images = [...colorImages, ...mainImage].filter((img, index, arr) => arr.indexOf(img) === index);

  // تحديد الفهرس المناسب عند اختيار لون أو مقاس
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);
  const [selectedSizeIdx, setSelectedSizeIdx] = useState<number | null>(null);

  // إزالة منطق colorImagesState بالكامل
  // عند تغيير اللون، فقط غير مؤشر الصورة الرئيسية (imgIdx) ليشير لأول صورة من صور اللون المختار في الصور الجانبية (images)
  useEffect(() => {
    if (selectedColorIdx !== null && product?.colors && product.colors[selectedColorIdx]) {
      const colorObj = product.colors[selectedColorIdx];
      let imgs: string[] = [];
      if (Array.isArray((colorObj as any).images)) {
        imgs = (colorObj as any).images.filter(Boolean);
      } else if ((colorObj as any).image) {
        imgs = [(colorObj as any).image];
      }
      // ابحث عن أول صورة لهذا اللون في مصفوفة images الجانبية
      if (imgs.length > 0) {
        const idx = images.indexOf(imgs[0]);
        if (idx !== -1) setImgIdx(idx);
      }
    }
  }, [selectedColorIdx, product?.id]);

  // عند اختيار مقاس: انتقل لصورة المقاس إن وجدت
  useEffect(() => {
    if (selectedSizes[0]) {
      const sizeImg = (product?.sizeImages || []).find(si => si.size === selectedSizes[0] && si.image);
      if (sizeImg) {
        const idx = images.indexOf(sizeImg.image);
        if (idx !== -1) setImgIdx(idx);
      }
    }
  }, [selectedSizes]);

  // عند تغيير المنتج، ابدأ دائماً بأول صورة من الألوان
  useEffect(() => {
    if (product && isOpen) {
      // ابدأ دائماً بالصورة الأولى (التي ستكون من الألوان)
      setImgIdx(0);

      // اختر أول لون إذا كان متوفر
      if (colorImages.length > 0) {
        setSelectedColorIdx(0);
      } else {
        setSelectedColorIdx(null);
      }

      setSelectedSizeIdx(null);

      // لو المنتج فيه مقاس واحد فقط، اختاره تلقائيًا
      if (product?.sizes && product.sizes.length === 1) {
        setSelectedSizes([product.sizes[0]]);
      } else {
        setSelectedSizes(['']);
      }
      setQuantity(1);
    }
  }, [product?.id, isOpen]);

  // الصورة المعروضة حاليًا - تأكد من وجود صور وأن المؤشر صحيح
  const displayImage = (() => {
    // إذا تم اختيار مقاس أو الكاروسيل وصل لصور المقاسات، اعرض صورة المقاس
    if (selectedSizeIdx !== null && product?.sizeImages && product.sizeImages[selectedSizeIdx]) {
      const sizeObj = product.sizeImages[selectedSizeIdx];
      const sizeImages = Array.isArray((sizeObj as any).images)
        ? (sizeObj as any).images
        : (sizeObj as any).image
          ? [(sizeObj as any).image]
          : [];
      return sizeImages[0] || images[0];
    }

    // إذا كان imgIdx = -1، هذا يعني أننا في وضع عرض صور المقاسات
    if (imgIdx === -1 && sizeImages.length > 0) {
      return sizeImages[0];
    }

    // وإلا اعرض الصورة من array الصور الرئيسي (الألوان + الصورة الرئيسية)
    return images.length > 0 ? images[Math.max(0, Math.min(imgIdx, images.length - 1))] : product?.image;
  })();

  useEffect(() => {
    setSelectedSizes((prev) => {
      if (quantity > prev.length) {
        return [...prev, ...Array(quantity - prev.length).fill('')];
      } else if (quantity < prev.length) {
        return prev.slice(0, quantity);
      }
      return prev;
    });
  }, [quantity]);

  // Carousel effect: automatic slideshow للألوان ثم المقاسات - DISABLED
  // المستخدم يتحكم في الصور يدوياً فقط
  /*
  useEffect(() => {
    // لا تشغل الكاروسيل إذا كان المستخدم اختار مقاس محدد
    if (selectedSizeIdx !== null || !isOpen) return;

    const interval = setInterval(() => {
      setImgIdx(prev => {
        const nextIndex = prev + 1;

        // إذا وصلنا لآخر صورة من الألوان
        if (nextIndex >= images.length) {
          // إذا كان هناك صور مقاسات، اعرض أول صورة مقاس
          if (sizeImages.length > 0) {
            setSelectedSizeIdx(0); // اختر أول مقاس
            return -1; // فهرس خاص لصور المقاسات
          } else {
            // إذا لم تكن هناك صور مقاسات، ارجع للصورة الأولى
            return 0;
          }
        }

        return nextIndex;
      });
    }, 2000); // كل 2 ثانية

    return () => clearInterval(interval);
  }, [images.length, sizeImages.length, selectedSizeIdx, isOpen]);
  */

  // عند اختيار مقاس، أوقف الكاروسيل واعرض صورة المقاس
  useEffect(() => {
    if (selectedSizeIdx !== null) {
      setImgIdx(-1); // استخدم فهرس خاص لصور المقاسات
    }
  }, [selectedSizeIdx]);

  // When a size is selected, show size image
  useEffect(() => {
    if (selectedSizes[0] && product?.image) {
      setSelectedSizeIdx(null); // Reset color selection when size is selected
    } else {
      setSelectedSizeIdx(null);
    }
  }, [selectedSizes, product?.image]);

  if (!isOpen || !product) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the user clicks directly on the backdrop, not on the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleAddToCart = () => {
    if (selectedSizes.some(size => !size)) {
      return;
    }
    // حساب السعر النهائي (مع الخصم إن وجد)
    const finalPrice = product.offerDiscount && product.offerDiscount > 0
      ? Math.round(product.price * (1 - product.offerDiscount / 100))
      : product.price;

    selectedSizes.forEach((size) => {
      addItem({
        id: product.id,
        name: product.name,
        price: finalPrice,
        size,
        image: product.image,
        category: product.category,
        type: product.type,
        color: selectedColorIdx !== null ? colorNames[selectedColorIdx] : undefined
      }, 1);
    });
    onClose();
    setSelectedSizes(['']);
    setQuantity(1);
    // تم حذف navigate('/cart') بناءً على طلب المستخدم
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-none w-full max-w-xs sm:max-w-lg md:max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-4 sm:p-6 border-b border-stone-200 bg-stone-50">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-stone-900 uppercase tracking-tight">
              {product.name}
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm mt-1 uppercase tracking-widest">
              {product.category} {product.type && `• ${product.type}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-900 transition-colors ml-4"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-3 sm:p-6">
          {/* الصور */}
          <div className="flex flex-col items-center">
            {/* Main Image + Carousel */}
            <div ref={quantityRef} className="w-full flex flex-col items-center justify-center mb-4">
              <div className="aspect-square w-full max-w-xs mx-auto overflow-hidden rounded-lg flex items-center justify-center bg-white border border-stone-200 shadow-md" style={{ margin: '0 auto' }}>
                {images.length > 0 && (
                  <div className="relative w-full h-full flex items-center justify-center" style={{ minHeight: 280, minWidth: 280 }}>
                    <img
                      src={displayImage || images[0]}
                      alt={product.name}
                      className="w-full h-full object-contain bg-white rounded-lg max-h-80 max-w-80 mx-auto"
                      style={{ aspectRatio: '1/1', background: '#fff', display: 'block', margin: '0 auto' }}
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow-sm hover:text-rose-900 transition-colors"
                          style={{ transform: 'translateY(-50%)' }}
                          onClick={e => { e.stopPropagation(); setImgIdx((imgIdx - 1 + images.length) % images.length); }}
                          aria-label="Previous image"
                        >
                          &#8592;
                        </button>
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow-sm hover:text-rose-900 transition-colors"
                          style={{ transform: 'translateY(-50%)' }}
                          onClick={e => { e.stopPropagation(); setImgIdx((imgIdx + 1) % images.length); }}
                          aria-label="Next image"
                        >
                          &#8594;
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* عرض صور الألوان في grid أفقي */}
              {product.colors && product.colors.length > 0 && (
                <div className="mt-6 w-full border-t border-stone-100 pt-6">
                  <div className="text-center text-xs uppercase tracking-widest font-bold text-stone-900 mb-4">صور الألوان المتاحة</div>
                  <div className="flex flex-wrap gap-3 justify-center max-w-md mx-auto">
                    {product.colors.map((colorObj, colorIdx) => {
                      const colorImages = Array.isArray((colorObj as any).images)
                        ? (colorObj as any).images
                        : (colorObj as any).image
                          ? [(colorObj as any).image]
                          : [];

                      return colorImages.map((img: string, imgIdx: number) => (
                        <div
                          key={`${colorObj.color}-${imgIdx}`}
                          className={`cursor-pointer transition-all duration-200 ${
                            selectedColorIdx === colorIdx ? 'ring-2 ring-stone-900 ring-offset-2' : ''
                          }`}
                          onClick={() => {
                            setSelectedColorIdx(colorIdx);
                            setSelectedSizeIdx(null); // إلغاء اختيار المقاس
                            // انتقل لهذه الصورة في العرض الرئيسي
                            const imgIndex = images.indexOf(img);
                            if (imgIndex !== -1) setImgIdx(imgIndex);
                          }}
                        >
                          <img
                            src={img}
                            alt={`${product.name} - ${colorObj.color}`}
                            className="w-20 h-20 object-cover border border-stone-200 hover:border-stone-900 transition-all"
                          />
                        </div>
                      ));
                    })}
                  </div>
                </div>
              )}

              {/* عرض صور المقاسات المتاحة في grid أفقي */}
              {product.sizeImages && product.sizeImages.length > 0 && (
                <div className="mt-6 w-full border-t border-stone-100 pt-6">
                  <div className="text-center text-xs uppercase tracking-widest font-bold text-stone-900 mb-4">صور المقاس المتاح</div>
                  <div className="flex flex-wrap gap-3 justify-center max-w-md mx-auto">
                    {product.sizeImages.map((sizeObj, sizeIdx) => {
                      const sizeImages = Array.isArray((sizeObj as any).images)
                        ? (sizeObj as any).images
                        : (sizeObj as any).image
                          ? [(sizeObj as any).image]
                          : [];

                      // فلترة الصور الفارغة أو غير الصحيحة
                      const validImages = sizeImages.filter((img: string) => img && img.trim() !== '');

                      // إذا لم تكن هناك صور صحيحة، لا تعرض شيء
                      if (validImages.length === 0) return null;

                      return validImages.map((img: string, imgIdx: number) => (
                        <div
                          key={`${sizeObj.size}-${imgIdx}`}
                          className={`cursor-pointer transition-all duration-200 flex flex-col items-center gap-2 ${
                            selectedSizeIdx === sizeIdx ? 'ring-2 ring-stone-900 ring-offset-2' : ''
                          }`}
                          onClick={() => {
                            setSelectedSizeIdx(sizeIdx);
                            // عرض صورة المقاس مباشرة في الصورة الرئيسية
                            setImgIdx(-1); // استخدم فهرس خاص لصور المقاسات
                            // إيقاف الكاروسيل التلقائي عند اختيار مقاس
                          }}
                        >
                          <img
                            src={img}
                            alt={`${product.name} - ${sizeObj.size}`}
                            className="w-20 h-20 object-cover border border-stone-200 hover:border-stone-900 transition-all"
                          />
                          <span className="text-xs uppercase tracking-wider font-bold text-stone-700">
                            {sizeObj.size}
                          </span>
                        </div>
                      ));
                    })}
                  </div>
                </div>
              )}

              {/* الألوان */}
              {product.colors && product.colors.length === 1 && (
                <div className="flex gap-3 mt-6 mb-2 items-center flex-wrap justify-center w-full mx-auto text-center">
                  <span className="text-sm">اللون:</span>
                  <span className={`px-4 py-2 rounded-lg border text-base font-semibold mx-1 ${
                    product.colors[0].outOfStock 
                      ? 'bg-stone-100 text-stone-400 border-stone-200 line-through' 
                      : 'bg-pink-600 text-white border-pink-600'
                  }`}>
                    {product.colors[0].color} {product.colors[0].outOfStock && '(نفذ من المخزون)'}
                  </span>
                </div>
              )}
              {product.colors && product.colors.length > 1 && (
                <div className="flex gap-3 mt-6 mb-2 items-center flex-wrap justify-center w-full mx-auto text-center">
                  <span className="text-sm">اللون:</span>
                  {product.colors.map((colorObj, idx) => {
                    const isAvailable = colorObj.available !== false;
                    const isOutOfStock = colorObj.outOfStock || false;
                    const isDisabled = !isAvailable || isOutOfStock;
                    
                    return (
                      <button
                        key={colorObj.color}
                        onClick={() => !isDisabled && setSelectedColorIdx(idx)}
                        disabled={isDisabled}
                        className={`px-4 py-2 rounded-sm border text-xs uppercase tracking-widest font-bold mx-1 transition-all duration-150 focus:outline-none ${
                          isDisabled
                            ? 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed line-through' 
                            : selectedColorIdx === idx 
                              ? 'bg-stone-900 text-white border-stone-900' 
                              : 'border-stone-100 bg-white text-stone-400 hover:border-stone-300'
                        }`}
                      >
                        {colorObj.color} {isOutOfStock ? '(نفذ من المخزون)' : !isAvailable ? '(غير متاح)' : ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {/* Details Section */}
          <div className="space-y-6 px-4 sm:px-6 py-6">
            {/* Price */}
            <div className="text-center border-b border-stone-100 pb-6">
              {product.offerDiscount && product.offerDiscount > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-stone-400 line-through text-base sm:text-lg">EGP {product.price}</span>
                    <span className="text-stone-900 text-2xl sm:text-3xl font-black">EGP {Math.round(product.price * (1 - product.offerDiscount / 100))}</span>
                  </div>
                  <span className="inline-block bg-rose-500 text-white text-xs font-black px-3 py-1 uppercase tracking-wide">
                    -{product.offerDiscount}% OFF
                  </span>
                </div>
              ) : (
                <p className="text-2xl sm:text-3xl font-black text-stone-900">EGP {product.price}</p>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-stone-600 text-sm sm:text-base text-center leading-relaxed">{product.description}</p>
            )}

            {/* Size Selection */}
            <div className="space-y-4">
              <label className="block text-sm uppercase tracking-widest font-black text-stone-900 text-center">Size</label>
              {product.sizes.length === 1 ? (
                <div className="flex justify-center">
                  <span className="px-8 py-4 bg-stone-900 text-white font-black text-base uppercase tracking-wider shadow-lg">
                    {product.sizes[0]}
                  </span>
                </div>
              ) : quantity === 1 ? (
                <div className="flex flex-wrap gap-3 justify-center">
                  {product.sizes.map((size) => {
                    const sizeAvail = product.sizesAvailability?.find(sa => sa.size === size);
                    const isAvailable = sizeAvail ? sizeAvail.available : true;
                    const isOutOfStock = sizeAvail?.outOfStock || false;
                    const isDisabled = !isAvailable || isOutOfStock;
                    
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          if (!isDisabled) {
                            setSelectedSizes([size]);
                            setTimeout(() => {
                              quantityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 50);
                          }
                        }}
                        disabled={isDisabled}
                        className={`px-8 py-4 text-base font-black uppercase tracking-widest transition-all border-2 ${
                          isDisabled
                            ? 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed line-through'
                            : selectedSizes[0] === size 
                              ? 'bg-stone-900 text-white border-stone-900 shadow-lg scale-105' 
                              : 'bg-white text-stone-700 border-stone-300 hover:border-stone-900 hover:bg-stone-50'
                        }`}
                      >
                        {size} {isOutOfStock ? '(نفذ من المخزون)' : !isAvailable ? '(غير متاح)' : ''}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from({ length: quantity }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-3 justify-center">
                      <span className="text-sm text-stone-700 uppercase tracking-wider w-24 font-bold">Piece {idx + 1}:</span>
                      <select
                        className="border-2 border-stone-300 px-4 py-3 text-base font-bold bg-white focus:outline-none focus:border-stone-900 uppercase"
                        value={selectedSizes[idx] || ''}
                        onChange={e => {
                          const newSizes = [...selectedSizes];
                          newSizes[idx] = e.target.value;
                          setSelectedSizes(newSizes);
                        }}
                      >
                        <option value="">Select size</option>
                        {product.sizes.map((size, sizeIdx) => {
                          const sizeAvail = product.sizesAvailability?.find(sa => sa.size === size);
                          const isAvailable = sizeAvail ? sizeAvail.available : true;
                          const isOutOfStock = sizeAvail?.outOfStock || false;
                          const isDisabled = !isAvailable || isOutOfStock;
                          
                          return (
                            <option key={size + '-' + sizeIdx} value={size} disabled={isDisabled}>
                              {size} {isOutOfStock ? '(نفذ من المخزون)' : !isAvailable ? '(غير متاح)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div ref={quantityRef} className="space-y-3">
              <label className="block text-xs uppercase tracking-widest font-bold text-stone-900 text-center">Quantity</label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center border border-stone-300 hover:bg-stone-50 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-xl w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center border border-stone-300 hover:bg-stone-50 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 sm:px-6 pb-6 space-y-3">
            {product.soldOut ? (
              <>
                <button
                  className="w-full bg-stone-200 text-stone-500 font-bold py-4 uppercase tracking-widest text-sm cursor-not-allowed"
                  disabled
                >
                  Sold Out
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-stone-900 text-white font-bold py-4 hover:bg-stone-800 transition uppercase tracking-widest text-sm"
                >
                  Close
                </button>
                <div className="text-center text-rose-500 font-medium text-sm uppercase tracking-wide mt-3">
                  Available in the coming days
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-stone-900 text-white font-bold py-4 hover:bg-stone-800 transition uppercase tracking-widest text-sm disabled:bg-stone-300 disabled:cursor-not-allowed"
                  disabled={
                    product.soldOut ||
                    (product.colors.length > 1 && selectedColorIdx === null) ||
                    (product.sizes.length > 1 && selectedSizes.some(size => !size)) ||
                    // تعطيل إذا كان اللون المختار نفذ من المخزون
                    (selectedColorIdx !== null && product.colors[selectedColorIdx]?.outOfStock) ||
                    // تعطيل إذا كان أي مقاس مختار نفذ من المخزون
                    selectedSizes.some(size => {
                      const sizeAvail = product.sizesAvailability?.find(sa => sa.size === size);
                      return sizeAvail?.outOfStock || false;
                    })
                  }
                >
                  Add to Shopping Bag
                </button>
                <button
                  onClick={onClose}
                  className="w-full border-2 border-stone-900 text-stone-900 font-bold py-4 hover:bg-stone-50 transition uppercase tracking-widest text-sm"
                >
                  Continue Shopping
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;

