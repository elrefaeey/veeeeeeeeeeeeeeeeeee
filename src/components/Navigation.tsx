import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const Navigation = () => {
  const location = useLocation();
  const { items } = useCart();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-stone-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="text-2xl md:text-3xl font-playfair font-black tracking-[0.15em] text-stone-900 uppercase flex-shrink-0">
            VEE
          </Link>

          {/* Navigation Links - Slightly right of center */}
          <div className="flex items-center space-x-6 md:space-x-10 lg:space-x-16 absolute left-1/2 transform -translate-x-1/4">
            <Link
              to="/"
              className={`text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold transition-all duration-300 hover:text-stone-500 whitespace-nowrap ${
                isActive('/') ? 'text-stone-900 border-b-2 border-stone-900 pb-1' : 'text-stone-400'
              }`}
            >
              Home
            </Link>
            <Link
              to="/products"
              className={`text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold transition-all duration-300 hover:text-stone-500 whitespace-nowrap ${
                isActive('/products') ? 'text-stone-900 border-b-2 border-stone-900 pb-1' : 'text-stone-400'
              }`}
            >
              Collection
            </Link>
          </div>

          {/* Icons - Right */}
          <div className="flex items-center space-x-3 md:space-x-5 flex-shrink-0">
            <Link
              to="/admin"
              className="hidden md:block text-stone-400 hover:text-stone-900 transition-colors"
              aria-label="Admin"
            >
              <User className="w-5 h-5 stroke-[1.5]" />
            </Link>
            <Link
              to="/cart"
              className="relative text-stone-400 hover:text-stone-900 transition-colors"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-900 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold" style={{ backgroundColor: '#B35667' }}>
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
