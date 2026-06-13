import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency, getRoleColor, cn } from '../../lib/utils';
import { useState } from 'react';
import { TrendingUp, Award } from 'lucide-react';

export default function PerformancePage() {
  const [period, setPeriod] = useState('daily');
  const { data } = useQuery({ queryKey: ['leaderboard', period], queryFn: () => api.get(`/performance/leaderboard?period=${period}`) });
  const lb = data?.data || [];
  const top = lb[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Performance Rankings" />
      <div className="flex gap-2">
        {['daily','weekly','monthly'].map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${period === p ? 'bg-primary text-white' : 'bg-card border border-border'}`}>{p}</button>
        ))}
      </div>
      {top && (
        <div className="bg-gradient-to-r from-primary/20 to-orange-500/10 border border-primary/30 rounded-2xl p-6 flex items-center gap-4">
          <Award className="w-12 h-12 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Top Performer</p>
            <p className="text-2xl font-bold">{top.name}</p>
            <p className={cn('text-sm font-medium', getRoleColor(top.role))}>{top.role}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold text-primary">{top.ordersServed}</p>
            <p className="text-sm text-muted-foreground">Orders Served</p>
            <p className="text-lg font-semibold mt-1">{formatCurrency(top.revenue)}</p>
          </div>
        </div>
      )}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-accent/50 border-b border-border">
            <tr>{['Rank','Staff','Role','Orders Served','Revenue Generated'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {lb.map((emp, i) => (
              <tr key={emp.id} className={cn('border-b border-border/50', i === 0 && 'bg-primary/5')}>
                <td className="px-4 py-3">
                  <span className={cn('text-lg font-black', i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-600' : 'text-muted-foreground')}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">{emp.name}</td>
                <td className="px-4 py-3"><span className={cn('text-xs font-semibold', getRoleColor(emp.role))}>{emp.role}</span></td>
                <td className="px-4 py-3 font-bold">{emp.ordersServed}</td>
                <td className="px-4 py-3 font-bold text-primary">{formatCurrency(emp.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
