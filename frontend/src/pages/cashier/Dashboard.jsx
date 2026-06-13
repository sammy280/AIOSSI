import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency, formatDateTime, cn } from '../../lib/utils';
import Badge from '../../components/shared/Badge';
import StatCard from '../../components/shared/StatCard';
import PageHeader from '../../components/shared/PageHeader';
import { Receipt, DollarSign, Clock, CheckCircle, Printer, Globe, CreditCard, Table2, X, Users } from 'lucide-react';
import PrintBill from '../../components/shared/PrintBill';
import { useState, useEffect } from 'react';
import { getSocket } from '../../lib/socket';

const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CREDIT'];
const BILL_TYPES = ['NORMAL', 'EBM'];

export default function CashierDashboard() {
  const [selectedBill, setSelectedBill] = useState(null);
  const [printBill, setPrintBill] = useState(null);
  const [payMethod, setPayMethod] = useState('CASH');
  const [billType, setBillType] = useState('NORMAL');
  const [payAmount, setPayAmount] = useState('');
  const [creditInfo, setCreditInfo] = useState({ name: '', phone: '', role: '' });
  const [tableModal, setTableModal] = useState(null); // table detail
  const [genBillType, setGenBillType] = useState('NORMAL'); // for generate bill modal
  const qc = useQueryClient();

  const { data: bills } = useQuery({ queryKey: ['bills'], queryFn: () => api.get('/bills'), refetchInterval: 10000 });
  const { data: orders } = useQuery({ queryKey: ['orders', 'active'], queryFn: () => api.get('/orders?status=SERVED'), refetchInterval: 10000 });
  const { data: onlineOrders } = useQuery({ queryKey: ['online-orders', 'pending'], queryFn: () => api.get('/online/all-orders'), refetchInterval: 10000 });
  const { data: tables } = useQuery({ queryKey: ['tables'], queryFn: () => api.get('/tables'), refetchInterval: 15000 });

  const { data: tableDetail, isLoading: tableLoading } = useQuery({
    queryKey: ['table-detail', tableModal?.id],
    queryFn: () => api.get(`/tables/${tableModal.id}`),
    enabled: !!tableModal?.id,
  });

  const confirmOnlinePayment = useMutation({
    mutationFn: (id) => api.patch(`/online/orders/${id}/confirm-payment`),
    onSuccess: () => qc.invalidateQueries(['online-orders']),
  });

  const updateOnlineStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/online/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries(['online-orders']),
  });

  const genBill = useMutation({
    mutationFn: (data) => api.post('/bills', data),
    onSuccess: () => { qc.invalidateQueries(['bills']); qc.invalidateQueries(['orders', 'active']); qc.invalidateQueries(['table-detail', tableModal?.id]); },
  });

  const markPaid = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/bills/${id}/pay`, data),
    onSuccess: (data) => {
      qc.invalidateQueries(['bills']);
      setPrintBill(data.data?.bill || selectedBill);
      setSelectedBill(null);
    },
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('bill:generated', () => qc.invalidateQueries(['bills']));
    socket.on('order:served', () => qc.invalidateQueries(['orders', 'active']));
    return () => { socket.off('bill:generated'); socket.off('order:served'); };
  }, []);

  const allServed = orders?.data || [];
  const billRequestedOrders = allServed.filter(o => o.billRequested && !o.bill);
  const waitingOrders = allServed.filter(o => !o.billRequested && !o.bill);
  const generatedBills = (bills?.data || []).filter(b => b.status === 'GENERATED');
  const paidToday = (bills?.data || []).filter(b => b.status === 'PAID' && new Date(b.updatedAt) > new Date(new Date().setHours(0, 0, 0, 0)));
  const totalToday = paidToday.reduce((s, b) => s + parseFloat(b.total), 0);

  const handleGenBill = (orderId) => {
    genBill.mutate({ orderId, billType: genBillType });
  };

  const handleMarkPaid = () => {
    if (!selectedBill) return;
    const payload = {
      id: selectedBill.id,
      method: payMethod,
      amount: payAmount || selectedBill.total,
    };
    if (payMethod === 'CREDIT') {
      payload.creditCustomerName = creditInfo.name;
      payload.creditCustomerPhone = creditInfo.phone;
      payload.creditCustomerRole = creditInfo.role;
    }
    markPaid.mutate(payload);
  };

  // Get occupied tables for table view
  const occupiedTables = (tables?.data || []).filter(t => t.status === 'OCCUPIED' || t.status === 'WAITING_PAYMENT');

  return (
    <div className="space-y-6">
      <PageHeader title="Cashier Dashboard" subtitle="Manage bills and payments" />

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Pending Bills" value={generatedBills.length} icon={Receipt} color="orange" />
        <StatCard title="Paid Today" value={paidToday.length} icon={CheckCircle} color="green" />
        <StatCard title="Today's Revenue" value={formatCurrency(totalToday)} icon={DollarSign} color="primary" />
        <StatCard title="Bill Requests" value={billRequestedOrders.length} icon={Clock} color={billRequestedOrders.length > 0 ? 'primary' : 'blue'} subtitle={billRequestedOrders.length > 0 ? '⚡ Action needed' : 'No requests'} />
      </div>

      {/* Bill Type selector (for generation) */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <span className="text-sm font-semibold text-muted-foreground">Default Bill Type:</span>
        <div className="flex gap-2">
          {BILL_TYPES.map(t => (
            <button key={t} onClick={() => setGenBillType(t)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all',
                genBillType === t ? (t === 'EBM' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-primary bg-primary/10 text-primary') : 'border-border hover:border-primary/40'
              )}>
              {t === 'EBM' ? '🔵 EBM Bill' : '⬜ Normal Bill'}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-2">
          {genBillType === 'EBM' ? 'EBM = Electronic Billing Machine (tax receipt)' : 'Normal = Standard receipt'}
        </span>
      </div>

      {/* ── Occupied Tables Quick View ── */}
      {occupiedTables.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Table2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Occupied Tables — Click to View & Manage</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {occupiedTables.map(table => (
              <button key={table.id} onClick={() => setTableModal(table)}
                className={cn(
                  'flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 font-bold text-sm transition-all hover:scale-105',
                  table.status === 'WAITING_PAYMENT'
                    ? 'border-orange-500/60 bg-orange-500/10 text-orange-300'
                    : 'border-red-500/40 bg-red-500/5 text-red-300 hover:border-red-400'
                )}>
                <span className="text-2xl">{table.name}</span>
                <span className="text-[10px] mt-0.5 opacity-70">{table.status === 'WAITING_PAYMENT' ? '💳 Paying' : '🔴 Occupied'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Online Orders ── */}
      {(onlineOrders?.data || []).length > 0 && (
        <div className="bg-card border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Online Orders — Awaiting Payment Confirmation</h3>
            <span className="ml-auto text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-semibold">
              {(onlineOrders?.data || []).length} pending
            </span>
          </div>
          <div className="space-y-3">
            {(onlineOrders?.data || []).map(order => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">#{order.orderNumber}</span>
                    <span className="text-xs bg-accent px-2 py-0.5 rounded-full">{order.deliveryType}</span>
                    <span className="text-xs bg-accent px-2 py-0.5 rounded-full">{order.paymentMethod?.replace('_', ' ')}</span>
                  </div>
                  <p className="font-semibold text-sm">{order.customer?.name || order.guestName}</p>
                  <p className="text-xs text-muted-foreground">{order.customer?.phone || order.guestPhone}</p>
                  <p className="text-xs text-muted-foreground">{order.items?.length} item(s)</p>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-xl font-bold text-primary">{formatCurrency(order.total)}</p>
                  {!order.isPaid && (
                    <button onClick={() => confirmOnlinePayment.mutate(order.id)} disabled={confirmOnlinePayment.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                      <CreditCard className="w-4 h-4" /> Confirm Payment
                    </button>
                  )}
                  {order.isPaid && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-green-400 font-semibold">✓ Paid</span>
                      {order.status === 'ACCEPTED' && <button onClick={() => updateOnlineStatus.mutate({ id: order.id, status: 'PREPARING' })} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-semibold">→ Mark Preparing</button>}
                      {order.status === 'PREPARING' && <button onClick={() => updateOnlineStatus.mutate({ id: order.id, status: 'READY' })} className="px-3 py-1 bg-purple-500 text-white rounded-lg text-xs font-semibold">→ Mark Ready</button>}
                      {order.status === 'READY' && <button onClick={() => updateOnlineStatus.mutate({ id: order.id, status: 'OUT_FOR_DELIVERY' })} className="px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-semibold">→ Out for Delivery</button>}
                      {order.status === 'OUT_FOR_DELIVERY' && <button onClick={() => updateOnlineStatus.mutate({ id: order.id, status: 'DELIVERED' })} className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-semibold">→ Delivered</button>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Served orders - generate bill */}
        <div className={cn('border rounded-xl p-5', billRequestedOrders.length > 0 ? 'bg-primary/5 border-primary/40' : 'bg-card border-border')}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Served Orders — Generate Bill</h3>
            {billRequestedOrders.length > 0 && (
              <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                {billRequestedOrders.length} requested!
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {billRequestedOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-primary/10 border-2 border-primary/40 rounded-xl">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-mono text-xs text-primary font-bold">{order.orderNumber?.slice(-8)}</p>
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold">🧾 Bill Requested</span>
                  </div>
                  <p className="text-sm font-semibold">Table {order.table?.name} • {order.seat?.label}</p>
                  <p className="text-xs text-muted-foreground">Waiter: {order.waiter?.name}</p>
                </div>
                <button onClick={() => handleGenBill(order.id)} disabled={genBill.isPending}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 shadow-md shadow-primary/20">
                  Generate {genBillType}
                </button>
              </div>
            ))}
            {waitingOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{order.orderNumber?.slice(-8)}</p>
                  <p className="text-sm font-medium">Table {order.table?.name} • {order.seat?.label}</p>
                  <p className="text-xs text-muted-foreground">Waiter: {order.waiter?.name}</p>
                </div>
                <button onClick={() => handleGenBill(order.id)} disabled={genBill.isPending}
                  className="px-3 py-1.5 bg-accent hover:bg-border border border-border rounded-lg text-sm font-medium">
                  Generate {genBillType}
                </button>
              </div>
            ))}
            {allServed.filter(o => !o.bill).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No pending billing</p>
            )}
          </div>
        </div>

        {/* Generated bills - awaiting payment */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Bills Awaiting Payment</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {generatedBills.map(bill => (
              <div key={bill.id} className={cn('flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all',
                selectedBill?.id === bill.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40 bg-accent/30'
              )} onClick={() => { setSelectedBill(bill); setPayAmount(String(bill.total)); }}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-primary">{bill.billNumber}</p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold',
                      bill.billType === 'EBM' ? 'bg-blue-500/10 text-blue-400' : 'bg-accent text-muted-foreground'
                    )}>{bill.billType}</span>
                  </div>
                  <p className="text-sm font-medium">Table {bill.order?.table?.name} • {bill.order?.seat?.label}</p>
                  <p className="text-xs text-muted-foreground">{bill.order?.items?.length} items</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(bill.total)}</p>
                  <button onClick={(e) => { e.stopPropagation(); setPrintBill(bill); }}
                    className="p-1 mt-1 bg-accent hover:bg-border rounded text-muted-foreground" title="Print">
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {generatedBills.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No bills awaiting payment</p>}
          </div>
        </div>
      </div>

      {/* Payment panel */}
      {selectedBill && (
        <div className="bg-card border border-primary/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Process Payment — {selectedBill.billNumber}</h3>
            <button onClick={() => setSelectedBill(null)} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>

          <div className="bg-accent/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(selectedBill.subtotal)}</span></div>
            {parseFloat(selectedBill.discount) > 0 && <div className="flex justify-between text-sm text-green-400"><span>Discount</span><span>-{formatCurrency(selectedBill.discount)}</span></div>}
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatCurrency(selectedBill.total)}</span></div>
          </div>

          <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
            {selectedBill.order?.items?.map(item => (
              <div key={item.id} className="flex justify-between">
                <span>{item.quantity}× {item.product?.name}</span>
                <span>{formatCurrency(parseFloat(item.unitPrice) * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} onClick={() => setPayMethod(m)}
                    className={cn('py-2 px-3 rounded-lg text-xs font-medium border-2 transition-all',
                      payMethod === m ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'
                    )}>
                    {m === 'MOBILE_MONEY' ? 'MoMo' : m === 'CREDIT_CARD' ? 'Card' : m === 'DEBIT_CARD' ? 'Debit' : m === 'BANK_TRANSFER' ? 'Bank' : m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Amount Received</label>
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Amount" />
              {parseFloat(payAmount) > parseFloat(selectedBill.total) && (
                <p className="text-green-400 text-sm mt-1">Change: {formatCurrency(parseFloat(payAmount) - parseFloat(selectedBill.total))}</p>
              )}
            </div>
          </div>

          {/* Credit customer info */}
          {payMethod === 'CREDIT' && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-red-400">⚠️ Credit Sale — Customer Info Required</p>
              <div className="grid grid-cols-3 gap-3">
                <input value={creditInfo.name} onChange={e => setCreditInfo(c => ({ ...c, name: e.target.value }))}
                  placeholder="Customer Name*" className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <input value={creditInfo.phone} onChange={e => setCreditInfo(c => ({ ...c, phone: e.target.value }))}
                  placeholder="Phone" className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <input value={creditInfo.role} onChange={e => setCreditInfo(c => ({ ...c, role: e.target.value }))}
                  placeholder="Role/Position" className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleMarkPaid}
              disabled={markPaid.isPending || (!payAmount && payMethod !== 'CREDIT') || (payMethod === 'CREDIT' && !creditInfo.name)}
              className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {markPaid.isPending ? 'Processing…' : `Mark PAID — ${formatCurrency(selectedBill.total)}`}
            </button>
            <button onClick={() => setPrintBill(selectedBill)} className="px-4 py-4 bg-accent hover:bg-border rounded-xl font-medium" title="Print">
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Table Detail Modal */}
      {tableModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <Table2 className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Table {tableModal.name} — Details</h3>
                <Badge status={tableModal.status} />
              </div>
              <button onClick={() => setTableModal(null)} className="p-1.5 hover:bg-accent rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-4">
              {tableLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading table details…</p>}
              {tableDetail?.data?.seats?.map(seat => {
                const activeOrders = seat.orders?.filter(o => o.status !== 'CANCELLED') || [];
                if (!seat.isOccupied && activeOrders.length === 0) return null;
                return (
                  <div key={seat.id} className="bg-accent/30 border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">Seat {seat.label}</span>
                      {seat.isOccupied && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Occupied</span>}
                    </div>
                    {activeOrders.map(order => (
                      <div key={order.id} className="mb-3 last:mb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-xs text-primary font-bold">#{order.orderNumber?.slice(-6)}</span>
                          <span className="text-xs text-muted-foreground">by {order.waiter?.name}</span>
                          <Badge status={order.status} />
                          {order.bill && (
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold ml-auto',
                              order.bill.status === 'PAID' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                            )}>
                              {order.bill.status === 'PAID' ? '✓ PAID' : `Bill: ${formatCurrency(order.bill.total)}`}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 ml-2">
                          {order.items?.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.quantity}× {item.product?.name}</span>
                              <span>{formatCurrency(parseFloat(item.unitPrice) * item.quantity)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-semibold pt-1 border-t border-border/50 text-sm">
                            <span>Order Total</span>
                            <span className="text-primary">{formatCurrency(order.items?.reduce((s, i) => s + parseFloat(i.unitPrice) * i.quantity, 0))}</span>
                          </div>
                        </div>
                        {/* Generate bill button if no bill yet and served */}
                        {order.status === 'SERVED' && !order.bill && (
                          <button
                            onClick={() => { handleGenBill(order.id); }}
                            disabled={genBill.isPending}
                            className="mt-2 w-full py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
                          >
                            Generate {genBillType} Bill
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              {!tableLoading && tableDetail?.data?.seats?.every(s => !s.isOccupied && (s.orders?.length === 0)) && (
                <p className="text-sm text-muted-foreground text-center py-8">No active orders at this table</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {printBill && <PrintBill bill={printBill} onClose={() => setPrintBill(null)} />}
    </div>
  );
}
