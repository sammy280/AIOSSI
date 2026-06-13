import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import { formatDateTime, formatCurrency, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { MapPin, Phone, Package, Bike, CheckCircle, Clock, User } from 'lucide-react';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-500/10 text-yellow-400',
  ASSIGNED: 'bg-blue-500/10 text-blue-400',
  PICKED_UP: 'bg-orange-500/10 text-orange-400',
  DELIVERED: 'bg-green-500/10 text-green-400',
  FAILED: 'bg-red-500/10 text-red-400',
};

const STATUSES = ['ALL', 'PENDING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'];

export default function DeliveryPage() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('ALL');
  const [assignModal, setAssignModal] = useState(null);
  const [riderId, setRiderId] = useState('');
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['deliveries', filter],
    queryFn: () => api.get(`/deliveries${filter !== 'ALL' ? `?status=${filter}` : ''}`),
    refetchInterval: 10000,
  });

  const { data: riders } = useQuery({
    queryKey: ['riders'],
    queryFn: () => api.get('/users?role=DELIVERY_RIDER'),
    enabled: !!assignModal,
  });

  const assign = useMutation({
    mutationFn: ({ id, riderId }) => api.post(`/deliveries/${id}/assign`, { riderId }),
    onSuccess: () => { qc.invalidateQueries(['deliveries']); setAssignModal(null); setRiderId(''); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/deliveries/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries(['deliveries']),
  });

  const deliveries = data?.data || [];
  const isManager = ['ADMIN', 'MANAGER'].includes(user?.role);
  const isRider = user?.role === 'DELIVERY_RIDER';

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'PENDING').length,
    inProgress: deliveries.filter(d => d.status === 'PICKED_UP').length,
    delivered: deliveries.filter(d => d.status === 'DELIVERED').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Management" subtitle="Track and manage online order deliveries" />

      {/* Stats */}
      {isManager && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Orders', value: stats.total, icon: Package, color: 'text-blue-400' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-400' },
            { label: 'In Transit', value: stats.inProgress, icon: Bike, color: 'text-orange-400' },
            { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: 'text-green-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              filter === s ? 'bg-primary text-white' : 'bg-card border border-border hover:bg-accent'
            )}
          >
            {s === 'ALL' ? 'All Deliveries' : s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Deliveries */}
      <div className="space-y-4">
        {deliveries.map(delivery => (
          <div key={delivery.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Order Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">#{delivery.order?.orderNumber || delivery.id.slice(0, 8)}</span>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_COLORS[delivery.status])}>
                    {delivery.status?.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(delivery.createdAt)}</span>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{delivery.order?.customer?.name || 'Customer'}</p>
                    <p className="text-muted-foreground text-xs">{delivery.order?.customer?.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">{delivery.deliveryAddress || delivery.order?.deliveryAddress}</p>
                </div>

                {delivery.rider && (
                  <div className="flex items-center gap-2 text-sm">
                    <Bike className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">{delivery.rider.name}</span>
                    <span className="text-muted-foreground">— Assigned rider</span>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{formatCurrency(delivery.order?.total || 0)}</p>
                <p className="text-xs text-muted-foreground">{delivery.order?.paymentMethod || 'COD'}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                {isManager && delivery.status === 'PENDING' && (
                  <button
                    onClick={() => setAssignModal(delivery)}
                    className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors"
                  >
                    Assign Rider
                  </button>
                )}
                {isRider && delivery.status === 'ASSIGNED' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: delivery.id, status: 'PICKED_UP' })}
                    className="px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-sm font-medium hover:bg-orange-500/20 transition-colors"
                  >
                    Mark Picked Up
                  </button>
                )}
                {isRider && delivery.status === 'PICKED_UP' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: delivery.id, status: 'DELIVERED' })}
                    className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-sm font-medium hover:bg-green-500/20 transition-colors"
                  >
                    Mark Delivered
                  </button>
                )}
                {delivery.order?.customer?.phone && (
                  <a
                    href={`tel:${delivery.order.customer.phone}`}
                    className="flex items-center justify-center gap-1 px-4 py-2 bg-accent rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                )}
              </div>
            </div>

            {/* Order Items */}
            {delivery.order?.items?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  {delivery.order.items.map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-accent/50 rounded-lg text-xs">
                      {item.quantity}× {item.product?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {deliveries.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
            <Bike className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No deliveries found</p>
            <p className="text-sm mt-1">Online orders with delivery will appear here</p>
          </div>
        )}
      </div>

      {/* Assign Rider Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-semibold mb-1">Assign Delivery Rider</h3>
            <p className="text-sm text-muted-foreground mb-4">Order #{assignModal.order?.orderNumber || assignModal.id.slice(0, 8)}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Select Rider</label>
                <select
                  value={riderId}
                  onChange={e => setRiderId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Choose a rider...</option>
                  {(riders?.data || []).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => assign.mutate({ id: assignModal.id, riderId })}
                  disabled={!riderId || assign.isPending}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {assign.isPending ? 'Assigning...' : 'Assign'}
                </button>
                <button onClick={() => setAssignModal(null)} className="flex-1 py-2.5 bg-accent rounded-xl font-medium">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
