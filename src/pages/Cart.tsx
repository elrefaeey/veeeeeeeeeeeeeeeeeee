import React, { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProducts } from '@/hooks/useProducts';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EGYPT_GOVS } from '../lib/egyptGovs';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const Cart = () => {
  const { items, updateQuantity, removeItem, getTotalPrice, clearCart, addItem } = useCart();
  const { products } = useProducts();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    address: '',
    phone: '',
    governorate: '',
    center: '',
    additionalPhone: '',
  });
  const [returnPolicy, setReturnPolicy] = useState('');

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const policiesDoc = await getDoc(doc(db, 'settings', 'policies'));
        if (policiesDoc.exists()) {
          const data = policiesDoc.data();
          setReturnPolicy(data.returnPolicy || '');
        }
      } catch (error) {
        console.error('Error fetching policies:', error);
      }
    };
    fetchPolicies();
  }, []);

  const getGovernorateDisplayName = (gov: string): string => {
    if (!gov) return '-';
    if (gov.length > 20) {
      const firstAnd = gov.indexOf(' و');
      const firstComma = gov.indexOf('،');
      let firstSeparator = -1;
      if (firstAnd > 0 && firstComma > 0) {
        firstSeparator = Math.min(firstAnd, firstComma);
      } else if (firstAnd > 0) {
        firstSeparator = firstAnd;
      } else if (firstComma > 0) {
        firstSeparator = firstComma;
      }
      if (firstSeparator > 3 && firstSeparator < 25) {
        return gov.substring(0, firstSeparator).trim();
      }
      return gov.substring(0, 20).trim();
    }
    return gov.trim();
  };

  const handlePlaceOrder = async () => {
    if (!customerInfo.name || !customerInfo.address || !customerInfo.phone) {
      alert('يرجى ملء جميع البيانات المطلوبة');
      return;
    }
    if (items.length === 0) {
      alert('السلة فارغة');
      return;
    }

    const validItems = items.filter(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) return false;
      if (product.sizes && product.sizes.length > 0) {
        return product.sizes.includes(item.size);
      }
      return true;
    });

    if (validItems.length === 0) {
      alert('يرجى التحقق من المنتجات في السلة. بعض المنتجات غير صالحة.');
      return;
    }

    const validGovernorate = customerInfo.governorate && Object.keys(EGYPT_GOVS).includes(customerInfo.governorate)
      ? getGovernorateDisplayName(customerInfo.governorate)
      : '-';

    const validCenter = customerInfo.governorate && customerInfo.center
      ? (EGYPT_GOVS[customerInfo.governorate]?.some(c => c.name === customerInfo.center)
        ? customerInfo.center
        : '-')
      : '-';

    function getNumberEmoji(num: number): string {
      const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      return numberEmojis[num - 1] || `${num}️⃣`;
    }

    // توليد رقم طلب عشوائي
    const orderNumber = Math.floor(Math.random() * 9000) + 1000;

    const orderDetailsArr = [
      '📦 طلب جديد - VEE',
      `🔖 رقم الطلب: #${orderNumber}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━',
      '👤 بيانات العميل:',
      '━━━━━━━━━━━━━━━━━━━━',
      `الاسم: ${customerInfo.name || '-'}`,
      `📞 الهاتف: ${customerInfo.phone || '-'}`,
      customerInfo.additionalPhone ? `📞 رقم إضافي: ${customerInfo.additionalPhone}` : '',
      `📍 العنوان: ${customerInfo.address || '-'}، ${validCenter}، ${validGovernorate}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━',
      '🛍️ تفاصيل الطلب:',
      '━━━━━━━━━━━━━━━━━━━━',
      '',
      ...validItems.map((item, idx) => {
        const product = products.find(p => p.id === item.id);
        const finalPrice = product?.offerDiscount && product.offerDiscount > 0
          ? Math.round(product.price * (1 - product.offerDiscount / 100))
          : item.price;

        return [
          `${getNumberEmoji(idx + 1)} ${item.name}`,
          `   🎨 اللون: ${item.color || '-'} | 📏 المقاس: ${item.size}`,
          `   💵 ${finalPrice * item.quantity} جنيه`,
          ''
        ];
      }).flat(),
      '━━━━━━━━━━━━━━━━━━━━',
      '💰 ملخص الفاتورة:',
      '━━━━━━━━━━━━━━━━━━━━',
      `المنتجات: ${getTotalPrice().toFixed(0)} جنيه`,
      deliveryPrice ? `🚚 التوصيل: ${deliveryPrice} جنيه` : '',
      `💳 الإجمالي: ${(getTotalPrice() + (deliveryPrice || 0)).toFixed(0)} جنيه`,
      '',
      '━━━━━━━━━━━━━━━━━━━━',
      '⚠️ لتأكيد طلبك:',
      '━━━━━━━━━━━━━━━━━━━━',
      deliveryPrice ? `يرجى تحويل رسوم التوصيل (${deliveryPrice} جنيه) عبر:` : 'يرجى التواصل لتأكيد الطلب:',
      '💳 إنستا باي / فودافون كاش',
      '📱 01007361231',
      '',
      '📅 التوصيل المتوقع: 2-7 أيام عمل',
      '✨ شكراً لثقتك في VEE'
    ];

    const message = orderDetailsArr.filter(Boolean).join('\n');
    const whatsappUrl = `https://wa.me/+201559839407?text=${encodeURIComponent(message)}`;

    try {
      await addDoc(collection(db, 'orders'), {
        customerInfo: { ...customerInfo, governorate: validGovernorate, center: validCenter },
        items: validItems,
        totals: { subtotal: getTotalPrice(), deliveryPrice: deliveryPrice || 0, total: getTotalPrice() + (deliveryPrice || 0) },
        orderDate: new Date().toISOString(),
        status: 'pending'
      });
    } catch (error) {
      console.error('Error saving order:', error);
    }

    window.open(whatsappUrl, '_blank');
    clearCart();
    setCustomerInfo({ name: '', address: '', phone: '', governorate: '', center: '', additionalPhone: '' });
  };

  const selectedCenterObj = EGYPT_GOVS[customerInfo.governorate]?.find(c => c.name === customerInfo.center);
  const deliveryPrice = selectedCenterObj ? selectedCenterObj.price : null;

  return (
    <div className="min-h-screen bg-white py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-playfair font-black text-stone-900 uppercase tracking-tight">حقيبة التسوق</h1>
          <p className="text-stone-400 text-sm mt-2 uppercase tracking-widest font-medium">راجع اختياراتك</p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white py-24 px-8 text-center border border-stone-100 rounded-sm">
            <ShoppingBag className="w-12 h-12 text-stone-200 mx-auto mb-6" />
            <p className="text-stone-500 font-sans text-lg mb-8">حقيبة التسوق فارغة حالياً</p>
            <Button
              onClick={() => window.location.href = '/products'}
              className="bg-stone-900 text-white hover:bg-stone-800 rounded-none px-8 py-6 uppercase tracking-widest text-xs font-bold"
            >
              تصفح المجموعة
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 space-y-6">
              {items.map((item, idx) => {
                const product = products.find(p => p.id === item.id);
                return (
                  <div key={`${item.id}-${item.size}-${idx}`} className="bg-white p-6 md:p-8 flex flex-col md:flex-row gap-6 border border-stone-100 rounded-sm hover:shadow-md transition-shadow">
                    <div className="w-full md:w-32 aspect-[3/4] bg-stone-50 overflow-hidden rounded-sm">
                      <img
                        src={item.image || '/placeholder.svg'}
                        alt={item.name}
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-playfair font-bold text-stone-900 uppercase tracking-tight">{item.name}</h3>
                          <p className="text-stone-400 text-[10px] uppercase tracking-widest font-bold mt-1">
                            {item.category} • {item.color || 'Default Color'}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id, item.size, item.color)}
                          className="text-stone-300 hover:text-rose-900 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-4 items-center pt-2">
                        <div className="flex items-center border border-stone-100 px-3 py-1">
                          <button onClick={() => updateQuantity(item.id, item.size, item.quantity - 1, item.color)} className="p-1 text-stone-400 hover:text-stone-900"><Minus className="w-3 h-3" /></button>
                          <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.size, item.quantity + 1, item.color)} className="p-1 text-stone-400 hover:text-stone-900"><Plus className="w-3 h-3" /></button>
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-3 py-2 bg-stone-50">
                          Size: {item.size}
                        </div>
                      </div>

                      <div className="pt-2">
                        <p className="text-lg font-bold text-stone-900">EGP {item.price * item.quantity}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-5">
              <div className="bg-white p-8 border border-stone-100 sticky top-28 rounded-sm">
                <h2 className="text-xl font-playfair font-black text-stone-900 uppercase tracking-widest mb-8 border-b border-stone-100 pb-4">إتمام الطلب</h2>

                <div className="space-y-6 mb-10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-400 uppercase tracking-widest font-medium">المجموع الفرعي</span>
                    <span className="text-stone-900 font-bold">{getTotalPrice().toFixed(2)} جنيه</span>
                  </div>
                  {deliveryPrice && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-400 uppercase tracking-widest font-medium">التوصيل</span>
                      <span className="text-stone-900 font-bold">{deliveryPrice} جنيه</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-6 border-t border-stone-100">
                    <span className="text-stone-900 uppercase tracking-[0.2em] font-black text-xs">الإجمالي</span>
                    <span className="text-2xl font-black text-stone-900">{(getTotalPrice() + (deliveryPrice || 0)).toFixed(2)} جنيه</span>
                  </div>
                </div>

                <form className="space-y-6">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">الاسم بالكامل</Label>
                    <Input
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="rounded-none border-stone-100 focus:border-stone-900 transition h-12 text-sm"
                      placeholder="أدخل اسمك الكامل"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">رقم الهاتف</Label>
                      <Input
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="rounded-none border-stone-100 focus:border-stone-900 transition h-12 text-sm"
                        placeholder="01xxxxxxxxx"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">المحافظة</Label>
                      <select
                        className="w-full h-12 border border-stone-100 px-4 text-xs font-medium focus:outline-none focus:border-stone-900"
                        value={customerInfo.governorate}
                        onChange={e => setCustomerInfo(prev => ({ ...prev, governorate: e.target.value, center: '' }))}
                      >
                        <option value="">اختر المحافظة</option>
                        {Object.keys(EGYPT_GOVS).map(gov => <option key={gov} value={gov}>{gov}</option>)}
                      </select>
                    </div>
                  </div>
                  {customerInfo.governorate && (
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">المركز / المنطقة</Label>
                      <select
                        className="w-full h-12 border border-stone-100 px-4 text-xs font-medium focus:outline-none focus:border-stone-900"
                        value={customerInfo.center}
                        onChange={e => setCustomerInfo(prev => ({ ...prev, center: e.target.value }))}
                      >
                        <option value="">اختر المنطقة</option>
                        {EGYPT_GOVS[customerInfo.governorate]?.map(center => <option key={center.name} value={center.name}>{center.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">عنوان الشحن</Label>
                    <Input
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="الشارع، المبنى، الشقة"
                      className="rounded-none border-stone-100 focus:border-stone-900 transition h-12 text-sm"
                    />
                  </div>

                  <div className="p-4 bg-stone-50 border border-stone-100 text-[10px] text-stone-500 uppercase tracking-widest leading-relaxed text-center">
                    يرجى إرسال رسوم التوصيل عبر إنستاباي / فودافون كاش على: <span className="font-bold text-stone-900">01007361231</span> لتأكيد طلبك.
                  </div>

                  {/* سياسة الاسترجاع والاستبدال */}
                  {returnPolicy && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="w-full text-xs text-stone-500 hover:text-stone-900 transition-colors underline text-center py-2">
                          اطلع على سياسة الاسترجاع والاستبدال
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="font-playfair text-2xl">سياسة الاسترجاع والاستبدال</DialogTitle>
                          <DialogDescription className="text-stone-600 text-sm pt-4 leading-relaxed whitespace-pre-wrap">
                            {returnPolicy}
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  )}

                  <Button
                    type="button"
                    onClick={handlePlaceOrder}
                    className="w-full py-8 text-xs font-black rounded-none bg-stone-950 hover:bg-stone-800 transition uppercase tracking-[0.3em] flex items-center justify-center gap-2"
                  >
                    تأكيد الطلب <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
