import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import ProductCard from '../components/ui/ProductCard';
import { formatCurrency, formatDate } from '../lib/utils';
import { ChefHat, Truck, Clock, Star, ArrowRight, Tag, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } };

export default function HomePage() {
  const { data: featuredData } = useQuery({ queryKey: ['featured'], queryFn: () => api.get('/online/featured') });
  const { data: promoData } = useQuery({ queryKey: ['promotions'], queryFn: () => api.get('/online/promotions') });
  const { data: reviewData } = useQuery({ queryKey: ['reviews'], queryFn: () => api.get('/online/reviews') });

  const featured = featuredData?.data || [];
  const promotions = promoData?.data || [];
  const reviews = reviewData?.data || [];

  return (
    <div className="space-y-0">
      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/20 rounded-full filter blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-600/20 rounded-full filter blur-3xl opacity-40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.6 }} className="text-white space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/20 border border-brand/30 rounded-full text-sm text-brand font-medium">
              <ChefHat className="w-4 h-4" /> Now delivering in Kigali
            </div>
            <h1 className="text-5xl lg:text-6xl font-black leading-tight">
              Taste the <span className="text-brand">Best</span> of<br />Sammy's Kitchen
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
              From our kitchen to your doorstep — enjoy fresh, handcrafted meals and premium drinks. Order now and get it delivered fast.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/menu" className="btn-primary inline-flex items-center gap-2 text-base">
                Order Now <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/menu" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/20 text-white rounded-2xl font-semibold hover:border-brand transition-colors">
                View Menu
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              {[['500+', 'Happy Customers'], ['50+', 'Menu Items'], ['30 min', 'Avg Delivery']].map(([v, l]) => (
                <div key={l}>
                  <p className="text-2xl font-black text-brand">{v}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hero image / illustration */}
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }} className="hidden lg:flex items-center justify-center">
            <div className="relative w-80 h-80">
              <div className="absolute inset-0 bg-brand/10 rounded-full animate-pulse-slow" />
              <div className="absolute inset-8 bg-brand/20 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center text-[140px]">🍽️</div>
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl px-3 py-2 shadow-xl flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> 4.9 Rating
              </div>
              <div className="absolute -bottom-4 -left-4 bg-brand rounded-2xl px-3 py-2 shadow-xl text-sm font-semibold text-white flex items-center gap-2">
                <Truck className="w-4 h-4" /> Fast Delivery
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🚀', title: 'Fast Delivery', desc: 'Hot food delivered in 30 minutes or less, straight to your door.' },
              { icon: '👨‍🍳', title: 'Fresh & Handcrafted', desc: 'Every dish made fresh by our expert chefs using quality ingredients.' },
              { icon: '⭐', title: 'Loyalty Rewards', desc: 'Earn points with every order. Redeem for free meals and discounts.' },
            ].map(f => (
              <div key={f.title} className="flex gap-4 p-6 bg-gray-50 rounded-2xl">
                <span className="text-4xl shrink-0">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROMOTIONS ── */}
      {promotions.length > 0 && (
        <section className="bg-gradient-to-r from-brand/5 to-orange-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-gray-900">🔥 Hot Deals</h2>
                <p className="text-gray-500 mt-1">Limited time offers — grab them before they're gone!</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {promotions.map(promo => (
                <div key={promo.id} className="bg-white rounded-2xl p-6 border-2 border-brand/20 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                      <Tag className="w-5 h-5 text-brand" />
                    </div>
                    {promo.discountPercent && (
                      <span className="px-3 py-1 bg-brand text-white text-sm font-bold rounded-full">-{promo.discountPercent}%</span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{promo.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-3">{promo.description}</p>
                  {promo.code && (
                    <div className="bg-gray-50 border-2 border-dashed border-brand/40 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-0.5">Promo Code</p>
                      <p className="font-black text-brand text-xl tracking-widest">{promo.code}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-3">Valid until {formatDate(promo.endDate)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURED ITEMS ── */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="px-4 py-1.5 bg-brand/10 text-brand text-sm font-semibold rounded-full">Chef's Picks</span>
            <h2 className="text-4xl font-black text-gray-900 mt-3">Featured Menu Items</h2>
            <p className="text-gray-500 mt-2">Handpicked by our head chef for the best experience</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
          <div className="text-center mt-10">
            <Link to="/menu" className="btn-outline inline-flex items-center gap-2">
              View Full Menu <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black">How It Works</h2>
            <p className="text-gray-400 mt-2">Order in 3 simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '🛒', title: 'Browse & Select', desc: 'Explore our full menu, add items to your cart with special notes.' },
              { step: '02', icon: '📍', title: 'Choose Delivery', desc: 'Enter your delivery address or choose pickup. Pay securely online.' },
              { step: '03', icon: '🚀', title: 'Track & Enjoy', desc: 'Track your order in real-time and enjoy your meal!' },
            ].map(s => (
              <div key={s.step} className="text-center space-y-4">
                <div className="relative inline-block">
                  <span className="text-6xl">{s.icon}</span>
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-brand rounded-full text-xs font-black flex items-center justify-center">{s.step}</span>
                </div>
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="text-gray-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      {reviews.length > 0 && (
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-gray-900">What Customers Say</h2>
              <p className="text-gray-500 mt-2">Real reviews from our valued customers</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map(r => (
                <div key={r.id} className="bg-gray-50 rounded-2xl p-6 space-y-3">
                  <Quote className="w-6 h-6 text-brand opacity-50" />
                  <p className="text-gray-700 text-sm leading-relaxed">"{r.comment}"</p>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-gray-500 ml-1">{r.rating}/5</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
                    <div className="w-7 h-7 bg-brand/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-brand">{r.customer?.name?.charAt(0) || 'C'}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{r.customer?.name || 'Customer'}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="bg-brand py-16">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-black mb-3">Ready to Order?</h2>
          <p className="text-orange-100 mb-8">Explore our full menu and get your favorite meal delivered today.</p>
          <Link to="/menu" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand font-bold rounded-2xl hover:bg-orange-50 transition-colors text-lg">
            Order Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
