import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatCurrency, formatDateTime, ORDER_STATUSES, cn } from '../lib/utils';
import { Package, Star, ChevronDown, ChevronUp, RotateCcw, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';

export default function OrderHistoryPage() {
  const [expanded, setExpanded] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const { addItem } = useCartStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['my-orders'], queryFn: () => api.get('/online/my-orders') });
  const orders = data?.data || [];

  const submitReview = useMutation({
    mutationFn: ({ orderId, ...body }) => api.post(`/online/orders/${orderId}/review`, body),
    onSuccess: () => { qc.invalidateQueries(['my-orders']); setReviewModal(null); toast.success('Review submitted!'); },
    onError: () => toast.error('Failed to submit review'),
  });

  const reorder = (items) => {
    items.forEach(item => item.product && addItem(item.product, item.quantity, item.notes || ''));
    toast.success('Items added to cart!');
  };

  if (isLoading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-black text-gray-900 mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No orders yet</h3>
          <p className="text-gray-400 mb-6">Start ordering your favourite meals!</p>
          <Link to="/menu" className="btn-primary inline-block">Browse Menu</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const statusInfo = ORDER_STATUSES[order.status] || ORDER_STATUSES.PENDING;
            const isExpanded = expanded === order.id;
            const canReview = order.status === 'DELIVERED' && !order.hasReview;

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">Order #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}</p>
                      <span className={cn('badge', statusInfo.color)}>{statusInfo.label}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{formatDateTime(order.createdAt)} · {order.orderType}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand text-lg">{formatCurrency(order.total)}</p>
                    <p className="text-xs text-gray-400">{order.items?.length} item(s)</p>
                  </div>
                  <button onClick={() => setExpanded(isExpanded ? null : order.id)} className="p-2 rounded-xl hover:bg-gray-50 transition-colors ml-1">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    <div className="space-y-2">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.quantity}× {item.product?.name} {item.notes && <span className="italic text-gray-400">({item.notes})</span>}</span>
                          <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <Link to={`/track/${order.id}`} className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                        <Eye className="w-4 h-4" /> Track Order
                      </Link>
                      <button onClick={() => reorder(order.items || [])} className="flex items-center gap-1.5 px-4 py-2 bg-brand/10 text-brand rounded-xl text-sm font-medium hover:bg-brand/20 transition-colors">
                        <RotateCcw className="w-4 h-4" /> Reorder
                      </button>
                      {canReview && (
                        <button onClick={() => setReviewModal(order)} className="flex items-center gap-1.5 px-4 py-2 bg-yellow-50 text-yellow-600 rounded-xl text-sm font-medium hover:bg-yellow-100 transition-colors">
                          <Star className="w-4 h-4" /> Leave Review
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-xl mb-1">Rate Your Order</h3>
            <p className="text-sm text-gray-500 mb-5">Order #{reviewModal.orderNumber || reviewModal.id.slice(0, 8).toUpperCase()}</p>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setReview(r => ({ ...r, rating: s }))}>
                    <Star className={`w-8 h-8 transition-colors ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Review</label>
              <textarea
                value={review.comment}
                onChange={e => setReview(r => ({ ...r, comment: e.target.value }))}
                placeholder="Tell us about your experience..."
                rows={3}
                className="input resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => submitReview.mutate({ orderId: reviewModal.id, rating: review.rating, comment: review.comment })}
                disabled={submitReview.isPending}
                className="flex-1 btn-primary py-2.5"
              >
                Submit
              </button>
              <button onClick={() => setReviewModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-2xl font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
