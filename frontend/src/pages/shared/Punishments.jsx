import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { Gavel, Check, X } from 'lucide-react';

export default function PunishmentsPage() {
  const { user } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ employeeId: '', reason: '', type: 'WARNING', amount: '' });
  const qc = useQueryClient();
  const { data: punishments } = useQuery({ queryKey: ['punishments'], queryFn: () => api.get('/punishments') });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users') });
  const create = useMutation({ mutationFn: d => api.post('/punishments', d), onSuccess: () => { qc.invalidateQueries(['punishments']); setShowAdd(false); } });
  const approve = useMutation({ mutationFn: id => api.patch(`/punishments/${id}/approve`), onSuccess: () => qc.invalidateQueries(['punishments']) });
  const reject = useMutation({ mutationFn: id => api.patch(`/punishments/${id}/reject`, { rejectionReason: 'Rejected by admin' }), onSuccess: () => qc.invalidateQueries(['punishments']) });

  return (
    <div className="space-y-6">
      <PageHeader title="Punishments" actions={
        user?.role === 'MANAGER' && <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"><Gavel className="w-4 h-4" /> Submit Punishment</button>
      } />
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-accent/50 border-b border-border">
            <tr>{['Employee','Type','Reason','Submitted By','Status','Date','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(punishments?.data || []).map(p => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="px-4 py-3 font-medium">{p.employee?.name}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs font-semibold">{p.type}</span></td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{p.reason}</td>
                <td className="px-4 py-3">{p.submitter?.name}</td>
                <td className="px-4 py-3"><Badge status={p.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                <td className="px-4 py-3">
                  {p.status === 'PENDING' && user?.role === 'ADMIN' && (
                    <div className="flex gap-2">
                      <button onClick={() => approve.mutate(p.id)} className="p-1.5 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20"><Check className="w-4 h-4" /></button>
                      <button onClick={() => reject.mutate(p.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-96">
            <h3 className="font-semibold mb-4">Submit Punishment</h3>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Employee</label>
              <select value={form.employeeId} onChange={e => setForm(f => ({...f, employeeId: e.target.value}))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
                <option value="">Select...</option>
                {(users?.data || []).filter(u => u.isActive && u.id !== user?.id).map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select></div>
              <div><label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
                {['WARNING','FINE','SUSPENSION'].map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
              <div><label className="block text-sm font-medium mb-1">Reason</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none" rows={3} /></div>
              {form.type === 'FINE' && <div><label className="block text-sm font-medium mb-1">Fine Amount</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" /></div>}
              <div className="flex gap-3"><button type="submit" disabled={create.isPending} className="flex-1 py-2 bg-primary text-white rounded-xl font-medium">Submit</button>
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-accent rounded-xl">Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
