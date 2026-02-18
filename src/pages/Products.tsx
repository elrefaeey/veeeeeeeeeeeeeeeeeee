import React, { useState, useMemo, useEffect } from 'react';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';
import { Product } from '@/hooks/useProducts';
import { useLocation } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { ChevronDown } from 'lucide-react';

const Products = () => {
  const { products, loading } = useProducts();
  const location = useLocation();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [filters, setFilters] = useState({
    category: '',
    priceSort: ''
  });

  const { categories } = useCategories();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    if (category) {
      setFilters((prev) => ({ ...prev, category }));
    }
  }, [location.search]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    if (filters.priceSort === 'low-to-high') {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (filters.priceSort === 'high-to-low') {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    }

    return filtered;
  }, [products, filters]);

  const offerProducts = useMemo(() => {
    return products.filter(p => p.offer === true && (!p.offerEndTime || p.offerEndTime > Date.now()));
  }, [products]);

  // حساب التايمر بناءً على أقرب وقت انتهاء للعروض
  useEffect(() => {
    const offerEndTimes = offerProducts
      .map(p => p.offerEndTime)
      .filter(Boolean) as number[];

    if (offerEndTimes.length === 0) return;

    const nearestEndTime = Math.min(...offerEndTimes);

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = nearestEndTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [offerProducts]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-stone-100 border-t-stone-900 animate-spin rounded-full"></div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-medium">VEE Label</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Active Curation / Offers Section - Prominently at the top */}
      {offerProducts.length > 0 && !filters.category && (
        <div className="bg-black py-8 md:py-16 lg:py-20 border-b border-stone-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
            {/* Offer Timer - Premium Style */}
            <div className="mb-10 md:mb-16 flex justify-center">
              <div className="bg-stone-900/50 backdrop-blur-md border border-stone-800 rounded-2xl md:rounded-3xl px-5 py-6 sm:px-6 sm:py-7 md:px-10 md:py-10 shadow-2xl w-full max-w-2xl">
                {/* Limited Opportunity Text */}
                <div className="text-center mb-5 sm:mb-6 md:mb-8">
                  <span className="text-rose-400 text-[11px] sm:text-xs md:text-sm uppercase tracking-[0.25em] sm:tracking-[0.3em] md:tracking-[0.4em] font-bold block mb-4 sm:mb-5 md:mb-6">
                    Limited Opportunity
                  </span>
                  <h3 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold uppercase leading-tight">
                    Active Curation<br />Ends In
                  </h3>
                </div>

                {/* Timer */}
                <div className="flex gap-2 sm:gap-3 md:gap-4 justify-center items-center mt-6 sm:mt-7 md:mt-10">
                  {[
                    { label: 'D', value: timeLeft.days },
                    { label: 'H', value: timeLeft.hours },
                    { label: 'M', value: timeLeft.minutes },
                    { label: 'S', value: timeLeft.seconds }
                  ].map((unit, idx) => (
                    <div key={unit.label} className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                      <div className="flex flex-col items-center">
                        <div className="bg-stone-800/80 rounded-xl sm:rounded-2xl md:rounded-2xl px-2.5 py-2.5 sm:px-3 sm:py-3 md:px-4 md:py-4 min-w-[55px] sm:min-w-[65px] md:min-w-[75px] shadow-lg">
                          <span className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold block text-center leading-none">
                            {String(unit.value).padStart(2, '0')}
                          </span>
                        </div>
                        <span className="text-stone-600 text-[9px] sm:text-[10px] md:text-xs font-bold mt-1.5 sm:mt-2 md:mt-3 uppercase tracking-wider">
                          {unit.label}
                        </span>
                      </div>
                      {idx < 3 && (
                        <span className="text-stone-700 text-lg sm:text-xl md:text-2xl lg:text-3xl font-light mb-5 sm:mb-6 md:mb-8">:</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Offers Grid */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-6 sm:mb-8 md:mb-12 gap-3 sm:gap-4">
                <div className="text-center md:text-left">
                  <span className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] md:tracking-[0.4em] font-bold text-rose-400/80 block mb-1 sm:mb-2">
                    Highlight
                  </span>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white uppercase">
                    Active Curation
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                {offerProducts.map((product) => (
                  <ProductCard
                    key={`offer-${product.id}`}
                    product={product}
                    onClick={handleProductClick}
                    darkBackground={true}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-stone-50 py-16 md:py-24 border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <h1 className="text-4xl md:text-6xl font-playfair font-black tracking-tight text-stone-900 mb-4 uppercase">
            {filters.category ? filters.category : 'All Collections'}
          </h1>
        </div>
      </div>

      {/* Filter Bar */}

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {/* Results Info */}
        <div className="mb-8 flex justify-between items-center text-stone-400 text-[10px] uppercase tracking-widest font-medium px-1">
          <span className="italic">Exploring {filteredAndSortedProducts.length} unique designs</span>
        </div>

        {/* Product Grid */}
        {filteredAndSortedProducts.length === 0 ? (
          <div className="text-center py-40 border border-dashed border-stone-100 italic text-stone-300">
            No pieces currently available in this collection.
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
            {filteredAndSortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={handleProductClick}
              />
            ))}
          </div>
        )}
      </div>

      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div >
  );
};

export default Products;
