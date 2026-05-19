import re
import os

with open('src/pages/Shop.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the hardcoded category filters (lines 40-68) with dynamic generation and setActiveTab state
state_block = """
  const [activeShopTab, setActiveShopTab] = useState('services'); // 'services' or 'subscriptions'

  const groupedProducts = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const getCategoryMeta = (catId) => {
    const meta = {
      server: { label: 'Server Packages', icon: '💻' },
      addon: { label: 'Add-ons', icon: '🔌' },
      bot: { label: 'Bot Packages', icon: '🤖' },
      subscriptions: { label: 'Bot Subscriptions', icon: '💎' },
      scripts: { label: 'Scripts', icon: '📜' },
      events: { label: 'Events', icon: '🎉' },
      joins: { label: 'Joins & Members', icon: '👥' },
      infra: { label: 'Hosting & Infra', icon: '🖧' },
      decorations_gift: { label: 'Gift Decorations', icon: '🎁' },
      decorations_login: { label: 'Login Decorations', icon: '🔐' },
      nitro_accounts: { label: 'Nitro Accounts', icon: '✨' },
      booster: { label: 'Server Boosters', icon: '🚀' },
      promo: { label: 'Server Promotions', icon: '📢' }
    };
    return meta[catId] || { label: catId.replace(/_/g, ' '), icon: '📦' };
  };

  const serviceCategories = Object.keys(groupedProducts).filter(cat => cat !== 'subscriptions');
  const categoriesList = serviceCategories.map(cat => ({
    id: cat,
    label: getCategoryMeta(cat).label,
    icon: getCategoryMeta(cat).icon,
    count: groupedProducts[cat].length
  }));
"""
# Replace from `const servers = ...` to `].filter(c => c.count > 0);`
pattern_categories = re.compile(r'const servers\s*=\s*products\.filter.*?\]\.filter\(c => c\.count > 0\);', re.DOTALL)
content = pattern_categories.sub(state_block, content)


# 2. Add useState to imports if missing
if 'useState' not in content:
    content = content.replace("import { useEffect } from 'react';", "import { useState, useEffect } from 'react';")

# 3. Replace the layout. The sidebar is between `{/* --- SIDEBAR NAV --- */}` and `{/* --- MAIN CONTENT (PRODUCTS) --- */}`
# The layout wrapper is `<div className="flex flex-col lg:flex-row gap-8 items-start relative">`
# We want to replace this wrapper and the sidebar with the new Tabs and Top Nav.

nav_block = """
        {/* --- TABS --- */}
        <div className="flex justify-center mb-8 relative z-20">
          <div className="bg-[#0A0A0A]/80 backdrop-blur-md p-1.5 rounded-full border border-white/10 flex items-center shadow-2xl inline-flex max-w-full overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveShopTab('services')}
              className={`px-8 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeShopTab === 'services' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Standard Services
            </button>
            <button
              onClick={() => setActiveShopTab('subscriptions')}
              className={`px-8 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeShopTab === 'subscriptions' ? 'bg-purple-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Bot Subscriptions
            </button>
          </div>
        </div>

        {activeShopTab === 'services' && categoriesList.length > 0 && (
          <div className="mb-12 relative z-20">
            <div className="flex flex-wrap items-center justify-center gap-3 border-b border-white/5 pb-8 max-w-5xl mx-auto">
              {categoriesList.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap bg-white/5 border border-white/10 hover:bg-brand-primary/10 hover:border-brand-primary/30 hover:text-brand-primary transition-all duration-300 active:scale-95 group"
                >
                  <span className="text-lg grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">{cat.icon}</span>
                  <span className="capitalize">{cat.label}</span>
                  <span className="bg-white/10 text-gray-400 text-[10px] px-2 py-0.5 rounded-full group-hover:bg-brand-primary/20 group-hover:text-brand-primary transition-colors">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="w-full relative z-10">
          {activeShopTab === 'services' && (
            <div className="space-y-4">
"""

# Replace the layout start
content = re.sub(
    r'<div className="flex flex-col lg:flex-row gap-8 items-start relative">.*?\{/\* --- MAIN CONTENT \(PRODUCTS\) --- \*/\}.*?<div className="flex-1 w-full min-w-0">',
    nav_block,
    content,
    flags=re.DOTALL
)

# Now we need to modify the individual sections so they use groupedProducts[category] instead of hardcoded arrays.
# e.g. `{servers.length > 0 && (` -> `{groupedProducts.server?.length > 0 && (`
# e.g. `servers.map(` -> `groupedProducts.server.map(`

replacements = {
    'servers': 'server',
    'addons': 'addon',
    'bots': 'bot',
    'infra': 'infra',
    'scripts': 'scripts',
    'events': 'events',
    'joins': 'joins',
    'decoGift': 'decorations_gift',
    'decoLogin': 'decorations_login',
    'nitroAccounts': 'nitro_accounts',
    'boosters': 'booster',
    'promo': 'promo'
}

for var_name, cat_key in replacements.items():
    content = re.sub(rf'\{{{var_name}\.length > 0', f'{{(groupedProducts["{cat_key}"] || []).length > 0', content)
    content = re.sub(rf'{var_name}\.map\(', f'(groupedProducts["{cat_key}"] || []).map(', content)


# Next, we need to append the Dynamic Fallback block for any unknown categories
dynamic_fallback_block = """
        {/* --- DYNAMIC FALLBACK FOR UNKNOWN CATEGORIES --- */}
        {serviceCategories.filter(cat => !['server', 'addon', 'bot', 'infra', 'scripts', 'events', 'joins', 'decorations_gift', 'decorations_login', 'nitro_accounts', 'booster', 'promo'].includes(cat)).map(cat => (
          <section key={cat} className="mb-24 mt-16" id={cat}>
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 capitalize text-brand-primary">
              <span className="text-3xl">{getCategoryMeta(cat).icon}</span>
              {getCategoryMeta(cat).label}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(groupedProducts[cat] || []).map(item => {
                const key = item.product_key || String(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(key)}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col p-6 rounded-2xl relative group ${isSelected(key) ? 'border-brand-primary bg-brand-primary/5' : 'border-white/5 hover:border-brand-primary/30'}`}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); setModalProduct(item); }}
                      className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/5 hover:bg-brand-primary/20 flex items-center justify-center text-gray-500 hover:text-brand-primary transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    {item.tag && (
                      <div className="text-[9px] font-bold px-2 py-1 rounded-full mb-3 inline-block w-fit border border-brand-primary/20 text-brand-primary bg-brand-primary/10">
                        {item.tag.split('|')[0].trim()}
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2 mt-2">
                      <h3 className="font-bold text-lg">{item.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 flex-grow">{item.description}</p>
                    <PriceDisplay product={item} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
"""

# Let's insert the dynamic fallback right after promo section
content = content.replace("</section>\n        )}", "</section>\n        )}\n" + dynamic_fallback_block, 1)

# The end of the services div and the start of the subscriptions div.
# We need to find the end of the main content div which was `<div className="flex-1 w-full min-w-0">` and is now `<div className="space-y-4">`.
# Wait, let's just find `</main>` and put our subscriptions block before it.
subscriptions_block = """
          </div>
          )}

          {activeShopTab === 'subscriptions' && (
            <div className="space-y-4 min-h-[50vh]">
              <section className="mb-20 animate-fade-in" id="subscriptions">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 text-purple-400 font-bold tracking-widest uppercase text-xs mb-3 px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                    <Bot className="w-4 h-4" /> Premium Access
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 font-display">Bot <span className="text-purple-400">Subscriptions</span></h2>
                  <p className="text-gray-400 max-w-xl mx-auto">Get exclusive, ultra-low latency bot hosting and premium guard protection on a monthly or yearly basis.</p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                  {(groupedProducts['subscriptions'] || []).map(item => {
                    const key = item.product_key || String(item.id);
                    return (
                      <motion.div
                        whileHover={{ y: -5 }}
                        key={item.id}
                        onClick={() => toggleItem(key)}
                        className={`glass-card border-2 cursor-pointer transition-all flex flex-col relative group ${isSelected(key) ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : 'border-white/10 hover:border-purple-500/40'}`}
                      >
                        <div className="p-6 flex flex-col h-full">
                          {item.tag && (
                            <div className="absolute -top-3 right-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full shadow-lg border border-white/20">
                              {item.tag.split('|')[0].trim()}
                            </div>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); setModalProduct(item); }}
                            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/5 hover:bg-purple-500/20 flex items-center justify-center text-gray-500 hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          
                          <h3 className="font-bold text-xl mb-2 pr-8">{item.name}</h3>
                          <p className="text-sm text-gray-400 mb-6 flex-grow">{item.description}</p>
                          
                          <div className="mb-6 pb-6 border-b border-white/10">
                            <PriceDisplay product={item} />
                          </div>
                          
                          <ul className="space-y-3 mb-8">
                            {(Array.isArray(item.features) ? item.features : []).map((f, i) => (
                              <li key={i} className="flex items-start gap-3 text-xs text-gray-300">
                                <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                                <span className="leading-relaxed">{f}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <button
                            className={`w-full py-3 rounded-xl font-bold transition-all mt-auto ${isSelected(key) ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-white/5 hover:bg-white/10'}`}
                          >
                            {isSelected(key) ? 'Selected ✓' : 'Subscribe Now'}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
"""

content = re.sub(r'</div>\s*</main>', subscriptions_block + '\n        </div>\n      </main>', content)


with open('src/pages/Shop.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Shop.jsx")
