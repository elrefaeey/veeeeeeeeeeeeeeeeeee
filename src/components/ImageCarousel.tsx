import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

// استخدام صور من مصادر خارجية مؤقتاً - يمكنك تغييرها من لوحة الإدارة لاحقاً
const images = [
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&q=80',
];

const Hero = () => {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[90vh] flex flex-col md:flex-row bg-stone-50 overflow-hidden">
      {/* Text / Content Section */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-start px-8 md:px-20 z-10 bg-white/80 md:bg-stone-50/50 backdrop-blur-sm md:backdrop-blur-none absolute md:relative h-full">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <span className="text-sm md:text-base tracking-[0.3em] font-medium text-stone-500 uppercase">
            New Collection 2026
          </span>
          <h1 className="text-6xl md:text-8xl font-playfair font-black text-rose-950 leading-tight">
            VEE <br />
            <span className="text-4xl md:text-5xl font-light text-stone-600 block mt-2">
              Elegance Redefined
            </span>
          </h1>
          <p className="max-w-md text-stone-600 font-sans text-lg leading-relaxed">
            Discover a world where modesty meets modern fashion.
            Curated pieces for the contemporary woman.
          </p>

          <div className="pt-4">
            <Button
              onClick={() => window.location.href = '/products'}
              size="lg"
              className="bg-stone-900 text-white hover:bg-rose-700 hover:text-white px-8 py-6 text-lg rounded-none transition-all duration-300 shadow-xl"
            >
              Shop Now <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Image Slider Section */}
      <div className="w-full md:w-1/2 h-full relative">
        {images.map((img, index) => (
          <div
            key={img}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImage ? 'opacity-100' : 'opacity-0'
              }`}
          >
            <img
              src={img}
              alt={`Slide ${index + 1}`}
              className="w-full h-full object-cover object-center"
            />
            {/* Overlay for contrast on mobile since text is over image on mobile */}
            <div className="absolute inset-0 bg-black/10 md:bg-transparent" />
          </div>
        ))}

        {/* Slider Indicators */}
        <div className="absolute bottom-8 right-8 flex gap-3 z-20">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImage(idx)}
              className={`h-1 transition-all duration-300 ${idx === currentImage ? 'w-8 bg-white md:bg-rose-900' : 'w-4 bg-white/50 md:bg-rose-900/30'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
