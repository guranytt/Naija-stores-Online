import React from 'react';
import { ShoppingCart, User, Search, ChevronRight, Star, ArrowRight, Instagram, Twitter, Mail } from 'lucide-react';

/**
 * HomePage Component
 * 
 * A premium e-commerce landing page featuring:
 * - Glassmorphism hero section
 * - Bento-grid for premier vendors
 * - Gold accents (accent) and deep navy theme (primary-dark)
 * - Tailwind CSS for styling
 */
const HomePage = ({ onNavigate }: { onNavigate?: (screen: string) => void }) => {
  return (
    <div className="bg-[#0c0f10] text-white font-serif selection:bg-accent/30 rounded-3xl overflow-hidden mt-8 mb-16 shadow-2xl border border-white/5">

      {/* Hero Section with Glassmorphism */}
      <section className="relative pt-32 pb-20 px-6 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-dark rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 max-w-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-16 shadow-2xl">
            <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-1 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-white/60">Nigeria's Finest Market</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6">
              Delivered to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-light">
                Your Door.
              </span>
            </h1>
            
            <p className="text-lg text-white/50 mb-10 leading-relaxed font-sans font-light">
              Shop premium international brands and beloved local favorites with confidence. 
              Experience curated luxury and seamless logistics across the federation.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-grow flex items-center bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus-within:border-accent/50 transition-all">
                <Search className="w-5 h-5 text-white/30 mr-3" />
                <input 
                  type="text" 
                  placeholder="What are you looking for today?" 
                  className="bg-transparent border-none focus:ring-0 text-white placeholder:text-white/20 w-full"
                />
              </div>
              <button className="bg-accent hover:bg-accent-light text-primary-dark font-bold px-10 py-4 rounded-2xl transition-all shadow-lg shadow-accent/20 flex items-center justify-center space-x-2">
                <span>Search</span>
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 text-[10px] uppercase tracking-widest font-medium text-white/40">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center">✓</div>
                <span>Verified Vendors</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center">🚚</div>
                <span>Nationwide Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Bar */}
      <section className="py-12 border-y border-white/5 bg-[#111415]/50">
        <div className="max-w-7xl mx-auto px-6 overflow-x-auto">
          <div className="flex justify-between min-w-[800px] lg:min-w-0">
            {[
              { label: 'Electronics', icon: '💻' },
              { label: 'Luxury Fashion', icon: '👗' },
              { label: 'Beauty', icon: '✨' },
              { label: 'Home Decor', icon: '🛋️' },
              { label: 'Fine Wine', icon: '🍷' },
              { label: 'Tech', icon: '⚙️' }
            ].map((cat) => (
              <button key={cat.label} className="group flex flex-col items-center space-y-4 px-6 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:bg-accent/10 group-hover:border-accent/30 transition-all">
                  {cat.icon}
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em]">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid: Premier Vendors */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <p className="text-accent text-[10px] uppercase tracking-[0.3em] font-bold mb-2">Curated Selection</p>
              <h2 className="text-4xl font-bold">Our Premier Vendors</h2>
            </div>
            <button className="flex items-center space-x-2 text-white/40 hover:text-accent transition-colors text-xs uppercase tracking-widest font-medium">
              <span>View All Vendors</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 h-auto md:h-[700px]">
            {/* Featured Vendor - Large */}
            <div className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-[32px] border border-white/10">
              <img src="https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&q=80&w=1200" alt="Lagos Luxe" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-dark via-primary-dark/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-10">
                <div className="bg-accent text-primary-dark px-3 py-1 rounded text-[10px] font-bold uppercase mb-4 inline-block">Platinum Vendor</div>
                <h3 className="text-4xl font-bold mb-4">Lagos Luxe</h3>
                <p className="text-white/60 mb-6 max-w-sm font-sans font-light">Exquisite Nigerian couture and international designer collections curated for the modern elite.</p>
                <button className="flex items-center space-x-2 text-accent hover:text-white transition-colors">
                  <span className="text-sm font-bold uppercase tracking-widest">Visit Store</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Vendor 2 - Wide */}
            <div className="md:col-span-2 relative group overflow-hidden rounded-[32px] border border-white/10">
              <img src="https://images.unsplash.com/photo-1491933382434-50028638c5fe?auto=format&fit=crop&q=80&w=1000" alt="Abuja Tech Hub" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60" />
              <div className="absolute inset-0 bg-primary-dark/40" />
              <div className="absolute inset-0 flex flex-col justify-center px-10">
                <h3 className="text-2xl font-bold mb-2">Abuja Tech Hub</h3>
                <p className="text-white/60 mb-4 font-sans font-light text-sm">The pinnacle of electronics and computing.</p>
                <button className="text-accent text-[10px] font-bold uppercase tracking-[0.2em]">Browse Inventory</button>
              </div>
            </div>

            {/* Vendor 3 - Square */}
            <div className="relative group overflow-hidden rounded-[32px] border border-white/10">
              <img src="https://images.unsplash.com/photo-1544441893-675973eebb01?auto=format&fit=crop&q=80&w=600" alt="Heritage Fabrics" className="absolute inset-0 w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 bg-primary-dark/20 p-8 flex flex-col justify-end">
                <h3 className="text-lg font-bold mb-1">Heritage Fabrics</h3>
                <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Explore</p>
              </div>
            </div>

            {/* Vendor 4 - Square */}
            <div className="relative group overflow-hidden rounded-[32px] border border-white/10">
              <img src="https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&q=80&w=600" alt="Zenith Homeware" className="absolute inset-0 w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 bg-primary-dark/20 p-8 flex flex-col justify-end">
                <h3 className="text-lg font-bold mb-1">Zenith Homeware</h3>
                <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Explore</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;


