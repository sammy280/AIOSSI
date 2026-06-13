import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import PageHeader from '../../components/shared/PageHeader';
import { FileText, RefreshCw, Download, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

function exportToCSV(report) {
  const rows = [
    ['Daily Report', new Date(report.date).toLocaleDateString()],
    [],
    ['SALES SUMMARY'],
    ['Cash Sales', report.totalCash],
    ['MoMo Sales', report.totalMomo],
    ['Card Sales', report.totalCard],
    ['Credit Sales', report.totalCredit],
    ['Bar Sales', report.barSales],
    ['Kitchen Sales', report.kitchenSales],
    [],
    ['EXPENSES', report.totalExpenses],
    ['Recovery Received', report.recoveryAmount],
    [],
    ['EXPENSE BREAKDOWN'],
    ['Item', 'Amount', 'Approved By'],
    ...((report.expenseBreakdown || []).map(e => [e.item, e.amount, e.approvedBy])),
    [],
    ['CREDIT BREAKDOWN'],
    ['Name', 'Role', 'Amount', 'Balance'],
    ...((report.creditBreakdown || []).map(c => [c.name, c.role, c.amount, c.balance])),
    [],
    ['Notes', report.notes || ''],
    ['Created By', report.createdBy?.name],
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `daily-report-${new Date(report.date).toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function DailyReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [expenseItems, setExpenseItems] = useState([{ item: '', amount: '', approvedBy: '' }]);
  const [creditItems, setCreditItems] = useState([{ name: '', role: '', amount: '' }]);
  const [manualOverrides, setManualOverrides] = useState({});
  const qc = useQueryClient();

  const { data: preview, refetch: refetchPreview, isLoading: previewLoading } = useQuery({
    queryKey: ['report-preview', selectedDate],
    queryFn: () => api.get(`/daily-reports/preview?date=${selectedDate}`),
  });

  const { data: reports } = useQuery({
    queryKey: ['daily-reports'],
    queryFn: () => api.get('/daily-reports'),
  });

  const generate = useMutation({
    mutationFn: (data) => api.post('/daily-reports', data),
    onSuccess: () => {
      qc.invalidateQueries(['daily-reports']);
      setNotes(''); setExpenseItems([{ item: '', amount: '', approvedBy: '' }]); setCreditItems([{ name: '', role: '', amount: '' }]);
    },
  });

  const p = preview?.data || {};
  const getValue = (key) => manualOverrides[key] !== undefined ? manualOverrides[key] : (p[key] || 0);

  const handleSubmit = () => {
    const validExpenses = expenseItems.filter(e => e.item && e.amount);
    const validCredits = creditItems.filter(c => c.name && c.amount);
    generate.mutate({
      date: selectedDate,
      notes,
      expenseBreakdown: validExpenses.length > 0 ? validExpenses : undefined,
      creditBreakdown: validCredits.length > 0 ? validCredits.map(c => ({ ...c, amount: parseFloat(c.amount) })) : undefined,
      manualOverrides: Object.keys(manualOverrides).length > 0 ? manualOverrides : undefined,
    });
  };

  const addExpenseRow = () => setExpenseItems(i => [...i, { item: '', amount: '', approvedBy: '' }]);
  const addCreditRow = () => setCreditItems(i => [...i, { name: '', role: '', amount: '' }]);

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Report" subtitle="Generate and view end-of-day reports" />

      {/* Report Generator */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <button onClick={() => refetchPreview()} disabled={previewLoading}
            className="mt-6 flex items-center gap-2 px-4 py-2 bg-accent hover:bg-border border border-border rounded-xl text-sm font-medium disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${previewLoading ? 'animate-spin' : ''}`} />
            Refresh Auto-Data
          </button>
        </div>

        {/* Auto-calculated fields with manual override */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3">
            📊 Auto-calculated from today's data (click any value to override):
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'totalCash', label: '💵 Cash Sales' },
              { key: 'totalMomo', label: '📱 MoMo Sales' },
              { key: 'totalCard', label: '💳 Card Sales' },
              { key: 'totalCredit', label: '📋 Credit Sales' },
              { key: 'barSales', label: '🍺 Bar Sales' },
              { key: 'kitchenSales', label: '🍽️ Kitchen Sales' },
              { key: 'totalExpenses', label: '💸 Total Expenses' },
              { key: 'recoveryAmount', label: '♻️ Recovery Received' },
            ].map(({ key, label }) => (
              <div key={key} className="bg-accent/40 border border-border rounded-xl p-3">
                <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                <input
                  type="number"
                  value={manualOverrides[key] !== undefined ? manualOverrides[key] : (p[key] || 0)}
                  onChange={e => setManualOverrides(o => ({ ...o, [key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-transparent text-sm font-bold focus:outline-none"
                  step="0.01"
                />
                {manualOverrides[key] !== undefined && (
                  <button onClick={() => setManualOverrides(o => { const n = { ...o }; delete n[key]; return n; })}
                    className="text-[10px] text-muted-foreground hover:text-red-400 mt-0.5">↩ reset to auto</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Expense Breakdown</h4>
            <button onClick={addExpenseRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>
          <div className="space-y-2">
            {/* Auto-detected */}
            {(p.expenseBreakdown || []).map((e, i) => (
              <div key={i} className="flex gap-2 text-sm items-center bg-accent/30 rounded-lg px-3 py-2">
                <span className="flex-1 text-muted-foreground">{e.item} — {formatCurrency(e.amount)} (approved by {e.approvedBy})</span>
                <span className="text-xs text-muted-foreground">auto</span>
              </div>
            ))}
            {/* Manual rows */}
            {expenseItems.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input placeholder="Item description" value={row.item} onChange={e => setExpenseItems(r => r.map((x, j) => j === i ? { ...x, item: e.target.value } : x))}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <input type="number" placeholder="Amount" value={row.amount} onChange={e => setExpenseItems(r => r.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <div className="flex gap-2">
                  <input placeholder="Approved by" value={row.approvedBy} onChange={e => setExpenseItems(r => r.map((x, j) => j === i ? { ...x, approvedBy: e.target.value } : x))}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  {expenseItems.length > 1 && <button onClick={() => setExpenseItems(r => r.filter((_, j) => j !== i))} className="p-2 text-muted-foreground hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Credit Breakdown</h4>
            <button onClick={addCreditRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>
          <div className="space-y-2">
            {(p.creditBreakdown || []).map((c, i) => (
              <div key={i} className="flex gap-2 text-sm items-center bg-accent/30 rounded-lg px-3 py-2">
                <span className="flex-1 text-muted-foreground">{c.name} ({c.role}) — {formatCurrency(c.amount)} [Balance: {formatCurrency(c.balance)}]</span>
                <span className="text-xs text-muted-foreground">auto</span>
              </div>
            ))}
            {creditItems.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input placeholder="Customer name" value={row.name} onChange={e => setCreditItems(r => r.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <input placeholder="Role/Position" value={row.role} onChange={e => setCreditItems(r => r.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <div className="flex gap-2">
                  <input type="number" placeholder="Amount" value={row.amount} onChange={e => setCreditItems(r => r.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  {creditItems.length > 1 && <button onClick={() => setCreditItems(r => r.filter((_, j) => j !== i))} className="p-2 text-muted-foreground hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any additional notes..."
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
        </div>

        <button onClick={handleSubmit} disabled={generate.isPending}
          className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
          <FileText className="w-5 h-5" />
          {generate.isPending ? 'Generating…' : 'Generate & Save Daily Report'}
        </button>
      </div>

      {/* Past Reports */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-4">Past Reports</h3>
        <div className="space-y-3">
          {(reports?.data || []).map(report => (
            <div key={report.id} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{new Date(report.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span className="text-sm text-muted-foreground">by {report.createdBy?.name}</span>
                  <span className="text-sm font-bold text-primary">
                    Total: {formatCurrency(parseFloat(report.totalCash) + parseFloat(report.totalMomo) + parseFloat(report.totalCard))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); exportToCSV(report); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-xs font-semibold transition-colors">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                  {expandedId === report.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {expandedId === report.id && (
                <div className="p-4 border-t border-border bg-accent/20 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      ['💵 Cash', report.totalCash],
                      ['📱 MoMo', report.totalMomo],
                      ['💳 Card', report.totalCard],
                      ['📋 Credit', report.totalCredit],
                      ['🍺 Bar Sales', report.barSales],
                      ['🍽️ Kitchen', report.kitchenSales],
                      ['💸 Expenses', report.totalExpenses],
                      ['♻️ Recovery', report.recoveryAmount],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-card border border-border rounded-xl p-3">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-bold text-sm">{formatCurrency(parseFloat(val || 0))}</p>
                      </div>
                    ))}
                  </div>

                  {(report.expenseBreakdown || []).length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Expense Items</h5>
                      <table className="w-full text-sm">
                        <thead><tr className="text-left text-muted-foreground text-xs">
                          <th className="pb-1">Item</th><th className="pb-1">Amount</th><th className="pb-1">Approved By</th>
                        </tr></thead>
                        <tbody>
                          {report.expenseBreakdown.map((e, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="py-1">{e.item}</td>
                              <td className="py-1">{formatCurrency(parseFloat(e.amount))}</td>
                              <td className="py-1 text-muted-foreground">{e.approvedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {(report.creditBreakdown || []).length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Credit Breakdown</h5>
                      <table className="w-full text-sm">
                        <thead><tr className="text-left text-muted-foreground text-xs">
                          <th className="pb-1">Name</th><th className="pb-1">Role</th><th className="pb-1">Amount</th><th className="pb-1">Balance</th>
                        </tr></thead>
                        <tbody>
                          {report.creditBreakdown.map((c, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="py-1 font-medium">{c.name}</td>
                              <td className="py-1 text-muted-foreground">{c.role}</td>
                              <td className="py-1">{formatCurrency(parseFloat(c.amount))}</td>
                              <td className={`py-1 font-semibold ${parseFloat(c.balance) > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(parseFloat(c.balance || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {report.notes && <p className="text-sm text-muted-foreground bg-card border border-border rounded-lg p-3">{report.notes}</p>}
                </div>
              )}
            </div>
          ))}
          {!(reports?.data?.length) && <p className="text-sm text-muted-foreground text-center py-8">No reports yet</p>}
        </div>
      </div>
    </div>
  );
}
