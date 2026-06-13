import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDateTime, cn } from '../../lib/utils';
import Badge from '../../components/shared/Badge';
import { ChefHat, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { useEffect } from 'react';
import { getSocket } from '../../lib/socket';

const statusOrder = ['PENDING', 'PREPARING', 'READY'];

export default function KitchenDashboard() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => api.get('/kitchen'),
    refetchInterval: 10000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/kitchen/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries(['kitchen-orders']),
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('kitchen:updated', () => qc.invalidateQueries(['kitchen-orders']));
    socket.on('order:new', () => qc.invalidateQueries(['kitchen-orders']));
    return () => { socket.off('kitchen:updated'); socket.off('order:new'); };
  }, []);

  const orders = data?.data || [];
  const pending = orders.filter(o => o.status === 'PENDING');
  const preparing = orders.filter(o => o.status === 'PREPARING');
  const ready = orders.filter(o => o.status === 'READY');

  const KitchenCard = ({ order }) => {
    const elapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000);
    const isUrgent = elapsed > 20;

    return (
      <div className={cn('order-card', isUrgent && 'border-red-500/50 bg-red-500/5')}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs text-primary">{order.order?.orderNumber?.slice(-8)}</p>
            <p className="font-bold text-lg">Table {order.order?.table?.name} • {order.order?.seat?.label}</p>
            <p className="text-sm text-muted-foreground">Waiter: {order.order?.waiter?.name}</p>
          </div>
          <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full', isUrgent ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground')}>
            <Clock className="w-3 h-3" /> {elapsed}m ago
          </div>
        </div>

        {/* Food items */}
        <div className="space-y-1.5 mt-3">
          {order.order?.items?.map(item => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <span className="w-7 h-7 bg-primary/20 text-primary rounded-lg flex items-center justify-center font-bold text-xs">{item.quantity}x</span>
              <span className="font-medium">{item.product?.name}</span>
              {item.notes && <span className="text-xs text-orange-400 italic">"{item.notes}"</span>}
            </div>
          ))}
        </div>

        {/* Notes */}
        {order.order?.notes && <p className="text-xs text-muted-foreground italic mt-2 p-2 bg-accent rounded-lg">📝 {order.order.notes}</p>}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          {order.status === 'PENDING' && (
            <button onClick={() => updateStatus.mutate({ id: order.id, status: 'PREPARING' })}
              className="flex-1 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
              <PlayCircle className="w-4 h-4" /> Start Preparing
            </button>
          )}
          {order.status === 'PREPARING' && (
            <button onClick={() => updateStatus.mutate({ id: order.id, status: 'READY' })}
              className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Mark Ready
            </button>
          )}
          {order.status === 'READY' && (
            <div className="flex-1 py-2 bg-green-500/10 text-green-400 rounded-lg text-sm font-medium text-center">
              ✓ Ready — Waiting for waiter
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ChefHat className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Kitchen Queue</h1>
        <div className="ml-auto flex gap-3 text-sm">
          <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full font-semibold">{pending.length} Pending</span>
          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full font-semibold">{preparing.length} Preparing</span>
          <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full font-semibold">{ready.length} Ready</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-160px)]">
        {/* Pending */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="font-semibold text-yellow-400">PENDING ({pending.length})</span>
          </div>
          <div className="flex-1 overflow-auto space-y-3">
            {pending.map(o => <KitchenCard key={o.id} order={o} />)}
          </div>
        </div>

        {/* Preparing */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-semibold text-blue-400">PREPARING ({preparing.length})</span>
          </div>
          <div className="flex-1 overflow-auto space-y-3">
            {preparing.map(o => <KitchenCard key={o.id} order={o} />)}
          </div>
        </div>

        {/* Ready */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="font-semibold text-green-400">READY ({ready.length})</span>
          </div>
          <div className="flex-1 overflow-auto space-y-3">
            {ready.map(o => <KitchenCard key={o.id} order={o} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
