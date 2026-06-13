import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import StatCard from '../../components/shared/StatCard';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import {
  DollarSign, ShoppingCart, Users, Package, Clock, AlertTriangle,
  TrendingUp, Receipt, CreditCard, ClipboardList, Banknote, Smartphone,
  BarChart2, ChevronRight
} from 'lucide-react';
import Badge from '../../components/shared/Badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export default function ManagerDashboard() {
  const { data: dash } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/analytics/dashboard'), refetchInterval: 30000 });
  const { data: revenue } = useQuery({ queryKey: ['revenue'], queryFn: () => api.get('/analytics/revenue?type=monthly') });
  const { data: inventory } = useQuery({ queryKey: ['inventory', 'low'], queryFn: () => api.get('/inventory?lowStock=true') });
  const { data: recentOrders } = useQuery({ queryKey: ['orders', 'recent'], queryFn: () => api.get('/orders'), refetchInterval: 15000 });
  const { data: requisitions } = useQuery({ queryKey: ['requisitions', 'PENDING'], queryFn: () => api.get('/requisitions?status=PENDING') });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users') });
  const { data: dailyPreview } = useQuery({
    queryKey: ['daily-preview'],
    queryFn: () => api.get(`/daily-reports/preview?date=${new Date().toISOString().split('T')[0]}`),
    refetchInterval: 60000,
  });
  const { data: creditSales } = useQuery({ queryKey: ['credit-sales'], queryFn: () => api.get('/credit-sales') });

  const stats = dash?.data?.today;
  const dp = dailyPreview?.data;
  const pendingReqs = requisitions?.data?.length || 0;
  const activeEmployees = (users?.data || []).filter(u => u.isActive).length;
  const lowStockCount = (inventory?.data || []).length;
  const outstandingCredit = (creditSales?.data || [])
    .filter(c => c.status !== 'PAID')
    .reduce((s, c) => s + parseFloat(c.balance || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Manager Dashboard" subtitle="Daily operations overview" />

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Today's Revenue" value={formatCurrency(dp?.totalRevenue || stats?.revenue || 0)} icon={DollarSign} color="primary" />
        <StatCard title="Orders Today" value={stats?.orders || 0} icon={ShoppingCart} color="blue" />
        <StatCard title="Active Orders" value={stats?.activeOrders || 0} icon={Clock} color="orange" />
        <StatCard title="Employees" value={activeEmployees} icon={Users} color="green" />
      </div>

      {/* Payment breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-green-400" />
            <span className="text-sm text-muted-foreground">Cash Today</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(dp?.totalCash || 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-muted-foreground">MoMo Today</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{formatCurrency(dp?.totalMomo || 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-muted-foreground">Credit Given</span>
          </div>
          <p className="text-2xl font-bold text-orange-400">{formatCurrency(dp?.totalCredit || 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-red-400" />
            <span className="text-sm text-muted-foreground">Outstanding Credit</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(outstandingCredit)}</p>
        </div>
      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-3 gap-4">
        <Link to="/requisitions?status=PENDING" className={`bg-card border rounded-xl p-5 flex items-center gap-4 hover:border-primary/40 transition-all ${pendingReqs > 0 ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border'}`}>
          <ClipboardList className={`w-8 h-8 ${pendingReqs > 0 ? 'text-yellow-400' : 'text-muted-foreground'}`} />
          <div>
            <p className="text-2xl font-bold">{pendingReqs}</p>
            <p className="text-sm text-muted-foreground">Pending Requisitions</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
        </Link>
        <Link to="/inventory" className={`bg-card border rounded-xl p-5 flex items-center gap-4 hover:border-primary/40 transition-all ${lowStockCount > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-border'}`}>
          <AlertTriangle className={`w-8 h-8 ${lowStockCount > 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
          <div>
            <p className="text-2xl font-bold">{lowStockCount}</p>
            <p className="text-sm text-muted-foreground">Low Stock Items</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
        </Link>
        <Link to="/daily-report" className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/40 transition-all">
          <BarChart2 className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{formatCurrency(dp ? (dp.totalRevenue - dp.totalExpenses) : 0)}</p>
            <p className="text-sm text-muted-foreground">Estimated Profit Today</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenue?.data || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-400" /> Low Stock</h3>
          <div className="space-y-2">
            {(inventory?.data || []).slice(0, 6).map(item => (
              <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-sm">{item.name}</span>
                <span className="text-sm font-bold text-orange-400">{parseFloat(item.quantity)} {item.unit}</span>
              </div>
            ))}
            {(inventory?.data || []).length === 0 && <p className="text-green-400 text-sm">✓ All stock levels OK</p>}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-muted-foreground border-b border-border">
              <th className="text-left pb-3 font-medium">Order #</th>
              <th className="text-left pb-3 font-medium">Table</th>
              <th className="text-left pb-3 font-medium">Waiter</th>
              <th className="text-left pb-3 font-medium">Status</th>
              <th className="text-left pb-3 font-medium">Time</th>
            </tr></thead>
            <tbody>
              {(recentOrders?.data || []).slice(0, 10).map(order => (
                <tr key={order.id} className="border-b border-border/50">
                  <td className="py-2 font-mono text-xs text-primary">{order.orderNumber}</td>
                  <td className="py-2">Table {order.table?.name} {order.seat?.label}</td>
                  <td className="py-2">{order.waiter?.name}</td>
                  <td className="py-2"><Badge status={order.status} /></td>
                  <td className="py-2 text-muted-foreground text-xs">{formatDateTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
