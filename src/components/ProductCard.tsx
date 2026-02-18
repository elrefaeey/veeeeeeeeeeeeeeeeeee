import React from 'react';
import { Product } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  darkBackground?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, darkBackground = false }) => {
  const hasDiscount = typeof product.offerDiscount === 'number' && product.offerDiscount > 0;
  const newPrice = hasDiscount ? Math.round(product.price * (1 - product.offerDiscount / 100)) : product.price;

  // Extract main image
  let mainImage = '';
  if (product.colors && product.colors.length > 0) {
    const firstColor = product.colors[0];
    if (Array.isArray((firstColor as any).images) && (firstColor as any).images.length > 0 && (firstColor as any).images[0]) {
      mainImage = (firstColor as any).images[0];
    } else if ((firstColor as any).image) {
      mainImage = (firstColor as any).image;
    }
  }
  if (!mainImage && product.image) {
    mainImage = product.image;
  }
  if (!mainImage) {
    mainImage = '/placeholder.svg';
  }

  return (
    <div
      className="group w-full flex flex-col cursor-pointer"
      onClick={() => onClick(product)}
    >
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-stone-100 rounded-sm mb-4">
        {product.soldOut && (
          <div className="absolute top-4 right-4 bg-white text-stone-900 text-xs md:text-sm uppercase font-black px-4 py-2 z-10 tracking-wider shadow-lg rounded-sm">
            Sold Out
          </div>
        )}
        {hasDiscount && !product.soldOut && (
          <div className="absolute top-4 right-4 bg-rose-500 text-white text-sm md:text-base font-black px-4 py-2 z-10 tracking-wide shadow-xl rounded-sm">
            -{product.offerDiscount}%
          </div>
        )}

        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-in-out group-hover:scale-105"
        />

        {/* Quick Add Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center pb-6 bg-gradient-to-t from-black/20 to-transparent">
          <Button
            variant="secondary"
            className="w-full bg-white text-stone-900 hover:bg-stone-200 font-medium uppercase tracking-wider text-xs h-10 shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              onClick(product);
            }}
          >
            <ShoppingBag className="w-3 h-3 mr-2" /> View Details
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-start gap-1 px-1">
        <h3 className={`font-playfair font-medium text-base md:text-lg line-clamp-1 group-hover:text-rose-400 transition-colors uppercase tracking-tight ${
          darkBackground ? 'text-stone-200' : 'text-stone-800'
        }`}>
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          {hasDiscount ? (
            <>
              <span className={`line-through text-xs ${darkBackground ? 'text-stone-500' : 'text-stone-400'}`}>
                EGP {product.price}
              </span>
              <span className={`font-black text-base ${darkBackground ? 'text-rose-400' : 'text-rose-950'}`}>
                EGP {newPrice}
              </span>
            </>
          ) : (
            <span className={`font-black text-base italic ${darkBackground ? 'text-stone-100' : 'text-stone-950'}`}>
              EGP {product.price}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
