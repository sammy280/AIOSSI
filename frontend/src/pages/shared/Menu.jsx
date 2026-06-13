import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency, cn } from '../../lib/utils';
import { Plus, Edit, ToggleLeft, ToggleRight } from 'lucide-react';

export default function MenuPage() {
  const [tab, setTab] = useState('FOOD');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', categoryId: '', preparationTime: '' });
  const qc = useQueryClient();
  const { data: cats } = useQuery({ queryKey: ['categories', tab], queryFn: () => api.get(`/menu/categories?type=${tab}`) });
  const { data: products } = useQuery({ queryKey: ['products-all', tab], queryFn: () => api.get(`/menu/products?type=${tab}`) });
  const createProduct = useMutation({ mutationFn: (d) => api.post('/menu/products', d), onSuccess: () => { qc.invalidateQueries(['products-all']); setShowAdd(false); } });
  const toggle = useMutation({ mutationFn: (id) => api.patch(`/menu/products/${id}/toggle`), onSuccess: () => qc.invalidateQueries(['products-all']) });

  return (
    <div className="space-y-6">
      <PageHeader title="Menu Management" actions={
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4" /> Add Product</button>
      } />
      <div className="flex gap-2">
        {['FOOD','DRINK'].map(t => <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 rounded-xl text-sm font-semibold', tab === t ? 'bg-primary text-white' : 'bg-accent')}>{t}</button>)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {(products?.data || []).map(p => (
          <div key={p.id} className={cn('bg-card border rounded-xl p-4 space-y-2', p.isAvailable ? 'border-border' : 'border-border opacity-50')}>
            <p className="font-semibold text-sm">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.category?.name}</p>
            <p className="text-primary font-bold">{formatCurrency(p.price)}</p>
            <button onClick={() => toggle.mutate(p.id)} className={cn('w-full py-1 rounded-lg text-xs font-medium', p.isAvailable ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}>
              {p.isAvailable ? '● Available' : '○ Unavailable'}
            </button>
          </div>
        ))}
      </div>
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-96">
            <h3 className="font-semibold mb-4">Add Product</h3>
            <form onSubmit={e => { e.preventDefault(); createProduct.mutate({...form, price: parseFloat(form.price), preparationTime: parseInt(form.preparationTime)}); }} className="space-y-3">
              {[['name','Name'],['description','Description'],['price','Price (RWF)'],['preparationTime','Prep Time (min)']].map(([k,l]) => (
                <div key={k}><label className="block text-sm font-medium mb-1">{l}</label>
                <input type={k === 'price' || k === 'preparationTime' ? 'number' : 'text'} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" /></div>
              ))}
              <div><label className="block text-sm font-medium mb-1">Category</label>
              <select value={form.categoryId} onChange={e => setForm(f => ({...f, categoryId: e.target.value}))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
                <option value="">Select...</option>
                {(cats?.data || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
              <div className="flex gap-3"><button type="submit" disabled={createProduct.isPending} className="flex-1 py-2 bg-primary text-white rounded-xl font-medium">{createProduct.isPending ? 'Adding...' : 'Add'}</button>
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-accent rounded-xl">Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
