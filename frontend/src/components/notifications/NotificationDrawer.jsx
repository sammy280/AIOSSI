import { X, Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDateTime, cn } from '../../lib/utils';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const typeIcons = {
  ORDER_UPDATE: '🍽️', KITCHEN_UPDATE: '👨‍🍳', BAR_UPDATE: '🍺',
  BILL_UPDATE: '🧾', PAYMENT_UPDATE: '💳', STOCK_ALERT: '⚠️',
  PUNISHMENT_REQUEST: '⚖️', EMPLOYEE_FIRED: '🚨', SUPPLIER_PURCHASE: '📦',
  DELETE_REQUEST: '🗑️', SYSTEM: '⚙️', ONLINE_ORDER: '📱', LOYALTY: '⭐',
};

export default function NotificationDrawer({ open, onClose }) {
  const { notifications, markRead, markAllRead, removeNotification } = useNotificationStore();

  const handleMarkRead = async (id) => {
    markRead(id);
    await api.patch(`/notifications/${id}/read`).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    markAllRead();
    await api.patch('/notifications/read-all').catch(() => {});
  };

  const handleDelete = async (id) => {
    removeNotification(id);
    await api.delete(`/notifications/${id}`).catch(() => {});
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Notifications</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleMarkAllRead} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                  <CheckCheck className="w-4 h-4" /> All read
                </button>
                <button onClick={onClose} className="p-1 hover:bg-accent rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Bell className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 p-4 border-b border-border/50 hover:bg-accent/50 transition-colors group',
                      !n.isRead && 'bg-primary/5'
                    )}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{typeIcons[n.type] || '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', !n.isRead && 'text-foreground', n.isRead && 'text-muted-foreground')}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">{formatDateTime(n.createdAt)}</p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.isRead && (
                        <button onClick={() => handleMarkRead(n.id)} className="p-1 hover:bg-primary/20 rounded" title="Mark read">
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(n.id)} className="p-1 hover:bg-red-500/20 rounded" title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
