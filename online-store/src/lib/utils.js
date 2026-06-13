export const formatCurrency = (amount, currency = 'RWF') =>
  `${currency} ${Number(amount || 0).toLocaleString()}`;

export const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' }) : '—';
export const formatDateTime = (d) => d ? `${formatDate(d)} ${formatTime(d)}` : '—';

export const cn = (...classes) => classes.filter(Boolean).join(' ');

export const getImageUrl = (path) => path ? (path.startsWith('http') ? path : `/uploads/${path}`) : null;

export const ORDER_STATUSES = {
  PENDING: { label: 'Order Received', color: 'bg-yellow-100 text-yellow-700', step: 0 },
  ACCEPTED: { label: 'Accepted', color: 'bg-blue-100 text-blue-700', step: 1 },
  PREPARING: { label: 'Preparing', color: 'bg-orange-100 text-orange-700', step: 2 },
  READY: { label: 'Ready', color: 'bg-purple-100 text-purple-700', step: 3 },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-700', step: 4 },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-700', step: 5 },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', step: -1 },
};
