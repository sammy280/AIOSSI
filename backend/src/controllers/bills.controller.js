const prisma = require('../config/database');
const { createNotification } = require('../services/notification.service');
const { createAuditLog } = require('../middleware/audit');

const generateBillNumber = () => `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

const generateBill = async (req, res, next) => {
  try {
    const { orderId, discount = 0, billType = 'NORMAL' } = req.body;
    const io = req.app.get('io');

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, table: true, bill: true },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.bill) return res.status(409).json({ success: false, message: 'Bill already generated' });

    const subtotal = order.items.reduce((sum, item) => sum + (parseFloat(item.unitPrice) * item.quantity), 0);
    const taxRate = parseFloat(process.env.TAX_RATE || '0') / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax - parseFloat(discount);

    const bill = await prisma.bill.create({
      data: {
        billNumber: generateBillNumber(),
        orderId,
        subtotal,
        tax,
        discount: parseFloat(discount),
        total,
        status: 'GENERATED',
        billType,
        generatedBy: req.user.id,
      },
      include: { order: { include: { table: true, seat: true, waiter: true, items: { include: { product: true } } } } },
    });

    // Notify waiter
    await createNotification({
      userIds: [order.waiterId],
      type: 'BILL_UPDATE',
      title: 'Bill Generated',
      message: `Bill generated for Table ${order.table.name}. Total: ${total.toLocaleString()} RWF`,
      data: { billId: bill.id, orderId },
      io,
    });

    // Update table status
    await prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: 'WAITING_PAYMENT' } });

    io.emit('bill:generated', bill);
    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'GENERATE_BILL', description: `Generated bill ${bill.billNumber}`, tableName: 'Bill', recordId: bill.id });

    res.status(201).json({ success: true, data: bill });
  } catch (err) { next(err); }
};

const markBillPaid = async (req, res, next) => {
  try {
    const { method, amount, notes, mixedDetails, creditCustomerName, creditCustomerPhone, creditCustomerRole } = req.body;
    const io = req.app.get('io');

    const bill = await prisma.bill.findUnique({
      where: { id: req.params.id },
      include: { order: { include: { table: true, seat: true, waiter: true, items: { include: { product: true } } } } },
    });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    if (bill.status === 'PAID') return res.status(409).json({ success: false, message: 'Bill already paid' });

    const receiptNum = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const [updatedBill, payment] = await prisma.$transaction([
      prisma.bill.update({ where: { id: bill.id }, data: { status: 'PAID' } }),
      prisma.payment.create({
        data: {
          receiptNumber: receiptNum,
          billId: bill.id,
          amount: parseFloat(amount || bill.total),
          method,
          cashierId: req.user.id,
          notes,
          mixedDetails,
        },
      }),
    ]);

    // If credit payment, create a CreditSale record
    if (method === 'CREDIT') {
      await prisma.creditSale.create({
        data: {
          billId: bill.id,
          customerName: creditCustomerName || 'Unknown',
          customerPhone: creditCustomerPhone,
          customerRole: creditCustomerRole,
          amount: parseFloat(bill.total),
          amountPaid: 0,
          balance: parseFloat(bill.total),
          status: 'PENDING',
          approvedById: req.user.id,
        },
      });
    }

    // Close table
    await prisma.restaurantTable.update({ where: { id: bill.order.tableId }, data: { status: 'AVAILABLE' } });
    await prisma.seat.update({ where: { id: bill.order.seatId }, data: { isOccupied: false } });

    // Deduct inventory
    // (inventory deduction happens at order creation time for real-time tracking)

    // Notify waiter
    await createNotification({
      userIds: [bill.order.waiterId],
      type: 'PAYMENT_UPDATE',
      title: 'Bill Paid!',
      message: `Table ${bill.order.table.name} bill has been marked as PAID. ✓`,
      data: { billId: bill.id, receiptNumber: receiptNum },
      io,
    });

    io.emit('bill:paid', { bill: updatedBill, payment });
    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'MARK_PAID', description: `Marked bill ${bill.billNumber} as paid via ${method}`, tableName: 'Bill', recordId: bill.id });

    res.json({ success: true, data: { bill: updatedBill, payment } });
  } catch (err) { next(err); }
};

const getBills = async (req, res, next) => {
  try {
    const { status, date } = req.query;
    const where = {};
    if (status) where.status = status;
    if (date) {
      const d = new Date(date);
      where.createdAt = { gte: d, lt: new Date(d.getTime() + 86400000) };
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        order: { include: { table: true, seat: true, items: { include: { product: true } }, waiter: { select: { id: true, name: true } } } },
        cashier: { select: { id: true, name: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: bills });
  } catch (err) { next(err); }
};

module.exports = { generateBill, markBillPaid, getBills };
