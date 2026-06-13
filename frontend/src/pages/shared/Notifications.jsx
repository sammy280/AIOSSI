import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '../../store/notificationStore';
import PageHeader from '../../components/shared/PageHeader';
import { formatDateTime } from '../../lib/utils';
import { Bell, Check, CheckCheck, Trash2, Filter } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

const typeIcons = {
  ORDER_UPDATE: '🍽️', KITCHEN_UPDATE: '👨‍🍳', BAR_UPDATE: '🍺',
  BILL_UPDATE: '🧾', PAYMENT_UPDATE: '💳', STOCK_ALERT: '⚠️',
  PUNISHMENT_REQUEST: '⚖️', EMPLOYEE_FIRED: '🚨', SUPPLIER_PURCHASE: '📦',
  DELETE_REQUEST: '🗑️', SYSTEM: '⚙️', ONLINE_ORDER: '📱', LOYALTY: '⭐',
  REQUISITION: '📋', PAYROLL: '💰', USER_UPDATE: '👤', DAILY_REPORT: '📊',
};

const typeLabels = {
  ORDER_UPDATE: 'Orders', KITCHEN_UPDATE: 'Kitchen', BAR_UPDATE: 'Bar',
  BILL_UPDATE: 'Bills', PAYMENT_UPDATE: 'Payments', STOCK_ALERT: 'Stock',
  ONLINE_ORDER: 'Online', REQUISITION: 'Requisitions', PAYROLL: 'Payroll',
  USER_UPDATE: 'Users', DAILY_REPORT: 'Reports', SYSTEM: 'System',
};

export default function NotificationsPage() {
  const { markRead, markAllRead, removeNotification } = useNotificationStore();
  const [dateFilter, setDateFilter] = useState('today');
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const params = new URLSearchParams();
  if (dateFilter === 'today') params.set('date', today);
  if (typeFilter) params.set('type', typeFilter);
  if (unreadOnly) params.set('unreadOnly', 'true');

  const { data: notifData, refetch } = useQuery({
    queryKey: ['notifications', dateFilter, typeFilter, unreadOnly],
    queryFn: () => api.get(`/notifications?${params.toString()}`),
    select: (res) => Array.isArray(res.data) ? res.data : (res.data || []),
    refetchInterval: 30000,
  });
  const notifications = notifData || [];

  const handleMarkRead = async (id) => {
    markRead(id);
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    refetch();
  };
  const handleMarkAllRead = async () => {
    markAllRead();
    await api.patch('/notifications/read-all').catch(() => {});
    refetch();
  };
  const handleDelete = async (id) => {
    removeNotification(id);
    await api.delete(`/notifications/${id}`).catch(() => {});
    refetch();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        actions={
          <button onClick={handleMarkAllRead} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-border rounded-xl text-sm font-medium">
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

        {/* Date */}
        <div className="flex gap-1 bg-accent rounded-xl p-1">
          {[['today', 'Today'], ['all', 'All time']].map(([val, label]) => (
            <button key={val} onClick={() => setDateFilter(val)}
              className={cn('px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                dateFilter === val ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
              )}>
              {label}
            </button>
          ))}
        </div>

        {/* Unread toggle */}
        <button onClick={() => setUnreadOnly(v => !v)}
          className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
            unreadOnly ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'
          )}>
          Unread only
        </button>

        {/* Type filter */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="text-xs bg-accent border border-border rounded-xl px-3 py-1.5 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">All types</option>
          {Object.entries(typeLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">No notifications</p>
            <p className="text-sm mt-1">{dateFilter === 'today' ? "Nothing today yet" : "Nothing to show"}</p>
          </div>
        )}
        {notifications.map(n => (
          <div key={n.id} className={cn('flex gap-4 p-4 bg-card border rounded-xl transition-all group', !n.isRead ? 'border-primary/30 bg-primary/5' : 'border-border')}>
            <span className="text-2xl shrink-0">{typeIcons[n.type] || '🔔'}</span>
            <div className="flex-1">
              <p className={cn('font-semibold', !n.isRead ? 'text-foreground' : 'text-muted-foreground')}>{n.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{formatDateTime(n.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!n.isRead && (
                <button onClick={() => handleMarkRead(n.id)} className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg" title="Mark read">
                  <Check className="w-4 h-4 text-primary" />
                </button>
              )}
              <button onClick={() => handleDelete(n.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg" title="Delete">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
            {!n.isRead && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />}
          </div>
        ))}
      </div>
    </div>
  );
}
