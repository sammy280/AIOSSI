import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { Plus, X, CheckCircle, XCircle, ShoppingBag, Package, ClipboardList } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  APPROVED: 'bg-green-500/10 text-green-400 border-green-500/30',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/30',
  PURCHASED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  DELIVERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

const URGENCY_COLORS = {
  LOW: 'text-muted-foreground', NORMAL: 'text-blue-400', HIGH: 'text-orange-400', URGENT: 'text-red-500 font-bold',
};

const CATEGORIES = ['FOOD', 'BEVERAGES', 'MATERIALS', 'CLEANING_SUPPLIES', 'OTHER'];

export default function RequisitionsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [poForm, setPoForm] = useState({ supplier: '', totalCost: '', notes: '' });
  const [showPo, setShowPo] = useState(false);

  const isManager = ['ADMIN', 'MANAGER'].includes(user?.role);

  const [form, setForm] = useState({
    title: '', category: 'FOOD', urgency: 'NORMAL', notes: '',
    items: [{ name: '', quantity: 1, unit: 'unit', estimatedCost: '', notes: '' }],
  });

  const { data: reqData } = useQuery({
    queryKey: ['requisitions', statusFilter],
    queryFn: () => api.get(`/requisitions${statusFilter ? `?status=${statusFilter}` : ''}`),
    refetchInterval: 15000,
  });

  const createReq = useMutation({
    mutationFn: (d) => api.post('/requisitions', d),
    onSuccess: () => { qc.invalidateQueries(['requisitions']); setShowCreate(false); toast.success('Requisition submitted'); },
  });

  const reviewReq = useMutation({
    mutationFn: ({ id, status, reviewNote }) => api.patch(`/requisitions/${id}/review`, { status, reviewNote }),
    onSuccess: () => { qc.invalidateQueries(['requisitions']); setSelected(null); toast.success('Reviewed'); },
  });

  const createPo = useMutation({
    mutationFn: ({ id, ...data }) => api.post(`/requisitions/${id}/purchase-order`, data),
    onSuccess: () => { qc.invalidateQueries(['requisitions']); setShowPo(false); setSelected(null); toast.success('Purchase order created'); },
  });

  const deliverReq = useMutation({
    mutationFn: (id) => api.patch(`/requisitions/${id}/deliver`),
    onSuccess: () => { qc.invalidateQueries(['requisitions']); setSelected(null); toast.success('Marked as delivered'); },
  });

  const requisitions = reqData?.data || [];

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { name: '', quantity: 1, unit: 'unit', estimatedCost: '', notes: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, value) => setForm(f => ({
    ...f,
    items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requisitions"
        subtitle={`${requisitions.length} requests`}
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium">
            <Plus className="w-4 h-4" /> New Requisition
          </button>
        }
      />

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['', 'PENDING', 'APPROVED', 'REJECTED', 'PURCHASED', 'DELIVERED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('px-4 py-1.5 rounded-xl text-sm font-medium border transition-all',
              statusFilter === s ? 'bg-primary text-white border-primary' : 'bg-accent border-border text-muted-foreground hover:text-foreground'
            )}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Requisition list */}
      <div className="space-y-3">
        {requisitions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="w-16 h-16 mx-auto mb-3 opacity-20" />
            <p>No requisitions found</p>
          </div>
        )}
        {requisitions.map(r => (
          <div key={r.id} onClick={() => setSelected(r)}
            className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/40 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold truncate">{r.title}</h3>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_COLORS[r.status])}>{r.status}</span>
                  <span className={cn('text-xs font-semibold', URGENCY_COLORS[r.urgency])}>{r.urgency}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {r.category.replace('_', ' ')} · {r.items.length} item(s) · by {r.requestedBy?.name} ({r.requestedBy?.role})
                </p>
                {r.reviewNote && (
                  <p className="text-xs text-yellow-400 mt-1">Note: {r.reviewNote}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(r.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{selected.title}</h3>
                <p className="text-sm text-muted-foreground">{selected.category} · {selected.status}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-accent rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <table className="w-full text-sm">
                <thead className="bg-accent/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-muted-foreground">Item</th>
                    <th className="text-right px-3 py-2 text-xs text-muted-foreground">Qty</th>
                    <th className="text-left px-3 py-2 text-xs text-muted-foreground">Unit</th>
                    <th className="text-right px-3 py-2 text-xs text-muted-foreground">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map(item => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium">{item.name}</td>
                      <td className="px-3 py-2 text-right">{parseFloat(item.quantity)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.unit}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{item.estimatedCost ? formatCurrency(item.estimatedCost) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selected.notes && <p className="text-sm text-muted-foreground">Notes: {selected.notes}</p>}
              {selected.reviewNote && <p className="text-sm text-yellow-400">Review note: {selected.reviewNote}</p>}
              {selected.purchaseOrder && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-400 mb-1">Purchase Order Created</p>
                  <p className="text-xs text-muted-foreground">Supplier: {selected.purchaseOrder.supplier || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">Total Cost: {formatCurrency(selected.purchaseOrder.totalCost)}</p>
                </div>
              )}

              {/* Manager actions */}
              {isManager && selected.status === 'PENDING' && (
                <div className="space-y-3 pt-2">
                  <textarea placeholder="Review note (optional)" value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                    rows={2} className="w-full text-sm bg-accent border border-border rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                  <div className="flex gap-3">
                    <button onClick={() => reviewReq.mutate({ id: selected.id, status: 'APPROVED', reviewNote })}
                      disabled={reviewReq.isPending}
                      className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => reviewReq.mutate({ id: selected.id, status: 'REJECTED', reviewNote })}
                      disabled={reviewReq.isPending}
                      className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              )}

              {isManager && selected.status === 'APPROVED' && !selected.purchaseOrder && (
                <button onClick={() => setShowPo(true)}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Create Purchase Order
                </button>
              )}

              {isManager && selected.status === 'PURCHASED' && (
                <button onClick={() => deliverReq.mutate(selected.id)} disabled={deliverReq.isPending}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  <Package className="w-4 h-4" /> Mark as Delivered
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order modal */}
      {showPo && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-96">
            <h3 className="font-semibold mb-4">Create Purchase Order</h3>
            <div className="space-y-3">
              {[['supplier', 'Supplier Name', 'text'], ['totalCost', 'Total Cost (RWF)', 'number'], ['notes', 'Notes', 'text']].map(([k, l, t]) => (
                <div key={k}>
                  <label className="block text-sm font-medium mb-1">{l}</label>
                  <input type={t} value={poForm[k]} onChange={e => setPoForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                </div>
              ))}
              <div className="flex gap-3">
                <button onClick={() => createPo.mutate({ id: selected.id, ...poForm })} disabled={createPo.isPending}
                  className="flex-1 py-2 bg-primary text-white rounded-xl font-medium disabled:opacity-50">
                  {createPo.isPending ? 'Creating…' : 'Create PO'}
                </button>
                <button onClick={() => setShowPo(false)} className="flex-1 py-2 bg-accent rounded-xl">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create requisition modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">New Requisition</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-accent rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Weekly food supplies" required
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select></div>
                <div><label className="block text-sm font-medium mb-1">Urgency</label>
                <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
                  {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(u => <option key={u} value={u}>{u}</option>)}
                </select></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Items</label>
                  <button onClick={addItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add item</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <input placeholder="Item name" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} required
                        className="flex-1 px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                      <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="0.1" step="0.1"
                        className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none text-right" />
                      <input placeholder="Unit" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}
                        className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                      <input type="number" placeholder="Cost" value={item.estimatedCost} onChange={e => updateItem(i, 'estimatedCost', e.target.value)}
                        className="w-20 px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none text-right" />
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="p-1.5 hover:bg-red-500/10 rounded text-red-400 shrink-0"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div><label className="block text-sm font-medium mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none" /></div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button onClick={() => createReq.mutate(form)} disabled={createReq.isPending || !form.title || form.items.some(i => !i.name)}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium disabled:opacity-50">
                {createReq.isPending ? 'Submitting…' : 'Submit Requisition'}
              </button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-accent rounded-xl">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
