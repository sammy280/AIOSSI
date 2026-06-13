import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { formatCurrency, formatDateTime, ORDER_STATUSES } from '../lib/utils';
import { io } from 'socket.io-client';
import { CheckCircle, Clock, ChefHat, Package, Truck, Home, Phone, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';

const STEPS = [
  { key: 'ORDER_RECEIVED', label: 'Order Received', icon: Package, desc: 'We received your order' },
  { key: 'ACCEPTED', label: 'Accepted', icon: CheckCircle, desc: 'Your order is confirmed & payment verified' },
  { key: 'PREPARING', label: 'Preparing', icon: ChefHat, desc: 'Our chefs are cooking your meal' },
  { key: 'READY', label: 'Ready', icon: Package, desc: 'Your order is ready to go' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck, desc: 'Rider is on the way' },
  { key: 'DELIVERED', label: 'Delivered', icon: Home, desc: 'Enjoy your meal!' },
];

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const [liveStatus, setLiveStatus] = useState(null);

  const { data, refetch } = useQuery({
    queryKey: ['track-order', orderId],
    queryFn: () => api.get(`/online/orders/${orderId}/track`),
    refetchInterval: 15000,
  });

  const order = data?.data;

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { transports: ['websocket'] });
    // Join the room for this order
    socket.emit('join:online_order', orderId);
    socket.on('order:status', (payload) => {
      setLiveStatus(payload.status);
      refetch();
    });
    return () => { socket.emit('leave:online_order', orderId); socket.disconnect(); };
  }, [orderId]);

  const currentStatus = liveStatus || order?.status || 'PENDING';
  const currentStep = STEPS.findIndex(s => s.key === currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';

  if (!order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-gray-900">Order Tracking</h1>
        <p className="text-gray-500 mt-1">Order #{order.orderNumber || orderId.slice(0, 8).toUpperCase()}</p>
        <div className={cn('inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full text-sm font-semibold', ORDER_STATUSES[currentStatus]?.color || 'bg-gray-100 text-gray-600')}>
          {ORDER_STATUSES[currentStatus]?.label || currentStatus}
        </div>
      </div>

      {/* Progress Steps */}
      {!isCancelled ? (
        <div className="relative mb-10">
          {/* Line */}
          <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200" />
          <div
            className="absolute top-6 left-6 h-0.5 bg-brand transition-all duration-1000"
            style={{ width: currentStep > 0 ? `${(currentStep / (STEPS.length - 1)) * 100}%` : '0%' }}
          />

          <div className="relative grid grid-cols-6 gap-2">
            {STEPS.map((step, i) => {
              const isDone = i <= currentStep;
              const isActive = i === currentStep;
              return (
                <div key={step.key} className="flex flex-col items-center text-center gap-2">
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500',
                    isDone ? 'bg-brand text-white shadow-lg shadow-brand/30' : 'bg-white border-2 border-gray-200 text-gray-400',
                    isActive && 'ring-4 ring-brand/20'
                  )}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <p className={cn('text-xs font-semibold leading-tight', isDone ? 'text-brand' : 'text-gray-400')}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-10">
          <p className="text-2xl mb-2">❌</p>
          <h3 className="font-bold text-red-700">Order Cancelled</h3>
          <p className="text-sm text-red-500 mt-1">Your order has been cancelled. Contact support if you were charged.</p>
        </div>
      )}

      {/* Live pulse indicator */}
      {!['DELIVERED', 'CANCELLED'].includes(currentStatus) && (
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <p className="text-sm text-gray-500">Live tracking active — updates appear automatically</p>
        </div>
      )}

      {/* Order Info */}
      <div className="grid sm:grid-cols-2 gap-5 mb-6">
        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Items Ordered</h3>
          <div className="space-y-3">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}× {item.product?.name}</span>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1 text-sm">
            {order.deliveryFee > 0 && <div className="flex justify-between text-gray-500"><span>Delivery Fee</span><span>{formatCurrency(order.deliveryFee)}</span></div>}
            {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>- {formatCurrency(order.discount)}</span></div>}
            <div className="flex justify-between font-bold text-brand text-base"><span>Total Paid</span><span>{formatCurrency(order.total)}</span></div>
          </div>
        </div>

        {/* Delivery Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Delivery Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <Package className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Order Type</p>
                <p className="font-medium">{order.orderType}</p>
              </div>
            </div>
            {order.deliveryAddress && (
              <div className="flex gap-2">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Delivery Address</p>
                  <p className="font-medium">{order.deliveryAddress}</p>
                </div>
              </div>
            )}
            {order.rider && (
              <div className="flex gap-2">
                <Truck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Delivery Rider</p>
                  <p className="font-medium text-brand">{order.rider.name}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Ordered At</p>
                <p className="font-medium">{formatDateTime(order.createdAt)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Payment</p>
                <p className="font-medium capitalize">{order.paymentMethod?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="bg-brand/5 border border-brand/20 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
          <Phone className="w-6 h-6 text-brand" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">Need help with your order?</p>
          <p className="text-sm text-gray-500 mt-0.5">Call us: <a href="tel:+250788000000" className="text-brand font-medium">+250 788 000 000</a></p>
        </div>
        <Link to="/menu" className="btn-primary text-sm px-4 py-2 shrink-0">Order Again</Link>
      </div>
    </div>
  );
}
