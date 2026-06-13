import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency, cn } from '../../lib/utils';
import { Plus, X, ShoppingCart, CheckCircle, Bell, Printer, Eye } from 'lucide-react';
import Badge from '../../components/shared/Badge';
import { getSocket } from '../../lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import PrintBill from '../../components/shared/PrintBill';

export default function WaiterDashboard() {
  const [step, setStep] = useState('tables'); // tables | seats | menu
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [menuType, setMenuType] = useState('FOOD');
  const [orderNotes, setOrderNotes] = useState('');
  const [previewBill, setPreviewBill] = useState(null); // for bill preview modal
  const qc = useQueryClient();

  const { data: tables } = useQuery({ queryKey: ['tables'], queryFn: () => api.get('/tables'), refetchInterval: 15000 });
  const { data: categories } = useQuery({ queryKey: ['categories', menuType], queryFn: () => api.get(`/menu/categories?type=${menuType}`) });
  const { data: products } = useQuery({
    queryKey: ['products', activeCategory],
    queryFn: () => api.get(`/menu/products?categoryId=${activeCategory}&available=true`),
    enabled: !!activeCategory,
  });
  const { data: myOrders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders?status=PENDING,PREPARING,READY'),
    refetchInterval: 10000,
  });
  const { data: servedOrders } = useQuery({
    queryKey: ['my-served-orders'],
    queryFn: () => api.get('/orders?status=SERVED'),
    refetchInterval: 10000,
  });

  // Fetch existing active order for selected seat
  const { data: seatOrderData } = useQuery({
    queryKey: ['seat-order', selectedTable?.id, selectedSeat?.id],
    queryFn: () => api.get(`/orders?tableId=${selectedTable?.id}&status=PENDING,PREPARING,READY,SERVED`),
    enabled: !!(selectedSeat?.isOccupied && selectedTable?.id && selectedSeat?.id),
    select: (data) => (data?.data || []).find(o => o.seatId === selectedSeat?.id && !o.bill),
  });

  const createOrder = useMutation({
    mutationFn: (data) => api.post('/orders', data),
    onSuccess: () => {
      qc.invalidateQueries(['tables']);
      qc.invalidateQueries(['my-orders']);
      setCart([]); setStep('tables');
      setSelectedTable(null); setSelectedSeat(null); setOrderNotes('');
    },
  });

  const markServed = useMutation({
    mutationFn: (orderId) => api.patch(`/orders/${orderId}/served`),
    onSuccess: () => { qc.invalidateQueries(['my-orders']); qc.invalidateQueries(['my-served-orders']); qc.invalidateQueries(['tables']); },
  });

  const requestBill = useMutation({
    mutationFn: (orderId) => api.post(`/orders/${orderId}/request-bill`),
    onSuccess: () => qc.invalidateQueries(['my-served-orders']),
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNotif = (notif) => {
      if (notif.type === 'KITCHEN_UPDATE' || notif.type === 'BAR_UPDATE') qc.invalidateQueries(['my-orders']);
    };
    socket.on('notification:new', handleNotif);
    return () => socket.off('notification:new', handleNotif);
  }, []);

  const addToCart = (product) => {
    setCart(c => {
      const ex = c.find(i => i.productId === product.id);
      if (ex) return c.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, { productId: product.id, product, quantity: 1, notes: '' }];
    });
  };

  const removeFromCart = (productId) => setCart(c => c.filter(i => i.productId !== productId));
  const updateQty = (productId, qty) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart(c => c.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
  };
  const cartTotal = cart.reduce((s, i) => s + (parseFloat(i.product.price) * i.quantity), 0);

  const submitOrder = () => {
    if (!selectedTable || !selectedSeat || cart.length === 0) return;
    createOrder.mutate({
      tableId: selectedTable.id,
      seatId: selectedSeat.id,
      notes: orderNotes,
      items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, notes: i.notes })),
    });
  };

  // Build a preview bill object from a served order
  const buildPreview = (order) => {
    const items = order.items || [];
    const subtotal = items.reduce((s, i) => s + parseFloat(i.unitPrice) * i.quantity, 0);
    return {
      billNumber: 'PREVIEW',
      subtotal, tax: 0, discount: 0, total: subtotal,
      order: { ...order, items },
    };
  };

  const readyOrders = (myOrders?.data || []).filter(o =>
    (o.kitchenOrder?.status === 'READY' || !o.kitchenOrder) &&
    (o.barOrder?.status === 'READY' || !o.barOrder) &&
    o.status !== 'SERVED'
  );

  
  // Seat click handler — block if seat owned by another waiter
  const handleSeatClick = async (seat) => {
    if (seat.isOccupied) {
      try {
        const res = await api.get(`/orders?tableId=${selectedTable?.id}&status=PENDING,PREPARING,READY,SERVED`);
        const activeOrder = (res?.data || []).find(o => o.seatId === seat.id && !o.bill);

        if (activeOrder && activeOrder.waiterId !== currentUserId) {
          alert(`This seat is already assigned to ${activeOrder.waiter?.name}. Only that waiter can add items.`);
          return;
        }
      } catch (err) {
        console.error('Failed to check seat ownership', err);
      }
    }
    setSelectedSeat(seat);
    setStep('menu');
    setActiveCategory(null);
  };
  return (
    <div className="flex gap-4 h-[calc(100vh-112px)]">
      {/* Left: Main content */}
      <div className="flex-1 overflow-auto space-y-4">

        {/* Ready order alerts */}
        {readyOrders.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <p className="font-semibold text-green-400 flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 animate-bounce" /> {readyOrders.length} order(s) ready to serve!
            </p>
            <div className="flex flex-wrap gap-2">
              {readyOrders.map(o => (
                <span key={o.id} className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium">
                  Table {o.table?.name} {o.seat?.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Step: Tables */}
        {step === 'tables' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Select Table</h2>
            <div className="grid grid-cols-4 gap-4">
              {(tables?.data || []).map(table => (
                <button
                  key={table.id}
                  onClick={() => { setSelectedTable(table); setStep('seats'); }}
                  className={cn(
                    'table-card h-32',
                    table.status === 'AVAILABLE' ? 'border-green-500/40 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500' :
                    table.status === 'OCCUPIED' ? 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500' :
                    table.status === 'WAITING_PAYMENT' ? 'border-orange-500/40 bg-orange-500/5 cursor-not-allowed opacity-60' :
                    'border-border'
                  )}
                  disabled={table.status === 'WAITING_PAYMENT'}
                >
                  <span className="text-3xl font-black">{table.name}</span>
                  <Badge status={table.status} />
                  <span className="text-xs text-muted-foreground">{table.seats?.length} seats</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Seats */}
        {step === 'seats' && selectedTable && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep('tables')} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
              <h2 className="text-xl font-bold">Table {selectedTable.name} — Select Seat</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              🟢 Available seat — 🔴 Occupied seat (click to add more items)
            </p>
            <div className="flex flex-wrap gap-3">
              {selectedTable.seats?.map(seat => (
                <button
                  key={seat.id}
                  onClick={() => handleSeatClick(seat)}
                  className={cn(
                    'w-16 h-16 rounded-xl font-bold text-sm border-2 transition-all',
                    seat.isOccupied
                      ? 'border-red-500/60 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                      : 'border-green-500/50 bg-green-500/5 text-green-300 hover:bg-green-500/15 hover:border-green-400'
                  )}
                >
                  {seat.label}
                  {seat.isOccupied && <div className="text-[9px] mt-0.5 text-red-400">+ADD</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Menu */}
        {step === 'menu' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep('seats')} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
              <h2 className="text-xl font-bold">Table {selectedTable?.name} • {selectedSeat?.label}</h2>
              {selectedSeat?.isOccupied && (
                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-full text-xs font-semibold">
                  ➕ Adding to Occupied Seat
                </span>
              )}
            </div>

            {/* Food / Drink toggle */}
            <div className="flex gap-2 mb-4">
              {['FOOD', 'DRINK'].map(t => (
                <button key={t} onClick={() => { setMenuType(t); setActiveCategory(null); }}
                  className={cn('px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                    menuType === t ? 'bg-primary text-white' : 'bg-accent hover:bg-accent/80'
                  )}>
                  {t === 'FOOD' ? '🍽️ Food' : '🍺 Drinks'}
                </button>
              ))}
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(categories?.data || []).map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all border',
                    activeCategory === cat.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-accent hover:bg-accent/80 border-border'
                  )}>
                  {cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name}
                </button>
              ))}
            </div>

            {/* Products grid */}
            {activeCategory && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(products?.data || []).map(product => {
                  const inCart = cart.find(i => i.productId === product.id);
                  return (
                    <button key={product.id} onClick={() => addToCart(product)}
                      className={cn(
                        'bg-card border rounded-xl p-4 text-left transition-all hover:shadow-md active:scale-95',
                        inCart ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/40'
                      )}>
                      <p className="font-semibold text-sm">{product.name}</p>
                      {product.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{product.description}</p>}
                      <p className="text-primary font-bold mt-2">{formatCurrency(product.price)}</p>
                      {inCart && (
                        <div className="mt-2 w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                          {inCart.quantity}
                        </div>
                      )}
                    </button>
                  );
                })}
                {!products?.data?.length && activeCategory && (
                  <p className="col-span-4 text-sm text-muted-foreground py-8 text-center">No items in this category</p>
                )}
              </div>
            )}
            {!activeCategory && <p className="text-sm text-muted-foreground">← Select a category above</p>}
          </div>
        )}
      </div>

      {/* Right: Cart (on menu) OR Orders panel */}
      {step === 'menu' ? (
        <div className="w-80 bg-card border border-border rounded-xl flex flex-col h-full">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{selectedSeat?.isOccupied ? 'Add Items' : 'Order Cart'}</h3>
            <span className="ml-auto text-sm text-muted-foreground">{cart.length} new</span>
          </div>

          {/* Existing order items (for occupied seats) */}
          {selectedSeat?.isOccupied && seatOrderData && (
            <div className="border-b border-border bg-accent/30 p-3 max-h-44 overflow-auto">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                📋 Already Ordered — #{seatOrderData.orderNumber?.slice(-6)}
              </p>
              <div className="space-y-1">
                {(seatOrderData.items || []).map(item => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{item.quantity}× {item.product?.name}</span>
                    <span className="text-foreground font-medium">
                      {formatCurrency(parseFloat(item.unitPrice) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs font-semibold mt-2 pt-2 border-t border-border/50">
                <span>Existing total</span>
                <span className="text-primary">
                  {formatCurrency((seatOrderData.items || []).reduce((s, i) => s + parseFloat(i.unitPrice) * i.quantity, 0))}
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-4 space-y-3">
            <AnimatePresence>
              {cart.map(item => (
                <motion.div key={item.productId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 bg-accent/50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-primary">{formatCurrency(parseFloat(item.product.price) * item.quantity)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-6 h-6 rounded bg-accent hover:bg-border text-xs font-bold">-</button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-6 h-6 rounded bg-accent hover:bg-border text-xs font-bold">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.productId)} className="text-muted-foreground hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="p-4 border-t border-border space-y-3">
            <textarea placeholder="Order notes..." value={orderNotes} onChange={e => setOrderNotes(e.target.value)}
              className="w-full text-sm bg-accent border border-border rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary" rows={2} />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-primary text-lg">{formatCurrency(cartTotal)}</span>
            </div>
            <button onClick={submitOrder} disabled={cart.length === 0 || createOrder.isPending}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all">
              {createOrder.isPending ? 'Sending…' : selectedSeat?.isOccupied ? '➕ Add to Existing Order' : '🚀 Send Order'}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-80 bg-card border border-border rounded-xl flex flex-col h-full">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">My Orders</h3>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
              {(myOrders?.data || []).length + (servedOrders?.data || []).length}
            </span>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-3">

            {/* Active orders */}
            {(myOrders?.data || []).map(order => {
              const kitchenReady = !order.kitchenOrder || order.kitchenOrder?.status === 'READY';
              const barReady = !order.barOrder || order.barOrder?.status === 'READY';
              const allReady = kitchenReady && barReady;
              return (
                <div key={order.id} className={cn(
                  'bg-background border rounded-xl p-3 space-y-2 text-sm',
                  allReady ? 'border-green-500/60 bg-green-500/5 shadow-green-500/10 shadow-lg' : 'border-border'
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-primary font-bold">#{order.orderNumber?.slice(-6)}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold',
                      order.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' :
                      order.status === 'PREPARING' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-green-500/10 text-green-400'
                    )}>{order.status}</span>
                  </div>
                  <p className="font-semibold">🪑 Table {order.table?.name} — {order.seat?.label}</p>

                  {order.kitchenOrder && (
                    <div className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium',
                      order.kitchenOrder.status === 'READY' ? 'bg-green-500/15 text-green-400' :
                      order.kitchenOrder.status === 'PREPARING' ? 'bg-blue-500/10 text-blue-400' : 'bg-accent text-muted-foreground'
                    )}>
                      <span>👨‍🍳 Kitchen:</span><span className="font-bold">{order.kitchenOrder.status}</span>
                      {order.kitchenOrder.status === 'READY' && <span className="ml-auto">✅</span>}
                    </div>
                  )}
                  {order.barOrder && (
                    <div className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium',
                      order.barOrder.status === 'READY' ? 'bg-green-500/15 text-green-400' :
                      order.barOrder.status === 'PREPARING' ? 'bg-blue-500/10 text-blue-400' : 'bg-accent text-muted-foreground'
                    )}>
                      <span>🍺 Bar:</span><span className="font-bold">{order.barOrder.status}</span>
                      {order.barOrder.status === 'READY' && <span className="ml-auto">✅</span>}
                    </div>
                  )}

                  {allReady && (
                    <button onClick={() => markServed.mutate(order.id)} disabled={markServed.isPending}
                      className="w-full py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {markServed.isPending ? 'Marking…' : '✅ Mark as SERVED'}
                    </button>
                  )}
                </div>
              );
            })}

            {(myOrders?.data || []).length === 0 && (servedOrders?.data || []).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No active orders</p>
              </div>
            )}

            {/* Served orders section */}
            {(servedOrders?.data || []).length > 0 && (
              <>
                <div className="pt-2 pb-1 px-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">🧾 Served — Bill</p>
                </div>
                {(servedOrders?.data || []).map(order => {
                  const billRequested = order.billRequested;
                  const hasBill = !!order.bill;
                  const billPaid = order.bill?.status === 'PAID';
                  return (
                    <div key={order.id} className={cn(
                      'bg-background border rounded-xl p-3 space-y-2 text-sm',
                      hasBill && !billPaid ? 'border-orange-500/50 bg-orange-500/5' :
                      billPaid ? 'border-green-500/50 bg-green-500/5' :
                      billRequested ? 'border-blue-500/40 bg-blue-500/5' : 'border-border'
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-primary font-bold">#{order.orderNumber?.slice(-6)}</span>
                        {billPaid && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-bold">✓ PAID</span>}
                        {hasBill && !billPaid && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">Bill Ready</span>}
                        {!hasBill && billRequested && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">Waiting…</span>}
                      </div>
                      <p className="font-semibold">🪑 Table {order.table?.name} — {order.seat?.label}</p>

                      {hasBill && (
                        <div className="flex items-center justify-between bg-accent/50 rounded-lg px-3 py-2">
                          <span className="text-xs text-muted-foreground">Bill Total</span>
                          <span className="font-bold text-primary">{formatCurrency(parseFloat(order.bill?.total || 0))}</span>
                        </div>
                      )}

                      {/* Bill preview button — shows customer what they owe */}
                      <button
                        onClick={() => setPreviewBill(buildPreview(order))}
                        className="w-full py-1.5 bg-accent hover:bg-border border border-border rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview Bill for Customer
                      </button>

                      {!hasBill && !billPaid && (
                        <button
                          onClick={() => requestBill.mutate(order.id)}
                          disabled={billRequested || requestBill.isPending}
                          className={cn(
                            'w-full py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5',
                            billRequested ? 'bg-blue-500/10 text-blue-400 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-white'
                          )}>
                          🧾 {billRequested ? 'Bill Requested — Waiting for Cashier' : 'Request Bill from Cashier'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* Bill Preview Modal */}
      {previewBill && (
        <PrintBill
          bill={previewBill}
          onClose={() => setPreviewBill(null)}
          isPreview
        />
      )}
    </div>
  );
}
