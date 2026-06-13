import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ProductCard from '../components/ui/ProductCard';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../lib/utils';

const TYPE_TABS = [
  { key: 'ALL', label: '🍽️ All' },
  { key: 'FOOD', label: '🍳 Food' },
  { key: 'DRINK', label: '🍺 Drinks' },
];

export default function MenuPage() {
  const [type, setType] = useState('ALL');
  const [categoryId, setCategoryId] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Get flat products list (with category info) — only available ones
  const { data: prodData, isLoading } = useQuery({
    queryKey: ['online-products'],
    queryFn: () => api.get('/online/products'),
  });

  // Get categories list
  const { data: catData } = useQuery({
    queryKey: ['online-categories'],
    queryFn: () => api.get('/online/categories'),
  });

  const allProducts = prodData?.data || [];
  const allCategories = catData?.data || [];

  // Categories filtered by current type tab
  const filteredCategories = useMemo(() => {
    if (type === 'ALL') return allCategories;
    return allCategories.filter(c => c.type === type);
  }, [allCategories, type]);

  // Products filtered by type, category, search
  const filteredProducts = useMemo(() => {
    let list = allProducts;
    if (type !== 'ALL') list = list.filter(p => p.category?.type === type);
    if (categoryId !== 'all') list = list.filter(p => p.categoryId === categoryId);
    if (search) list = list.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    );
    if (sortBy === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [allProducts, type, categoryId, search, sortBy]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-black mb-2">Our Menu</h1>
          <p className="text-gray-400">Fresh food and premium drinks, delivered to you</p>

          <div className="relative mt-6 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for food or drinks..."
              className="w-full pl-12 pr-10 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-brand focus:bg-white/20 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Type Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setType(tab.key); setCategoryId('all'); }}
              className={cn(
                'px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all',
                type === tab.key
                  ? 'bg-brand text-white shadow-lg shadow-brand/20'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-brand'
              )}
            >
              {tab.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand bg-white"
            >
              <option value="name">A → Z</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Category Sidebar — desktop */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-24">
              <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">Categories</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setCategoryId('all')}
                  className={cn('w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                    categoryId === 'all' ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  All Items ({filteredProducts.length})
                </button>
                {filteredCategories.map(cat => {
                  const count = allProducts.filter(p => p.categoryId === cat.id && (type === 'ALL' || p.category?.type === type)).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className={cn('w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between',
                        categoryId === cat.id ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <span>{cat.icon} {cat.name}</span>
                      <span className={cn('text-xs', categoryId === cat.id ? 'text-orange-100' : 'text-gray-400')}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Category Scroll — mobile */}
          <div className="lg:hidden -mx-4 px-4 mb-4 overflow-x-auto w-full">
            <div className="flex gap-2 w-max pb-2">
              <button onClick={() => setCategoryId('all')} className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap', categoryId === 'all' ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600')}>
                All
              </button>
              {filteredCategories.map(cat => (
                <button key={cat.id} onClick={() => setCategoryId(cat.id)} className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap', categoryId === cat.id ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600')}>
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {isLoading && (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
                ))}
              </div>
            )}
            {!isLoading && search && (
              <p className="text-sm text-gray-500 mb-4">
                {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for "<span className="font-semibold text-gray-800">{search}</span>"
              </p>
            )}
            {!isLoading && filteredProducts.length > 0 && (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
            {!isLoading && filteredProducts.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <span className="text-6xl">🍽️</span>
                <p className="mt-4 text-lg font-semibold text-gray-600">No items found</p>
                <p className="text-sm mt-1">Try a different category or search term</p>
                {allProducts.length === 0 && (
                  <p className="mt-3 text-xs text-gray-300">Menu is currently loading or empty. Please try again shortly.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
