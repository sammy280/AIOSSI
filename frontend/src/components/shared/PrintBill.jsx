import { useRef } from 'react';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { X, Printer } from 'lucide-react';

export default function PrintBill({ bill, onClose, isPreview = false }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=400,height=700');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill ${bill.billNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; padding: 16px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin: 4px 0; }
          .large { font-size: 18px; font-weight: 900; }
          .small { font-size: 10px; color: #555; }
          .paid-stamp { text-align: center; border: 3px solid #000; border-radius: 4px; padding: 6px 16px; font-size: 22px; font-weight: 900; letter-spacing: 4px; margin: 12px auto; width: fit-content; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const order = bill.order;
  const items = order?.items || [];
  const payment = bill.payment;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-800">{isPreview ? '🔍 Bill Preview (for customer)' : 'Bill Receipt'}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="overflow-y-auto max-h-[70vh]">
          <div ref={printRef} className="p-5 font-mono text-xs text-black bg-white">
            {/* Header */}
            <div className="center" style={{ textAlign: 'center', marginBottom: 8 }}>
              <div className="large bold" style={{ fontSize: 20, fontWeight: 900, marginBottom: 2 }}>🍴 SAMMY'S</div>
              <div className="small" style={{ fontSize: 10, color: '#666' }}>Restaurant &amp; Bar</div>
              <div className="small" style={{ fontSize: 10, color: '#666' }}>Kigali, Rwanda</div>
              <div className="small" style={{ fontSize: 10, color: '#666' }}>Tel: +250 788 000 000</div>
            </div>

            <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Bill info */}
            <div style={{ marginBottom: 6 }}>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span>Bill #:</span><span className="bold">{bill.billNumber}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span>Table:</span><span className="bold">Table {order?.table?.name}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span>Seat:</span><span className="bold">{order?.seat?.label}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span>Waiter:</span><span>{order?.waiter?.name}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span>Date:</span><span>{formatDateTime(bill.createdAt)}</span>
              </div>
            </div>

            <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Items */}
            <div style={{ marginBottom: 6 }}>
              <div className="bold" style={{ fontWeight: 'bold', marginBottom: 4 }}>ITEMS</div>
              {items.map((item, i) => (
                <div key={i} style={{ marginBottom: 3 }}>
                  <div className="row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ flex: 1 }}>{item.product?.name}</span>
                    <span>{formatCurrency(parseFloat(item.unitPrice) * item.quantity)}</span>
                  </div>
                  <div style={{ color: '#555', fontSize: 10 }}>
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                    {item.notes && ` — ${item.notes}`}
                  </div>
                </div>
              ))}
            </div>

            <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Totals */}
            <div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span>Subtotal:</span><span>{formatCurrency(bill.subtotal)}</span>
              </div>
              {parseFloat(bill.tax) > 0 && (
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span>Tax:</span><span>{formatCurrency(bill.tax)}</span>
                </div>
              )}
              {parseFloat(bill.discount) > 0 && (
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span>Discount:</span><span>-{formatCurrency(bill.discount)}</span>
                </div>
              )}
              <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 15, marginTop: 6, paddingTop: 4, borderTop: '2px solid #000' }}>
                <span>TOTAL:</span>
                <span>{formatCurrency(bill.total)}</span>
              </div>
            </div>

            {/* Payment info if paid */}
            {payment && (
              <>
                <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
                <div>
                  <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span>Receipt #:</span><span className="bold">{payment.receiptNumber}</span>
                  </div>
                  <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span>Method:</span><span>{payment.method?.replace('_', ' ')}</span>
                  </div>
                  <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span>Paid:</span><span>{formatCurrency(payment.amount)}</span>
                  </div>
                  {parseFloat(payment.amount) > parseFloat(bill.total) && (
                    <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                      <span>Change:</span><span>{formatCurrency(parseFloat(payment.amount) - parseFloat(bill.total))}</span>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'center', border: '2px solid #000', borderRadius: 4, padding: '4px 12px', fontWeight: 900, fontSize: 18, letterSpacing: 4, margin: '10px auto', width: 'fit-content' }}>
                  ✓ PAID
                </div>
              </>
            )}

            <div className="divider" style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Footer */}
            <div style={{ textAlign: 'center', color: '#555', fontSize: 10, marginTop: 8 }}>
              <div>Thank you for dining at Sammy's!</div>
              <div style={{ marginTop: 2 }}>Please come again 😊</div>
              <div style={{ marginTop: 6, fontSize: 9 }}>— Cashier: {bill.cashier?.name || '—'} —</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
