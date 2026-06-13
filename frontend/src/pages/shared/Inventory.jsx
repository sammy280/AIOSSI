import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency, cn } from '../../lib/utils';
import { Plus, AlertTriangle, TrendingDown, TrendingUp, ArrowUpDown } from 'lucide-react';

export default function InventoryPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [showAdjust, setShowAdjust] = useState(null);
  const [adjustData, setAdjustData] = useState({ type: 'IN', quantity: '', reason: '' });
  const [form, setForm] = useState({ name: '', category: '', quantity: '', unit: 'kg', costPrice: '', minimumStock: '', isLiquor: false, bottleVolume: '', fullBottles: 0, halfBottles: 0, quarterBottles: 0, fullBottlePrice: '', halfBottlePrice: '', quarterBottlePrice: '' });
  const [editItem, setEditItem] = useState(null);
  const updateItem = useMutation({ mutationFn: ({ id, ...d }) => api.put(`/inventory/${id}`, d), onSuccess: () => { qc.invalidateQueries(['inventory']); setEditItem(null); } });
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ['inventory'], queryFn: () => api.get('/inventory') });
  const createItem = useMutation({ mutationFn: (d) => api.post('/inventory', d), onSuccess: () => { qc.invalidateQueries(['inventory']); setShowAdd(false); } });
  const adjustItem = useMutation({ mutationFn: ({ id, ...d }) => api.post(`/inventory/${id}/adjust`, d), onSuccess: () => { qc.invalidateQueries(['inventory']); setShowAdjust(null); } });

  const items = data?.data || [];
  const lowStock = items.filter(i => i.isLowStock);
  const outOfStock = items.filter(i => i.isOutOfStock);

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Management" subtitle={`${items.length} items tracked`}
        actions={<>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </>}
      />

      {/* Alerts */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {outOfStock.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="font-semibold text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {outOfStock.length} Out of Stock</p>
              <p className="text-sm text-muted-foreground mt-1">{outOfStock.map(i => i.name).join(', ')}</p>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <p className="font-semibold text-orange-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {lowStock.length} Low Stock</p>
              <p className="text-sm text-muted-foreground mt-1">{lowStock.map(i => i.name).join(', ')}</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-accent/50 border-b border-border">
            <tr>{['Item', 'Category', 'Stock', 'Bottles (F/H/Q)', 'Cost Price', 'Min Stock', 'Status', 'Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className={cn('border-b border-border/50 hover:bg-accent/30', item.isOutOfStock && 'bg-red-500/5', item.isLowStock && !item.isOutOfStock && 'bg-orange-500/5')}>
                <td className="px-4 py-3 font-medium">
                  {item.name}
                  {item.isLiquor && <span className="ml-2 text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">🍾 Liquor</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                <td className="px-4 py-3 font-bold">{parseFloat(item.quantity).toFixed(2)} {item.unit}</td>
                <td className="px-4 py-3 text-xs">
                  {item.isLiquor ? (
                    <div className="flex gap-2">
                      <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded" title="Full bottles">F:{item.fullBottles || 0}</span>
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded" title="Half bottles">H:{item.halfBottles || 0}</span>
                      <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded" title="Quarter bottles">Q:{item.quarterBottles || 0}</span>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">{formatCurrency(item.costPrice)}</td>
                <td className="px-4 py-3 text-muted-foreground">{parseFloat(item.minimumStock)}</td>
                <td className="px-4 py-3">
                  <span className={cn('badge-status border', item.isOutOfStock ? 'bg-red-500/15 text-red-400 border-red-500/30' : item.isLowStock ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-green-500/15 text-green-400 border-green-500/30')}>
                    {item.isOutOfStock ? 'OUT' : item.isLowStock ? 'LOW' : 'OK'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setEditItem(item)} className="px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-medium">
                      Edit
                    </button>
                    <button onClick={() => setShowAdjust(item)} className="px-2 py-1 bg-accent hover:bg-border rounded-lg text-xs font-medium flex items-center gap-1">
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Adjust modal */}
      {showAdjust && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-4">Adjust Stock — {showAdjust.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">Current: {parseFloat(showAdjust.quantity)} {showAdjust.unit}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <div className="flex gap-2">
                  {[['IN','+ Stock In'],['OUT','- Stock Out'],['ADJUSTMENT','Set Value']].map(([v, l]) => (
                    <button key={v} onClick={() => setAdjustData(d => ({...d, type: v}))}
                      className={cn('flex-1 py-2 rounded-lg text-xs font-medium border-2 transition-all', adjustData.type === v ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity ({showAdjust.unit})</label>
                <input type="number" min="0" step="0.01" value={adjustData.quantity} onChange={e => setAdjustData(d => ({...d, quantity: e.target.value}))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <input type="text" value={adjustData.reason} onChange={e => setAdjustData(d => ({...d, reason: e.target.value}))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" placeholder="Delivery, damaged, etc." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => adjustItem.mutate({ id: showAdjust.id, ...adjustData })} disabled={adjustItem.isPending} className="flex-1 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90">
                  {adjustItem.isPending ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setShowAdjust(null)} className="flex-1 py-2 bg-accent rounded-xl font-medium">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add item modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold mb-4">Add Inventory Item</h3>
            <form onSubmit={e => { e.preventDefault(); createItem.mutate(form); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[['name','Name'],['category','Category'],['quantity','Initial Qty'],['unit','Unit'],['costPrice','Cost Price'],['minimumStock','Min Stock']].map(([k, l]) => (
                  <div key={k}>
                    <label className="block text-sm font-medium mb-1">{l}</label>
                    <input type={['quantity','costPrice','minimumStock'].includes(k) ? 'number' : 'text'} step="0.01"
                      value={form[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))} required
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isLiquor} onChange={e => setForm(f => ({...f, isLiquor: e.target.checked}))} className="w-4 h-4 rounded" />
                Track as Liquor (by volume)
              </label>
              {form.isLiquor && (
                <div className="bg-accent/30 border border-border rounded-xl p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🍾 Bottle Size Stock & Prices</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['fullBottles','Full Qty','number'],['halfBottles','Half Qty','number'],['quarterBottles','Quarter Qty','number']].map(([k,l,t]) => (
                      <div key={k}><label className="block text-xs font-medium mb-1">{l}</label>
                      <input type={t} min="0" value={form[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none" /></div>
                    ))}
                    {[['fullBottlePrice','Full Price','number'],['halfBottlePrice','Half Price','number'],['quarterBottlePrice','Quarter Price','number']].map(([k,l,t]) => (
                      <div key={k}><label className="block text-xs font-medium mb-1">{l} (RWF)</label>
                      <input type={t} min="0" step="100" value={form[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none" /></div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={createItem.isPending} className="flex-1 py-2 bg-primary text-white rounded-xl font-medium">
                  {createItem.isPending ? 'Adding...' : 'Add Item'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-accent rounded-xl font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit item modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-auto">
            <h3 className="font-semibold mb-4">Edit — {editItem.name}</h3>
            <form onSubmit={e => {
              e.preventDefault();
              updateItem.mutate({ id: editItem.id, ...editItem });
            }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[['name','Name'],['category','Category'],['quantity','Stock Qty'],['unit','Unit'],['costPrice','Cost Price'],['minimumStock','Min Stock']].map(([k, l]) => (
                  <div key={k}>
                    <label className="block text-sm font-medium mb-1">{l}</label>
                    <input type={['quantity','costPrice','minimumStock'].includes(k) ? 'number' : 'text'} step="0.01"
                      value={editItem[k] ?? ''} onChange={e => setEditItem(i => ({...i, [k]: e.target.value}))} required
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                  </div>
                ))}
              </div>
              {editItem.isLiquor && (
                <div className="bg-accent/30 border border-border rounded-xl p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🍾 Bottle Stock & Prices</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['fullBottles','Full Qty'],['halfBottles','Half Qty'],['quarterBottles','Quarter Qty']].map(([k,l]) => (
                      <div key={k}><label className="block text-xs font-medium mb-1">{l}</label>
                      <input type="number" min="0" value={editItem[k] ?? 0} onChange={e => setEditItem(i => ({...i, [k]: e.target.value}))}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none" /></div>
                    ))}
                    {[['fullBottlePrice','Full (RWF)'],['halfBottlePrice','Half (RWF)'],['quarterBottlePrice','Quarter (RWF)']].map(([k,l]) => (
                      <div key={k}><label className="block text-xs font-medium mb-1">{l}</label>
                      <input type="number" min="0" step="100" value={editItem[k] ?? ''} onChange={e => setEditItem(i => ({...i, [k]: e.target.value}))}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none" /></div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={updateItem.isPending} className="flex-1 py-2 bg-primary text-white rounded-xl font-medium">
                  {updateItem.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditItem(null)} className="flex-1 py-2 bg-accent rounded-xl font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
