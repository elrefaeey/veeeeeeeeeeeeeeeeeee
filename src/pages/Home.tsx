import React from 'react';
import Hero from '@/components/ImageCarousel';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/ProductCard';
import { ArrowRight, Star, ShieldCheck, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';

const Home = () => {
  const { products, loading } = useProducts();
  // Filter out sold out products and display first 4 available products
  const featuredProducts = products.filter(p => !p.soldOut).slice(0, 4);

  return (
    <div className="relative bg-white min-h-screen pb-20">
      <Hero />


      {/* Featured Products */}
      <section className="py-24 bg-stone-50 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-16 gap-4">
            <div className="text-center md:text-left">
              <span className="text-[10px] uppercase tracking-[0.4em] font-black text-stone-400">Curation</span>
              <h2 className="text-4xl md:text-5xl font-playfair font-black text-stone-900 uppercase mt-2">New Arrivals</h2>
            </div>
            <Link to="/products" className="group flex items-center text-[10px] uppercase tracking-[0.3em] font-black text-stone-900 hover:text-stone-500 transition-colors">
              View All Pieces <ArrowRight className="ml-2 w-3 h-3 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-900 animate-spin rounded-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
              {featuredProducts.length > 0 ? (
                featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => window.location.href = `/products`}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-20 italic text-stone-400">The collection is being curated.</div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Brand Values */}
      <section className="py-24 bg-white px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center space-y-6 border border-stone-200 p-8 md:p-10 bg-stone-50/50 hover:border-stone-300 transition-all duration-300">
            <div className="w-20 h-20 flex items-center justify-center bg-white border border-stone-200 text-stone-600">
              <Star className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm uppercase tracking-[0.3em] font-black text-stone-900">Exquisite Quality</h3>
              <p className="text-stone-600 text-sm leading-relaxed max-w-xs mx-auto">Selected fabrics and meticulous craftsmanship for lasting elegance.</p>
            </div>
          </div>
          <div className="flex flex-col items-center space-y-6 border border-stone-200 p-8 md:p-10 bg-stone-50/50 hover:border-stone-300 transition-all duration-300">
            <div className="w-20 h-20 flex items-center justify-center bg-white border border-stone-200 text-stone-600">
              <Truck className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm uppercase tracking-[0.3em] font-black text-stone-900">Global Shipping</h3>
              <p className="text-stone-600 text-sm leading-relaxed max-w-xs mx-auto">Seamless delivery from our studio to your doorstep, anywhere.</p>
            </div>
          </div>
          <div className="flex flex-col items-center space-y-6 border border-stone-200 p-8 md:p-10 bg-stone-50/50 hover:border-stone-300 transition-all duration-300">
            <div className="w-20 h-20 flex items-center justify-center bg-white border border-stone-200 text-stone-600">
              <ShieldCheck className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm uppercase tracking-[0.3em] font-black text-stone-900">Personal Care</h3>
              <p className="text-stone-600 text-sm leading-relaxed max-w-xs mx-auto">Dedicated support to ensure your VEE experience is perfect.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Social Media Icons */}
      <div className="fixed bottom-10 right-10 z-50 flex flex-col gap-4">
        <a
          href="https://api.whatsapp.com/send/?phone=201559839407&text&type=phone_number&app_absent=0"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white border border-stone-100 text-[#25D366] p-4 rounded-full shadow-xl hover:bg-stone-50 transition-all duration-300"
        >
          <FaWhatsapp className="w-6 h-6" />
        </a>

        <a
          href="https://www.instagram.com/vee.desi9n/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white border border-stone-100 text-stone-900 p-4 rounded-full shadow-xl hover:bg-stone-50 transition-all duration-300"
        >
          <FaInstagram className="w-6 h-6" />
        </a>
      </div>
    </div>
  );
};

export default Home;
