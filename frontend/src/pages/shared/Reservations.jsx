import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import { formatDate } from '../../lib/utils';
import { Plus } from 'lucide-react';

const STATUSES = ['PENDING','CONFIRMED','ARRIVED','CANCELLED','COMPLETED'];

export default function ReservationsPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ customerName: '', phone: '', tableId: '', guestCount: '', reservationDate: '', reservationTime: '19:00', notes: '' });
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['reservations'], queryFn: () => api.get('/reservations') });
  const { data: tables } = useQuery({ queryKey: ['tables'], queryFn: () => api.get('/tables') });
  const create = useMutation({ mutationFn: d => api.post('/reservations', d), onSuccess: () => { qc.invalidateQueries(['reservations']); setShowAdd(false); } });
  const updateStatus = useMutation({ mutationFn: ({ id, status }) => api.patch(`/reservations/${id}/status`, { status }), onSuccess: () => qc.invalidateQueries(['reservations']) });

  return (
    <div className="space-y-6">
      <PageHeader title="Reservations" actions={
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4" /> New Reservation</button>
      } />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.data || []).map(r => (
          <div key={r.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div><p className="font-semibold">{r.customerName}</p><p className="text-sm text-muted-foreground">{r.phone}</p></div>
              <Badge status={r.status} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-accent/50 rounded-lg p-2 text-center"><p className="font-bold">Table {r.table?.name}</p><p className="text-xs text-muted-foreground">Table</p></div>
              <div className="bg-accent/50 rounded-lg p-2 text-center"><p className="font-bold">{r.guestCount}</p><p className="text-xs text-muted-foreground">Guests</p></div>
              <div className="bg-accent/50 rounded-lg p-2 text-center"><p className="font-bold text-xs">{r.reservationTime}</p><p className="text-xs text-muted-foreground">{formatDate(r.reservationDate)}</p></div>
            </div>
            {r.status === 'PENDING' && (
              <div className="flex gap-2">
                <button onClick={() => updateStatus.mutate({ id: r.id, status: 'CONFIRMED' })} className="flex-1 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium">Confirm</button>
                <button onClick={() => updateStatus.mutate({ id: r.id, status: 'CANCELLED' })} className="flex-1 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium">Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold mb-4">New Reservation</h3>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[['customerName','Customer Name'],['phone','Phone'],['guestCount','Guest Count'],['reservationDate','Date'],['reservationTime','Time']].map(([k,l]) => (
                  <div key={k}><label className="block text-sm font-medium mb-1">{l}</label>
                  <input type={k === 'guestCount' ? 'number' : k.includes('Date') ? 'date' : k.includes('Time') ? 'time' : 'text'} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" /></div>
                ))}
                <div><label className="block text-sm font-medium mb-1">Table</label>
                <select value={form.tableId} onChange={e => setForm(f => ({...f, tableId: e.target.value}))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
                  <option value="">Select...</option>
                  {(tables?.data || []).map(t => <option key={t.id} value={t.id}>Table {t.name}</option>)}
                </select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none" rows={2} /></div>
              <div className="flex gap-3"><button type="submit" disabled={create.isPending} className="flex-1 py-2 bg-primary text-white rounded-xl font-medium">Book</button>
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-accent rounded-xl">Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
