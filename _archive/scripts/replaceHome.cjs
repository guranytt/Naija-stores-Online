const fs = require('fs');

const file = 'src/components/CustomerViews.tsx';
let content = fs.readFileSync(file, 'utf8');

const startMarker = '{/* ---------------- 1. MARKETPLACE HOMEPAGE ---------------- */}';
const endMarker = '{/* ---------------- 2. CATALOG BROWSER & SORTING ---------------- */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newHomeSection = `
      {/* ---------------- 1. MARKETPLACE HOMEPAGE ---------------- */}
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <motion.div
            key="home"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="space-y-12 pb-16"
          >
            {/* HERO SECTION - Split Layout */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
              <div className="flex gap-6 relative">
                {/* Left Sidebar (Categories Menu) */}
                <div className="w-[250px] shrink-0 hidden lg:block bg-white border border-neutral-200 rounded-lg shadow-sm self-start">
                   <div className="bg-orange-500 text-white font-bold px-4 py-3 rounded-t-lg flex items-center space-x-2">
                      <Menu className="w-5 h-5" />
                      <span className="text-sm">HOW TO USE MEGAMENU</span>
                   </div>
                   <ul className="py-2 text-sm text-neutral-600 font-medium">
                     {categories.slice(0,10).map((cat, i) => (
                       <li key={cat.id} className="px-5 py-2.5 hover:text-orange-500 cursor-pointer flex justify-between items-center group">
                          <span className="truncate pr-2">{cat.name}</span>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                       </li>
                     ))}
                   </ul>
                </div>

                {/* Right Carousel / Banner Area */}
                <div className="flex-1 bg-neutral-100 rounded-xl overflow-hidden relative min-h-[400px] sm:min-h-[500px]">
                   {homepageAds.length > 0 && (
                     <div className="absolute inset-0">
                       <img 
                          src={homepageAds[currentAdIndex].imageUrl || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80"}
                          alt="Hero Promo"
                          className="w-full h-full object-cover"
                       />
                       <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent flex items-center">
                          <div className="p-8 sm:p-14 max-w-md">
                            <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 leading-tight mb-2">
                               {homepageAds[currentAdIndex].title.split(' ').slice(0, 3).join(' ')} <br/>
                               <span className="text-orange-500">{homepageAds[currentAdIndex].title.split(' ').slice(3).join(' ')}</span>
                            </h2>
                            <p className="text-neutral-600 font-medium mb-6">Total Order: <strong className="text-neutral-900">₦25,000.00</strong></p>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-8 py-3 transition-colors shadow-lg shadow-blue-500/30">
                              Shop Now
                            </button>
                          </div>
                       </div>
                       {/* Dots */}
                       <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
                         {homepageAds.map((_, idx) => (
                           <button 
                             key={idx}
                             onClick={() => setCurrentAdIndex(idx)}
                             className={\`w-2.5 h-2.5 rounded-full \${idx === currentAdIndex ? 'bg-orange-500 w-6' : 'bg-white/60'} transition-all\`}
                           />
                         ))}
                       </div>
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* SUPER DEALS - Horizontal Track */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
               <div className="flex justify-between items-end border-b-2 border-blue-600 pb-2 mb-6">
                 <div className="flex items-center space-x-4">
                    <h3 className="text-2xl font-black text-neutral-900 italic pr-2">Super Deals</h3>
                    <div className="hidden sm:flex items-center space-x-2 text-sm text-neutral-500 font-medium border-l border-neutral-300 pl-4">
                      <span>top products, incredible prices</span>
                      <div className="flex space-x-1 font-bold text-white text-xs">
                        <span className="bg-blue-600 px-1.5 py-0.5 rounded">04</span> :
                        <span className="bg-blue-600 px-1.5 py-0.5 rounded">20</span> :
                        <span className="bg-blue-600 px-1.5 py-0.5 rounded">59</span>
                      </div>
                    </div>
                 </div>
                 <button onClick={() => onNavigate("shop")} className="text-sm font-bold text-blue-600 hover:underline">View more</button>
               </div>
               
               <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-thin">
                  {products.slice(0, 5).map(p => (
                    <div key={p.id} onClick={() => { onSelectProduct(p.id); onNavigate("details"); }} className="w-56 shrink-0 bg-neutral-50/50 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow group relative border border-transparent hover:border-neutral-200">
                      <div className="aspect-square bg-white rounded-lg mb-3 overflow-hidden relative p-2">
                         <img src={p.image} className="w-full h-full object-contain group-hover:scale-105 transition-transform" alt={p.title} />
                         {p.salePercentage && (
                            <span className="absolute bottom-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{p.salePercentage}%</span>
                         )}
                      </div>
                      <h4 className="font-bold text-sm text-neutral-800 line-clamp-1">{p.title}</h4>
                      <p className="font-black text-neutral-900">{formatNaira(p.price)}</p>
                      <p className="text-[10px] text-neutral-400 mt-1">{p.stock} orders</p>
                    </div>
                  ))}
               </div>
            </div>

            {/* TWO GRIDS: Top Selection & New Arrivals */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Top Selection */}
                <div className="bg-neutral-100/60 rounded-2xl p-6 border border-neutral-200/50">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-neutral-900">Top Selection</h3>
                    <button className="text-sm font-bold text-blue-600 hover:underline">View more</button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     {products.slice(5, 8).map(p => (
                        <div key={p.id} onClick={() => { onSelectProduct(p.id); onNavigate("details"); }} className="bg-white rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow relative">
                          <div className="aspect-square mb-2 overflow-hidden">
                             <img src={p.image} className="w-full h-full object-contain" alt={p.title} />
                          </div>
                          <h4 className="font-bold text-xs text-neutral-800 line-clamp-1">{p.title}</h4>
                          <p className="font-black text-sm text-neutral-900">{formatNaira(p.price)}</p>
                          {p.salePercentage && (
                            <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block">-{p.salePercentage}%</span>
                          )}
                        </div>
                     ))}
                  </div>
                </div>

                {/* New Arrivals */}
                <div className="bg-neutral-100/60 rounded-2xl p-6 border border-neutral-200/50">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-neutral-900">New Arrivals</h3>
                    <button className="text-sm font-bold text-blue-600 hover:underline">View more</button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     {products.slice(8, 11).map(p => (
                        <div key={p.id} onClick={() => { onSelectProduct(p.id); onNavigate("details"); }} className="bg-white rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow relative">
                          <div className="aspect-square mb-2 overflow-hidden">
                             <img src={p.image} className="w-full h-full object-contain" alt={p.title} />
                          </div>
                          <h4 className="font-bold text-xs text-neutral-800 line-clamp-1">{p.title}</h4>
                          <p className="font-black text-sm text-neutral-900">{formatNaira(p.price)}</p>
                          {p.salePercentage && (
                            <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block">-{p.salePercentage}%</span>
                          )}
                        </div>
                     ))}
                  </div>
                </div>

              </div>
            </div>

            {/* CHOOSE CATEGORY BENTO */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 bg-neutral-100 rounded-3xl py-12 border border-neutral-200">
               <div className="text-center mb-8">
                 <h2 className="text-2xl font-black text-neutral-900">Choose Category</h2>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Big Banner Left */}
                  <div className="bg-blue-600 rounded-2xl p-8 text-white relative overflow-hidden group cursor-pointer" onClick={() => onNavigate("shop")}>
                     <div className="relative z-10">
                       <span className="text-[10px] font-bold tracking-widest uppercase">On the weekend</span>
                       <h3 className="text-3xl font-black mt-2 leading-tight">TOP CLOTHING</h3>
                       <button className="bg-white text-blue-600 font-bold px-4 py-1.5 rounded-full text-xs mt-4">SHOP NOW!</button>
                     </div>
                     <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80" className="absolute -bottom-10 -right-10 w-64 opacity-50 mix-blend-luminosity group-hover:scale-105 transition-transform duration-500" />
                  </div>

                  {/* 2x2 Grids in Middle */}
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                     {/* Top Rankings */}
                     <div className="bg-white rounded-xl p-4 flex flex-col justify-between">
                       <h4 className="font-bold text-sm text-neutral-900">Top Rankings</h4>
                       <div className="flex gap-2 mt-4">
                         <div className="flex-1 bg-neutral-50 rounded-lg p-2 aspect-square"><img src={products[0]?.image} className="w-full h-full object-contain" /></div>
                         <div className="flex-1 bg-neutral-50 rounded-lg p-2 aspect-square"><img src={products[1]?.image} className="w-full h-full object-contain" /></div>
                       </div>
                     </div>
                     {/* Smart Phone */}
                     <div className="bg-white rounded-xl p-4 flex flex-col justify-between">
                       <h4 className="font-bold text-sm text-neutral-900">Smart Phone</h4>
                       <div className="flex gap-2 mt-4">
                         <div className="flex-1 bg-neutral-50 rounded-lg p-2 aspect-square"><img src={products[2]?.image} className="w-full h-full object-contain" /></div>
                         <div className="flex-1 bg-neutral-50 rounded-lg p-2 aspect-square"><img src={products[3]?.image} className="w-full h-full object-contain" /></div>
                       </div>
                     </div>
                     {/* Home Appliances */}
                     <div className="bg-white rounded-xl p-4 flex flex-col justify-between">
                       <h4 className="font-bold text-sm text-neutral-900">Home Appliances</h4>
                       <div className="flex gap-2 mt-4">
                         <div className="flex-1 bg-neutral-50 rounded-lg p-2 aspect-square"><img src={products[4]?.image} className="w-full h-full object-contain" /></div>
                         <div className="flex-1 bg-neutral-50 rounded-lg p-2 aspect-square"><img src={products[5]?.image} className="w-full h-full object-contain" /></div>
                       </div>
                     </div>
                     {/* Sports */}
                     <div className="bg-white rounded-xl p-4 flex flex-col justify-between">
                       <h4 className="font-bold text-sm text-neutral-900">Sports</h4>
                       <div className="flex gap-2 mt-4">
                         <div className="flex-1 bg-neutral-50 rounded-lg p-2 aspect-square"><img src={products[6]?.image} className="w-full h-full object-contain" /></div>
                         <div className="flex-1 bg-neutral-50 rounded-lg p-2 aspect-square"><img src={products[7]?.image} className="w-full h-full object-contain" /></div>
                       </div>
                     </div>
                  </div>

                  {/* Auth Welcome Block */}
                  <div className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                      <UserCircle className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="font-black text-lg text-neutral-900 mb-4">Welcome To Naija.</h3>
                    <div className="flex space-x-2 w-full">
                      <button onClick={() => onNavigate("auth")} className="flex-1 bg-orange-50 text-orange-600 font-bold py-2 rounded-lg text-sm">Join us</button>
                      <button onClick={() => onNavigate("auth")} className="flex-1 bg-orange-500 text-white font-bold py-2 rounded-lg text-sm">Sign in</button>
                    </div>
                    <div className="mt-6 w-full relative h-32 rounded-xl overflow-hidden bg-orange-500">
                      <div className="absolute inset-0 flex items-center justify-center text-white font-black text-2xl rotate-[-5deg]">TOP SALE</div>
                    </div>
                  </div>
               </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
      `;

  const newContent = content.substring(0, startIndex) + newHomeSection + "\n      " + content.substring(endIndex);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log("Successfully replaced home section.");
} else {
  console.log("Could not find markers.", startIndex, endIndex);
}
