import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Save, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ProductsOrder = () => {
  const navigate = useNavigate();
  const { products, loading } = useProducts();
  const [orderedProducts, setOrderedProducts] = useState(products);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setOrderedProducts(products);
  }, [products]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedProducts];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    setOrderedProducts(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === orderedProducts.length - 1) return;
    const newOrder = [...orderedProducts];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrderedProducts(newOrder);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const updates = orderedProducts.map((product, index) =>
        updateDoc(doc(db, 'products', product.id), { displayOrder: index + 1 })
      );
      await Promise.all(updates);
      toast({
        title: '✅ تم حفظ الترتيب بنجاح',
        description: 'تم تحديث ترتيب المنتجات',
      });
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: 'خطأ في حفظ الترتيب',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 mx-auto mb-4"></div>
          <p className="text-stone-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 py-6 px-4 md:px-8 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin')}
              className="rounded-none border-stone-200"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              رجوع
            </Button>
            <div>
              <h1 className="text-2xl font-playfair font-black text-stone-900">ترتيب المنتجات</h1>
              <p className="text-xs text-stone-500 mt-1">رتب المنتجات حسب الأولوية</p>
            </div>
          </div>
          <Button
            onClick={saveOrder}
            disabled={saving}
            className="rounded-none bg-stone-950 text-white hover:bg-stone-800"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'جاري الحفظ...' : 'حفظ الترتيب'}
          </Button>
        </div>
      </div>

      {/* Products List */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <div className="space-y-3">
          {orderedProducts.map((product, index) => (
            <Card key={product.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                {/* Order Number */}
                <div className="flex-shrink-0 w-12 h-12 bg-stone-900 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>

                {/* Product Image */}
                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-stone-100">
                  <img
                    src={product.image || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-stone-900 truncate">{product.name}</h3>
                  <p className="text-sm text-stone-500">{product.category}</p>
                  <p className="text-sm font-bold text-stone-700">{product.price} جنيه</p>
                </div>

                {/* Move Buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveDown(index)}
                    disabled={index === orderedProducts.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {orderedProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-500">لا توجد منتجات لترتيبها</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsOrder;
