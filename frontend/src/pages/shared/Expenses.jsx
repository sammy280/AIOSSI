import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Plus } from 'lucide-react';

const CATEGORIES = ['Electricity', 'Water', 'Internet', 'Rent', 'Salaries', 'Supplies', 'Maintenance', 'Marketing', 'Transport', 'Other'];

export default function ExpensesPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: 'Other', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['expenses'], queryFn: () => api.get('/expenses') });
  const create = useMutation({ mutationFn: d => api.post('/expenses', d), onSuccess: () => { qc.invalidateQueries(['expenses']); setShowAdd(false); setForm({ category: 'Other', description: '', amount: '', date: new Date().toISOString().split('T')[0] }); } });

  const expenses = data?.data || [];
  const total = data?.meta?.total || 0;
  const byCategory = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount); return acc; }, {});

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Management" subtitle={`Total: ${formatCurrency(total)}`}
        actions={<button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4" /> Add Expense</button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(byCategory).slice(0, 4).map(([cat, amt]) => (
          <div key={cat} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-primary">{formatCurrency(amt)}</p>
            <p className="text-xs text-muted-foreground mt-1">{cat}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-accent/50 border-b border-border">
            <tr>{['Category','Description','Amount','Date','Recorded By'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id} className="border-b border-border/50 hover:bg-accent/30">
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-accent rounded text-xs">{e.category}</span></td>
                <td className="px-4 py-3">{e.description}</td>
                <td className="px-4 py-3 font-bold text-red-400">{formatCurrency(e.amount)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.recorder?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-96">
            <h3 className="font-semibold mb-4">Add Expense</h3>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
              {[['description','Description','text'],['amount','Amount (RWF)','number'],['date','Date','date']].map(([k,l,t]) => (
                <div key={k}><label className="block text-sm font-medium mb-1">{l}</label>
                <input type={t} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" /></div>
              ))}
              <div className="flex gap-3"><button type="submit" disabled={create.isPending} className="flex-1 py-2 bg-primary text-white rounded-xl font-medium">Add</button>
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-accent rounded-xl">Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
