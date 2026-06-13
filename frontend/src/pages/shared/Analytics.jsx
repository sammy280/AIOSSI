import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency } from '../../lib/utils';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

const COLORS = ['#f97316','#3b82f6','#8b5cf6','#10b981','#f59e0b','#06b6d4'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('monthly');
  const { data: sales } = useQuery({ queryKey: ['analytics-sales', period], queryFn: () => api.get(`/analytics/sales?period=${period}`) });
  const { data: revenue } = useQuery({ queryKey: ['revenue', period], queryFn: () => api.get(`/analytics/revenue?type=${period}`) });

  const dailyRevenue = sales?.data?.dailyRevenue || [];
  const topFoods = sales?.data?.topFoods || [];
  const topDrinks = sales?.data?.topDrinks || [];
  const byMethod = sales?.data?.byMethod || {};
  const pieData = Object.entries(byMethod).map(([name, value]) => ({ name, value }));
  const revenueData = revenue?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Analytics" subtitle="Revenue trends and insights" />

      <div className="flex gap-2">
        {['daily','weekly','monthly'].map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${period === p ? 'bg-primary text-white' : 'bg-card border border-border hover:border-primary/40'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-primary">{formatCurrency(sales?.data?.totalRevenue || 0)}</p>
          <p className="text-muted-foreground text-sm mt-1">Total Revenue</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-3xl font-bold">{sales?.data?.transactionCount || 0}</p>
          <p className="text-muted-foreground text-sm mt-1">Transactions</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-green-400">
            {sales?.data?.transactionCount ? formatCurrency((sales.data.totalRevenue / sales.data.transactionCount).toFixed(0)) : 'RWF 0'}
          </p>
          <p className="text-muted-foreground text-sm mt-1">Avg. Transaction</p>
        </div>
      </div>

      {/* Revenue trend */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={dailyRevenue}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
            <Tooltip formatter={v => formatCurrency(v)} />
            <Area type="monotone" dataKey="amount" stroke="#f97316" fill="url(#colorRev)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">🍽️ Top Foods</h3>
          <div className="space-y-3">
            {topFoods.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="text-muted-foreground font-bold w-4 text-sm">{i+1}</span>
                <div className="flex-1"><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.count} orders</p></div>
                <span className="text-sm font-semibold text-primary">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
            {!topFoods.length && <p className="text-muted-foreground text-sm">No data</p>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">🍺 Top Drinks</h3>
          <div className="space-y-3">
            {topDrinks.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="text-muted-foreground font-bold w-4 text-sm">{i+1}</span>
                <div className="flex-1"><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.count} orders</p></div>
                <span className="text-sm font-semibold text-primary">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
            {!topDrinks.length && <p className="text-muted-foreground text-sm">No data</p>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.map((e, i) => (
              <div key={e.name} className="flex justify-between text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-muted-foreground">{e.name}</span></div>
                <span className="font-medium">{formatCurrency(e.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
