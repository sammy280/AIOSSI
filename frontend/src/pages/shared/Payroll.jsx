import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Plus, DollarSign, Calculator, CheckCircle, Edit2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function PayrollPage() {
  const { user } = useAuthStore();
  const [showPay, setShowPay] = useState(false);
  const [showAutoCalc, setShowAutoCalc] = useState(false);
  const [calcPeriod, setCalcPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calcResults, setCalcResults] = useState([]);
  const [editedAmounts, setEditedAmounts] = useState({});
  const [filterPeriod, setFilterPeriod] = useState('');
  const [form, setForm] = useState({
    employeeId: '', amount: '',
    period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    daysWorked: '', hoursWorked: '', notes: '',
  });
  const qc = useQueryClient();

  const { data: payroll } = useQuery({ queryKey: ['payroll', filterPeriod], queryFn: () => api.get(`/payroll${filterPeriod ? `?period=${filterPeriod}` : ''}`) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users') });

  const createPayroll = useMutation({
    mutationFn: (d) => api.post('/payroll', d),
    onSuccess: () => { qc.invalidateQueries(['payroll']); setShowPay(false); toast.success('Payroll processed'); },
  });

  const bulkPayroll = useMutation({
    mutationFn: (d) => api.post('/payroll/bulk', d),
    onSuccess: (res) => {
      qc.invalidateQueries(['payroll']);
      setShowAutoCalc(false);
      setCalcResults([]);
      toast.success(res.message || 'Bulk payroll processed');
    },
  });

  const setSalary = useMutation({
    mutationFn: ({ userId, baseSalary }) => api.patch(`/payroll/salary/${userId}`, { baseSalary }),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('Base salary updated'); },
  });

  const calculatePayroll = async () => {
    try {
      const res = await api.get(`/payroll/calculate?period=${calcPeriod}`);
      setCalcResults(res.data || []);
      const initial = {};
      (res.data || []).forEach(e => { initial[e.employeeId] = e.netSalary; });
      setEditedAmounts(initial);
    } catch (e) {
      toast.error('Failed to calculate payroll');
    }
  };

  const handleBulkProcess = () => {
    const period = calcPeriod;
    const entries = calcResults
      .filter(e => !e.alreadyPaid)
      .map(e => ({
        employeeId: e.employeeId,
        amount: editedAmounts[e.employeeId] ?? e.netSalary,
        daysWorked: e.daysWorked,
        hoursWorked: e.hoursWorked,
        deductions: e.totalDeductions,
        notes: `Auto-calculated payroll for ${period}`,
      }));
    if (!entries.length) return toast.error('All selected employees already have payroll for this period');
    bulkPayroll.mutate({ entries, period });
  };

  const records = payroll?.data || [];
  const totalPaid = records.reduce((s, r) => s + parseFloat(r.amount), 0);
  const staffWithSalary = (users?.data || []).filter(u => u.isActive && u.profile);

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Management" subtitle={`${records.length} records`}
        actions={user?.role !== 'WAITER' && (
          <div className="flex gap-2">
            <button onClick={() => setShowAutoCalc(true)} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-border border border-border rounded-xl text-sm font-medium">
              <Calculator className="w-4 h-4" /> Auto Calculate
            </button>
            <button onClick={() => setShowPay(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium">
              <DollarSign className="w-4 h-4" /> Manual Payment
            </button>
          </div>
        )}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-primary">{formatCurrency(totalPaid)}</p>
          <p className="text-muted-foreground text-sm mt-1">Total Paid (Filtered)</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-3xl font-bold">{records.length}</p>
          <p className="text-muted-foreground text-sm mt-1">Total Payments</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-green-400">{new Set(records.map(r => r.employeeId)).size}</p>
          <p className="text-muted-foreground text-sm mt-1">Employees Paid</p>
        </div>
      </div>

      {/* Base Salary Setup */}
      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Employee Base Salaries</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {staffWithSalary.map(emp => (
              <div key={emp.id} className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.role}</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    defaultValue={parseFloat(emp.profile?.baseSalary || 0)}
                    onBlur={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setSalary.mutate({ userId: emp.id, baseSalary: val });
                    }}
                    className="w-24 text-xs text-right bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">RWF</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter + Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <h3 className="font-semibold flex-1">Payment History</h3>
          <input
            type="month"
            value={filterPeriod}
            onChange={e => setFilterPeriod(e.target.value)}
            className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {filterPeriod && <button onClick={() => setFilterPeriod('')} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-accent/50 border-b border-border">
            <tr>{['Employee', 'Role', 'Period', 'Amount', 'Deductions', 'Days', 'Paid By', 'Date'].map(h => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-accent/30">
                <td className="px-4 py-3 font-medium">{r.employee?.name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{r.employee?.role}</td>
                <td className="px-4 py-3">{r.period}</td>
                <td className="px-4 py-3 font-bold text-primary">{formatCurrency(r.amount)}</td>
                <td className="px-4 py-3 text-red-400 text-xs">{r.deductions ? `-${formatCurrency(r.deductions)}` : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.daysWorked || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.paidBy?.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(r.paymentDate)}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">No payroll records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Auto Calculate Modal */}
      {showAutoCalc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" /> Auto-Calculate Payroll</h3>
            </div>
            <div className="p-6 border-b border-border flex items-end gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Period</label>
                <input type="month" value={calcPeriod} onChange={e => setCalcPeriod(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button onClick={calculatePayroll} className="px-6 py-2 bg-primary text-white rounded-xl font-medium text-sm">
                Calculate
              </button>
            </div>

            {calcResults.length > 0 && (
              <div className="flex-1 overflow-auto p-6">
                <table className="w-full text-sm">
                  <thead className="bg-accent/50">
                    <tr>{['Employee', 'Base', 'Days', 'Absent', 'Deductions', 'Net Pay', 'Status'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {calcResults.map(e => (
                      <tr key={e.employeeId} className={cn('border-b border-border/50', e.alreadyPaid && 'opacity-50')}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{e.name}</p>
                          <p className="text-xs text-muted-foreground">{e.role}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{formatCurrency(e.baseSalary)}</td>
                        <td className="px-3 py-2">{e.daysWorked}</td>
                        <td className="px-3 py-2 text-red-400">{e.daysAbsent}</td>
                        <td className="px-3 py-2 text-red-400">-{formatCurrency(e.totalDeductions)}</td>
                        <td className="px-3 py-2">
                          {e.alreadyPaid ? (
                            <span className="text-green-400 text-xs font-semibold">✓ Paid</span>
                          ) : (
                            <input
                              type="number"
                              value={editedAmounts[e.employeeId] ?? e.netSalary}
                              onChange={ev => setEditedAmounts(a => ({ ...a, [e.employeeId]: parseFloat(ev.target.value) }))}
                              className="w-28 text-right bg-background border border-border rounded px-2 py-1 text-sm text-primary font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {e.alreadyPaid
                            ? <span className="text-xs text-green-400">Already paid</span>
                            : <span className="text-xs text-yellow-400">Pending</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button onClick={() => { setShowAutoCalc(false); setCalcResults([]); }} className="px-6 py-2 bg-accent hover:bg-border rounded-xl text-sm">Cancel</button>
              {calcResults.length > 0 && (
                <button onClick={handleBulkProcess} disabled={bulkPayroll.isPending}
                  className="px-6 py-2 bg-primary text-white rounded-xl font-medium text-sm disabled:opacity-50 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {bulkPayroll.isPending ? 'Processing…' : 'Process All Payroll'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Modal */}
      {showPay && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-96">
            <h3 className="font-semibold mb-4">Process Manual Payroll</h3>
            <form onSubmit={e => { e.preventDefault(); createPayroll.mutate(form); }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Employee</label>
                <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
                  <option value="">Select...</option>
                  {(users?.data || []).filter(u => u.isActive).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role}){u.profile?.baseSalary ? ` — ${formatCurrency(u.profile.baseSalary)}` : ''}</option>
                  ))}
                </select>
              </div>
              {[['amount', 'Amount (RWF)', 'number'], ['period', 'Period', 'text'], ['daysWorked', 'Days Worked', 'number'], ['hoursWorked', 'Hours Worked', 'number'], ['notes', 'Notes', 'text']].map(([k, l, t]) => (
                <div key={k}>
                  <label className="block text-sm font-medium mb-1">{l}</label>
                  <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required={k === 'amount'}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                </div>
              ))}
              <div className="flex gap-3">
                <button type="submit" disabled={createPayroll.isPending} className="flex-1 py-2 bg-primary text-white rounded-xl font-medium disabled:opacity-50">
                  {createPayroll.isPending ? 'Processing...' : 'Process'}
                </button>
                <button type="button" onClick={() => setShowPay(false)} className="flex-1 py-2 bg-accent rounded-xl">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
