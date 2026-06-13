import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const formatCurrency = (amount, currency = 'RWF') =>
  `${Number(amount || 0).toLocaleString()} ${currency}`;

export const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const formatTime = (date) =>
  date ? new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';

export const formatDateTime = (date) =>
  date ? `${formatDate(date)} ${formatTime(date)}` : '-';

export const getStatusColor = (status) => {
  const map = {
    PENDING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    PREPARING: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    READY: 'bg-green-500/15 text-green-400 border-green-500/30',
    SERVED: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    CANCELLED: 'bg-red-500/15 text-red-400 border-red-500/30',
    AVAILABLE: 'bg-green-500/15 text-green-400 border-green-500/30',
    OCCUPIED: 'bg-red-500/15 text-red-400 border-red-500/30',
    WAITING_PAYMENT: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    CLOSED: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    PAID: 'bg-green-500/15 text-green-400 border-green-500/30',
    NOT_GENERATED: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    GENERATED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    ACTIVE: 'bg-green-500/15 text-green-400 border-green-500/30',
    INACTIVE: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    SUSPENDED: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    FIRED: 'bg-red-500/15 text-red-400 border-red-500/30',
    APPROVED: 'bg-green-500/15 text-green-400 border-green-500/30',
    REJECTED: 'bg-red-500/15 text-red-400 border-red-500/30',
    ORDER_RECEIVED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    ACCEPTED: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    OUT_FOR_DELIVERY: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    DELIVERED: 'bg-green-500/15 text-green-400 border-green-500/30',
  };
  return map[status] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
};

export const getRoleColor = (role) => {
  const map = {
    ADMIN: 'text-red-400', MANAGER: 'text-purple-400', CASHIER: 'text-blue-400',
    WAITER: 'text-green-400', KITCHEN: 'text-orange-400', BAR: 'text-yellow-400',
    DELIVERY_RIDER: 'text-cyan-400',
  };
  return map[role] || 'text-gray-400';
};

export const getInitials = (name) =>
  name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

export const debounce = (fn, delay) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
};
