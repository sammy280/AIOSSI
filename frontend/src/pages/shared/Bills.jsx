import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { useState } from 'react';
import { Printer } from 'lucide-react';
import PrintBill from '../../components/shared/PrintBill';

export default function BillsPage() {
  const [status, setStatus] = useState('');
  const [printBill, setPrintBill] = useState(null);

  const { data } = useQuery({
    queryKey: ['bills', status],
    queryFn: () => api.get(`/bills${status ? `?status=${status}` : ''}`),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Bills & Payments" subtitle="All generated bills and receipts" />

      <div className="flex gap-2">
        {[['', 'All'], ['GENERATED', 'Pending Payment'], ['PAID', 'Paid']].map(([s, label]) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${status === s ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-accent/50 border-b border-border">
            <tr>{['Bill #', 'Table / Seat', 'Items', 'Subtotal', 'Discount', 'Total', 'Status', 'Payment', 'Cashier', 'Date', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {(data?.data || []).map(bill => (
              <tr key={bill.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-primary font-bold">{bill.billNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">Table {bill.order?.table?.name}</p>
                  <p className="text-xs text-muted-foreground">{bill.order?.seat?.label}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{bill.order?.items?.length || 0} items</td>
                <td className="px-4 py-3">{formatCurrency(bill.subtotal)}</td>
                <td className="px-4 py-3 text-green-400">{parseFloat(bill.discount) > 0 ? `-${formatCurrency(bill.discount)}` : '—'}</td>
                <td className="px-4 py-3 font-bold text-primary">{formatCurrency(bill.total)}</td>
                <td className="px-4 py-3"><Badge status={bill.status} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{bill.payment?.method?.replace('_', ' ') || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground text-sm">{bill.cashier?.name || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateTime(bill.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setPrintBill(bill)}
                    className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-primary transition-colors"
                    title="Print Bill"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {(data?.data || []).length === 0 && (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">No bills found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {printBill && <PrintBill bill={printBill} onClose={() => setPrintBill(null)} />}
    </div>
  );
}
