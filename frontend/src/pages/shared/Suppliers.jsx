import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Plus, Truck } from 'lucide-react';

export default function SuppliersPage() {
  const [tab, setTab] = useState('suppliers');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', email: '', address: '', products: '' });
  const [purchaseForm, setPurchaseForm] = useState({ supplierId: '', product: '', quantity: '', unit: 'kg', unitCost: '', isPaid: false, notes: '' });
  const qc = useQueryClient();
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers') });
  const { data: purchases } = useQuery({ queryKey: ['purchases'], queryFn: () => api.get('/suppliers/purchases') });
  const createSupplier = useMutation({ mutationFn: d => api.post('/suppliers', d), onSuccess: () => { qc.invalidateQueries(['suppliers']); setShowAdd(false); } });
  const createPurchase = useMutation({ mutationFn: d => api.post('/suppliers/purchases', d), onSuccess: () => { qc.invalidateQueries(['purchases']); setShowAdd(false); } });

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" actions={
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4" /> {tab === 'suppliers' ? 'Add Supplier' : 'Record Purchase'}</button>
      } />
      <div className="flex gap-2">
        {[['suppliers','Suppliers'],['purchases','Purchases']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === v ? 'bg-primary text-white' : 'bg-card border border-border'}`}>{l}</button>
        ))}
      </div>

      {tab === 'suppliers' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(suppliers?.data || []).map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3"><Truck className="w-5 h-5 text-primary" /><h3 className="font-semibold">{s.name}</h3></div>
              <p className="text-sm text-muted-foreground">{s.contact}</p>
              <p className="text-sm text-muted-foreground">{s.address}</p>
              <p className="text-xs text-muted-foreground mt-2">{s.products}</p>
              <p className="text-xs text-primary mt-2">{s.purchases?.length || 0} purchases</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'purchases' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-accent/50 border-b border-border">
              <tr>{['Supplier','Product','Qty','Unit Cost','Total','Paid','Date'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
            </thead>
            <tbody>
              {(purchases?.data || []).map(p => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="px-4 py-3">{p.supplier?.name}</td>
                  <td className="px-4 py-3">{p.product}</td>
                  <td className="px-4 py-3">{parseFloat(p.quantity)} {p.unit}</td>
                  <td className="px-4 py-3">{formatCurrency(p.unitCost)}</td>
                  <td className="px-4 py-3 font-bold">{formatCurrency(p.totalCost)}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold ${p.isPaid ? 'text-green-400' : 'text-red-400'}`}>{p.isPaid ? 'PAID' : 'UNPAID'}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && tab === 'suppliers' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-96">
            <h3 className="font-semibold mb-4">Add Supplier</h3>
            <form onSubmit={e => { e.preventDefault(); createSupplier.mutate(form); }} className="space-y-3">
              {[['name','Name'],['contact','Contact'],['email','Email'],['address','Address'],['products','Products Supplied']].map(([k,l]) => (
                <div key={k}><label className="block text-sm font-medium mb-1">{l}</label>
                <input type="text" value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" /></div>
              ))}
              <div className="flex gap-3"><button type="submit" disabled={createSupplier.isPending} className="flex-1 py-2 bg-primary text-white rounded-xl font-medium">Add</button>
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-accent rounded-xl">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {showAdd && tab === 'purchases' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-96">
            <h3 className="font-semibold mb-4">Record Purchase</h3>
            <form onSubmit={e => { e.preventDefault(); createPurchase.mutate(purchaseForm); }} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Supplier</label>
              <select value={purchaseForm.supplierId} onChange={e => setPurchaseForm(f => ({...f, supplierId: e.target.value}))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
                <option value="">Select...</option>
                {(suppliers?.data || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
              {[['product','Product','text'],['quantity','Quantity','number'],['unit','Unit','text'],['unitCost','Unit Cost (RWF)','number'],['notes','Notes','text']].map(([k,l,t]) => (
                <div key={k}><label className="block text-sm font-medium mb-1">{l}</label>
                <input type={t} value={purchaseForm[k]} onChange={e => setPurchaseForm(f => ({...f,[k]:e.target.value}))} required={k !== 'notes'} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" /></div>
              ))}
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={purchaseForm.isPaid} onChange={e => setPurchaseForm(f => ({...f, isPaid: e.target.checked}))} className="w-4 h-4" /> Paid</label>
              <div className="flex gap-3"><button type="submit" disabled={createPurchase.isPending} className="flex-1 py-2 bg-primary text-white rounded-xl font-medium">Record</button>
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-accent rounded-xl">Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
