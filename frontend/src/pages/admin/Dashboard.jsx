import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import StatCard from '../../components/shared/StatCard';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency, formatDateTime, getStatusColor, cn } from '../../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingCart, Users, Package, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSocket } from '../../lib/socket';
import Badge from '../../components/shared/Badge';

export default function AdminDashboard() {
  const { data: dash, refetch: refetchDash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard'),
    refetchInterval: 30000,
  });
  const { data: analytics } = useQuery({
    queryKey: ['analytics', 'sales'],
    queryFn: () => api.get('/analytics/sales?period=monthly'),
    staleTime: 60000,
  });
  const { data: revenue } = useQuery({
    queryKey: ['revenue'],
    queryFn: () => api.get('/analytics/revenue?type=monthly'),
  });
  const { data: recentOrders } = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => api.get('/orders?limit=5'),
    refetchInterval: 10000,
  });
  const { data: inventory } = useQuery({
    queryKey: ['inventory', 'low'],
    queryFn: () => api.get('/inventory?lowStock=true'),
  });

  const stats = dash?.data?.today;
  const revenueData = revenue?.data || [];
  const topFoods = analytics?.data?.topFoods || [];
  const topDrinks = analytics?.data?.topDrinks || [];
  const byMethod = analytics?.data?.byMethod || {};

  const pieData = Object.entries(byMethod).map(([name, value]) => ({ name, value }));
  const COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'];

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('order:new', () => refetchDash());
    socket.on('bill:paid', () => refetchDash());
    return () => { socket.off('order:new'); socket.off('bill:paid'); };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" subtitle={`Overview of operations — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`} />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Today's Revenue" value={formatCurrency(stats?.revenue || 0)} icon={DollarSign} color="primary" />
        <StatCard title="Orders Today" value={stats?.orders || 0} icon={ShoppingCart} color="blue" />
        <StatCard title="Active Orders" value={stats?.activeOrders || 0} icon={Clock} color="orange" />
        <StatCard title="Pending Bills" value={stats?.pendingBills || 0} icon={CheckCircle} color="yellow" />
        <StatCard title="Low Stock" value={stats?.lowStockItems || 0} icon={AlertTriangle} color="red" />
        <StatCard title="Attendance" value={stats?.attendance || 0} icon={Users} color="green" subtitle="Today" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Monthly Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="url(#revenue)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expenses)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment method breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Revenue by Method</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{entry.name.replace('_', ' ')}</span>
                </div>
                <span className="font-medium">{formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best sellers + Low stock */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Top Foods */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">🍽️ Top Food Items</h3>
          <div className="space-y-3">
            {topFoods.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.count} orders</p>
                </div>
                <span className="text-sm font-semibold text-primary">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
            {topFoods.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
          </div>
        </div>

        {/* Top Drinks */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">🍺 Top Drinks</h3>
          <div className="space-y-3">
            {topDrinks.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.count} orders</p>
                </div>
                <span className="text-sm font-semibold text-primary">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
            {topDrinks.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" /> Stock Alerts
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(inventory?.data || []).map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-bold', parseFloat(item.quantity) === 0 ? 'text-red-400' : 'text-orange-400')}>
                    {parseFloat(item.quantity)} {item.unit}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Min: {parseFloat(item.minimumStock)}</p>
                </div>
              </div>
            ))}
            {(inventory?.data || []).length === 0 && <p className="text-sm text-green-400">✓ All stock levels OK</p>}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left pb-3 font-medium">Order #</th>
                <th className="text-left pb-3 font-medium">Table</th>
                <th className="text-left pb-3 font-medium">Waiter</th>
                <th className="text-left pb-3 font-medium">Status</th>
                <th className="text-left pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {(recentOrders?.data || []).slice(0, 8).map(order => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="py-3 font-mono text-xs text-primary">{order.orderNumber}</td>
                  <td className="py-3">Table {order.table?.name} • {order.seat?.label}</td>
                  <td className="py-3">{order.waiter?.name}</td>
                  <td className="py-3"><Badge status={order.status} /></td>
                  <td className="py-3 text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
