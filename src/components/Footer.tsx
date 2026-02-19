import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Footer = () => {
  const navigate = useNavigate();
  const [returnPolicy, setReturnPolicy] = useState('');
  const [shippingPolicy, setShippingPolicy] = useState('');

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const policiesDoc = await getDoc(doc(db, 'settings', 'policies'));
        if (policiesDoc.exists()) {
          const data = policiesDoc.data();
          setReturnPolicy(data.returnPolicy || 'You can request a refund or exchange within 14 days of receiving your order. Items must be unused and in original condition with tags.');
          setShippingPolicy(data.shippingPolicy || 'Orders are processed within 1–2 business days. Delivery within Egypt takes 2 to 7 business days, depending on your location.');
        }
      } catch (error) {
        console.error('Error fetching policies:', error);
      }
    };
    fetchPolicies();
  }, []);

  return (
    <footer className="bg-white text-stone-900 pt-20 pb-10 border-t border-stone-100">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand section */}
          <div className="space-y-6">
            <h3 className="text-3xl font-playfair font-black tracking-widest text-stone-900">VEE</h3>
            <p className="text-stone-500 font-sans text-sm leading-relaxed max-w-xs">
              Defining modern modesty through curated elegance and timeless designs for the contemporary woman.
            </p>
            <div className="flex gap-4">
              <a href="https://api.whatsapp.com/send/?phone=201559839407" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-900 transition-colors">
                <FaWhatsapp className="w-5 h-5" />
              </a>
              <a href="https://www.instagram.com/vee.desi9n/" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-900 transition-colors">
                <FaInstagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-6">
            <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-stone-900">Explore</h4>
            <ul className="space-y-4 text-sm text-stone-500">
              <li><a href="/" className="hover:text-stone-900 transition-colors tracking-wide">Home</a></li>
              <li><a href="/products" className="hover:text-stone-900 transition-colors tracking-wide">Collections</a></li>
              <li><a href="/cart" className="hover:text-stone-900 transition-colors tracking-wide">Shopping Bag</a></li>
            </ul>
          </div>

          {/* Assistance */}
          <div className="space-y-6">
            <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-stone-900">Care</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Dialog>
                  <DialogTrigger className="text-stone-500 hover:text-stone-900 transition-colors tracking-wide text-left">Shipping Policy</DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-playfair text-2xl">سياسة الشحن | Shipping Policy</DialogTitle>
                      <DialogDescription className="text-stone-600 text-sm pt-4 leading-relaxed whitespace-pre-wrap">
                        {shippingPolicy || 'Orders are processed within 1–2 business days. Delivery within Egypt takes 2 to 7 business days, depending on your location.'}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </li>
              <li>
                <Dialog>
                  <DialogTrigger className="text-stone-500 hover:text-stone-900 transition-colors tracking-wide text-left">Returns & Exchanges</DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-playfair text-2xl">سياسة الاسترجاع والاستبدال | Returns & Exchanges</DialogTitle>
                      <DialogDescription className="text-stone-600 text-sm pt-4 leading-relaxed whitespace-pre-wrap">
                        {returnPolicy || 'You can request a refund or exchange within 14 days of receiving your order. Items must be unused and in original condition with tags.'}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-stone-900">Contact</h4>
            <div className="text-sm text-stone-500 space-y-4 leading-relaxed">
              <p>Banha, Qalyubia, Egypt</p>
              <p>doaaatalla5@gmail.com</p>
              <p>+20 103 097 2737</p>
            </div>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-stone-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
              © 2026 VEE Label. All rights reserved.
            </p>
            <a
              href="https://wa.me/201092940685?text=أهلا%20أنا%20جاي%20من%20موقع%20VEE%20ممكن%20التفاصيل"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-[0.15em] text-stone-400 hover:text-stone-900 transition-colors group"
            >
              Developed by <span className="font-bold text-rose-600 group-hover:text-rose-700 transition-colors">Ahmed Elrefaey</span>
            </a>
          </div>
          <button
            onClick={() => navigate('/admin-login')}
            className="text-stone-300 hover:text-stone-900 transition-colors"
            title="Registry"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
