import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { Download, FileText, TrendingUp } from 'lucide-react';

const PERIODS = [['daily','Today'],['weekly','This Week'],['monthly','This Month'],['quarterly','3 Months'],['custom','Custom Range']];

export default function ReportsPage() {
  const [period, setPeriod] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: summary } = useQuery({ queryKey: ['reports-summary', period, startDate, endDate], queryFn: () => api.get(`/reports/summary?type=${period}&startDate=${startDate}&endDate=${endDate}`) });
  const { data: sales } = useQuery({ queryKey: ['reports-sales', period, startDate, endDate], queryFn: () => api.get(`/reports/sales?type=${period}&startDate=${startDate}&endDate=${endDate}`) });

  const s = summary?.data;

  const downloadExcel = () => window.open(`/api/v1/reports/sales?type=${period}&format=excel&startDate=${startDate}&endDate=${endDate}`, '_blank');
  const downloadPDF = () => window.open(`/api/v1/reports/sales?type=${period}&format=pdf&startDate=${startDate}&endDate=${endDate}`, '_blank');

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" actions={
        <div className="flex gap-2">
          <button onClick={downloadExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium"><Download className="w-4 h-4" /> Excel</button>
          <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium"><FileText className="w-4 h-4" /> PDF</button>
        </div>
      } />

      <div className="flex gap-2 flex-wrap">
        {PERIODS.map(([v,l]) => (
          <button key={v} onClick={() => setPeriod(v)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${period === v ? 'bg-primary text-white' : 'bg-card border border-border hover:border-primary/40'}`}>{l}</button>
        ))}
        {period === 'custom' && (
          <div className="flex gap-2 items-center">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none" />
            <span className="text-muted-foreground">to</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 text-center"><p className="text-2xl font-bold text-primary">{formatCurrency(s?.revenue || 0)}</p><p className="text-sm text-muted-foreground">Revenue</p></div>
        <div className="bg-card border border-border rounded-xl p-5 text-center"><p className="text-2xl font-bold text-red-400">{formatCurrency(s?.expenses || 0)}</p><p className="text-sm text-muted-foreground">Expenses</p></div>
        <div className="bg-card border border-border rounded-xl p-5 text-center"><p className="text-2xl font-bold text-green-400">{formatCurrency((s?.revenue || 0) - (s?.expenses || 0))}</p><p className="text-sm text-muted-foreground">Net Profit</p></div>
        <div className="bg-card border border-border rounded-xl p-5 text-center"><p className="text-2xl font-bold">{s?.transactions || 0}</p><p className="text-sm text-muted-foreground">Transactions</p></div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">Payments</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-accent/50 border-b border-border">
            <tr>{['Receipt #','Table','Amount','Method','Cashier','Date/Time'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(sales?.data?.payments || []).slice(0, 50).map(p => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30">
                <td className="px-4 py-3 font-mono text-xs text-primary">{p.receiptNumber}</td>
                <td className="px-4 py-3">Table {p.bill?.order?.table?.name}</td>
                <td className="px-4 py-3 font-bold">{formatCurrency(p.amount)}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-accent rounded text-xs">{p.method}</span></td>
                <td className="px-4 py-3">{p.cashier?.name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateTime(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
