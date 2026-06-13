import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { MapPin, Package, CreditCard, Smartphone, Banknote, Gift, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone, desc: 'MTN MoMo / Airtel Money' },
  { id: 'CARD', label: 'Card Payment', icon: CreditCard, desc: 'Visa / Mastercard' },
  { id: 'CASH_ON_DELIVERY', label: 'Cash on Delivery', icon: Banknote, desc: 'Pay when delivered' },
];

const DELIVERY_FEE = 1000;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, clearCart, promoCode, promoDiscount, applyPromo } = useCartStore();
  const { customer } = useAuthStore();

  const [orderType, setOrderType] = useState('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState('MOBILE_MONEY');
  const [promoInput, setPromoInput] = useState('');
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    notes: '',
    useLoyaltyPoints: false,
  });

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = orderType === 'DELIVERY' ? DELIVERY_FEE : 0;
  const loyaltyDiscount = form.useLoyaltyPoints && customer?.loyaltyPoints > 0 ? Math.min(customer.loyaltyPoints * 100, subtotal * 0.2) : 0;
  const total = subtotal + deliveryFee - promoDiscount - loyaltyDiscount;

  const applyPromoMutation = useMutation({
    mutationFn: () => api.post('/online/validate-promo', { code: promoInput, subtotal }),
    onSuccess: (data) => { applyPromo(promoInput, data.data.discount); toast.success('Promo code applied!'); },
    onError: () => toast.error('Invalid promo code'),
  });

  const placeOrder = useMutation({
    mutationFn: () => api.post('/online/orders', {
      items: items.map(i => ({ productId: i.id, quantity: i.quantity, notes: i.note })),
      orderType,
      paymentMethod,
      deliveryAddress: orderType === 'DELIVERY' ? form.address : null,
      customerName: form.name,
      customerPhone: form.phone,
      notes: form.notes,
      promoCode: promoCode || undefined,
      useLoyaltyPoints: form.useLoyaltyPoints,
    }),
    onSuccess: (data) => {
      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/track/${data.data.id}`);
    },
    onError: (err) => toast.error(err.message || 'Failed to place order'),
  });

  if (items.length === 0) { navigate('/cart'); return null; }

  const Field = ({ label, name, type = 'text', ...props }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} className="input" {...props} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-black text-gray-900 mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Type */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">Order Type</h2>
            <div className="grid grid-cols-2 gap-3">
              {[['DELIVERY', '🚚', 'Home Delivery', `+${formatCurrency(DELIVERY_FEE)}`], ['PICKUP', '🏠', 'Pickup', 'Free']].map(([val, emoji, label, fee]) => (
                <button
                  key={val}
                  onClick={() => setOrderType(val)}
                  className={cn('p-4 rounded-2xl border-2 text-left transition-all',
                    orderType === val ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-brand/50'
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <p className="font-semibold text-gray-900 mt-2">{label}</p>
                  <p className="text-sm text-gray-500">{fee}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">
              {orderType === 'DELIVERY' ? <><MapPin className="inline w-4 h-4 mr-1" />Delivery Details</> : <><Package className="inline w-4 h-4 mr-1" />Your Details</>}
            </h2>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full Name" name="name" placeholder="Your name" required />
                <Field label="Phone Number" name="phone" placeholder="+250 7XX XXX XXX" required />
              </div>
              {orderType === 'DELIVERY' && (
                <Field label="Delivery Address" name="address" placeholder="Enter your full delivery address" required />
              )}
              {orderType === 'PICKUP' && (
                <div className="bg-brand/5 border border-brand/20 rounded-xl p-4 text-sm text-gray-600">
                  📍 <strong>Pickup Location:</strong> KG 123 Street, Kigali. Estimated ready time: <strong>25–35 minutes</strong>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} placeholder="Any special instructions for your order..." />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4"><CreditCard className="inline w-4 h-4 mr-1" />Payment Method</h2>
            <div className="space-y-3">
              {PAYMENT_METHODS.map(method => (
                <label
                  key={method.id}
                  className={cn('flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all',
                    paymentMethod === method.id ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-brand/40'
                  )}
                >
                  <input type="radio" name="payment" value={method.id} checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} className="sr-only" />
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', paymentMethod === method.id ? 'bg-brand text-white' : 'bg-gray-100')}>
                    <method.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{method.label}</p>
                    <p className="text-xs text-gray-500">{method.desc}</p>
                  </div>
                  {paymentMethod === method.id && <div className="ml-auto w-5 h-5 bg-brand rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>}
                </label>
              ))}
            </div>
          </div>

          {/* Promo Code */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4"><Gift className="inline w-4 h-4 mr-1" />Promo Code</h2>
            {promoCode ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <span className="text-green-600 font-bold">{promoCode}</span>
                <span className="text-green-600 text-sm">— {formatCurrency(promoDiscount)} off</span>
                <button onClick={() => applyPromo(null, 0)} className="ml-auto text-xs text-red-500">Remove</button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} placeholder="Enter promo code" className="input flex-1" />
                <button onClick={() => applyPromoMutation.mutate()} disabled={!promoInput || applyPromoMutation.isPending} className="btn-primary px-5 py-2.5 text-sm">
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Loyalty Points */}
          {customer?.loyaltyPoints > 0 && (
            <label className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4 cursor-pointer">
              <input type="checkbox" checked={form.useLoyaltyPoints} onChange={e => setForm(f => ({ ...f, useLoyaltyPoints: e.target.checked }))} className="w-5 h-5 accent-brand rounded" />
              <div>
                <p className="font-semibold text-gray-900">Use Loyalty Points ⭐</p>
                <p className="text-sm text-gray-500">You have <strong>{customer.loyaltyPoints} points</strong> — redeem for {formatCurrency(loyaltyDiscount)} off</p>
              </div>
            </label>
          )}
        </div>

        {/* Right: Summary */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={`${item.id}-${item.note}`} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.quantity}× {item.name}</span>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {deliveryFee > 0 && <div className="flex justify-between text-gray-600"><span>Delivery Fee</span><span>{formatCurrency(deliveryFee)}</span></div>}
              {promoDiscount > 0 && <div className="flex justify-between text-green-600"><span>Promo Discount</span><span>- {formatCurrency(promoDiscount)}</span></div>}
              {loyaltyDiscount > 0 && <div className="flex justify-between text-brand"><span>Loyalty Points</span><span>- {formatCurrency(loyaltyDiscount)}</span></div>}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-lg text-gray-900">
                <span>Total</span><span className="text-brand">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={() => placeOrder.mutate()}
              disabled={placeOrder.isPending || !form.name || !form.phone || (orderType === 'DELIVERY' && !form.address)}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2 text-base"
            >
              {placeOrder.isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</> : <>Place Order <ChevronRight className="w-5 h-5" /></>}
            </button>
            <p className="text-xs text-center text-gray-400 mt-3">🔒 Secure & encrypted checkout</p>
          </div>
        </div>
      </div>
    </div>
  );
}
