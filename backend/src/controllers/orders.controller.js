const prisma = require('../config/database');
const { createAuditLog } = require('../middleware/audit');
const { emitToUser, emitToRole, emitToRoles } = require('../config/socket');
const { createNotification } = require('../services/notification.service');
const { deductInventory } = require('../services/inventory.service');

const generateOrderNumber = () => `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

const getOrders = async (req, res, next) => {
  try {
    const { status, waiterId, tableId, date } = req.query;
    const where = {};
    if (status) {
      // Support comma-separated statuses: ?status=PENDING,PREPARING,READY
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (waiterId) where.waiterId = waiterId;
    if (tableId) where.tableId = tableId;
    if (date) {
      const d = new Date(date);
      where.createdAt = { gte: d, lt: new Date(d.getTime() + 86400000) };
    }

    // Waiters only see their own orders
    if (req.user.role === 'WAITER') where.waiterId = req.user.id;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { product: { include: { category: true } } } },
        table: true,
        seat: true,
        waiter: { select: { id: true, name: true } },
        kitchenOrder: true,
        barOrder: true,
        bill: { select: { id: true, billNumber: true, total: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: { include: { category: true } } } },
        table: true,
        seat: true,
        waiter: { select: { id: true, name: true } },
        kitchenOrder: true,
        barOrder: true,
        bill: { include: { payment: true } },
      },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

const createOrder = async (req, res, next) => {
  try {
    const { tableId, seatId, items, notes } = req.body;
    const io = req.app.get('io');

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must have at least one item' });
    }

    // Validate products and prices
    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, include: { category: true } });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const enrichedItems = items.map(item => {
      const product = productMap[item.productId];
      if (!product) throw new Error(`Product ${item.productId} not found`);
      return { ...item, unitPrice: product.price, type: product.category.type };
    });

    const foodItems = enrichedItems.filter(i => i.type === 'FOOD');
    const drinkItems = enrichedItems.filter(i => i.type === 'DRINK');

    // Check for an existing open order at this table/seat (not cancelled, not billed+paid)
    const existingOrder = tableId && seatId ? await prisma.order.findFirst({
      where: {
        tableId,
        seatId,
        status: { notIn: ['CANCELLED'] },
        bill: { is: null },  // no bill generated yet
      },
      include: {
        items: { include: { product: true } },
        table: true,
        seat: true,
        kitchenOrder: true,
        barOrder: true,
      },
      orderBy: { createdAt: 'desc' },
    }) : null;

    let order;
    let isAddition = false;

    if (existingOrder) {

  // Only the waiter who created the order can add items
  if (
    req.user.role === 'WAITER' &&
    existingOrder.waiterId !== req.user.id
  ) {
    return res.status(403).json({
      success: false,
      message: `This seat is already assigned to ${existingOrder.waiter?.name}. Only that waiter can add items to this order.`,
    });
  }

  // Add new items to the existing order
  isAddition = true;

  await prisma.orderItem.createMany({
    data: enrichedItems.map(i => ({
      orderId: existingOrder.id,
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      notes: i.notes,
      type: i.type,
    })),
  });

      // Create new kitchen/bar sub-tickets for the added items only
      if (foodItems.length > 0 && !existingOrder.kitchenOrder) {
        await prisma.kitchenOrder.create({ data: { orderId: existingOrder.id } });
      }
      if (drinkItems.length > 0 && !existingOrder.barOrder) {
        await prisma.barOrder.create({ data: { orderId: existingOrder.id } });
      }

      // Fetch the updated order
      order = await prisma.order.findUnique({
        where: { id: existingOrder.id },
        include: {
          items: { include: { product: true } },
          table: true,
          seat: true,
          kitchenOrder: true,
          barOrder: true,
        },
      });
    } else {
      // Create a fresh order
      order = await prisma.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          tableId,
          seatId,
          waiterId: req.user.id,
          createdById: req.user.id,
          notes,
          isSent: true,
          items: {
            create: enrichedItems.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              notes: i.notes,
              type: i.type,
            })),
          },
          kitchenOrder: foodItems.length > 0 ? { create: {} } : undefined,
          barOrder: drinkItems.length > 0 ? { create: {} } : undefined,
        },
        include: {
          items: { include: { product: true } },
          table: true,
          seat: true,
          kitchenOrder: true,
          barOrder: true,
        },
      });

      // Update table/seat status only for new orders
      await prisma.restaurantTable.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });
      await prisma.seat.update({ where: { id: seatId }, data: { isOccupied: true } });
    }

    // Notify kitchen if food items (always — new items need to be prepared)
    if (foodItems.length > 0) {
      await createNotification({
        roles: ['KITCHEN'],
        type: 'ORDER_UPDATE',
        title: isAddition ? 'Additional Food Items' : 'New Food Order',
        message: isAddition
          ? `${foodItems.length} more food item(s) added to Order #${order.orderNumber} — Table ${order.table.name} ${order.seat.label}`
          : `New food order for Table ${order.table.name} Seat ${order.seat.label} - Order #${order.orderNumber}`,
        data: { orderId: order.id, newItems: foodItems.map(i => ({ productId: i.productId, quantity: i.quantity })) },
        io,
      });
    }

    // Notify bar if drink items
    if (drinkItems.length > 0) {
      await createNotification({
        roles: ['BAR'],
        type: 'ORDER_UPDATE',
        title: isAddition ? 'Additional Drink Items' : 'New Drink Order',
        message: isAddition
          ? `${drinkItems.length} more drink item(s) added to Order #${order.orderNumber} — Table ${order.table.name} ${order.seat.label}`
          : `New drink order for Table ${order.table.name} Seat ${order.seat.label} - Order #${order.orderNumber}`,
        data: { orderId: order.id, newItems: drinkItems.map(i => ({ productId: i.productId, quantity: i.quantity })) },
        io,
      });
    }

    // Real-time update to all relevant roles
    io.to('role:KITCHEN').to('role:BAR').to('role:MANAGER').to('role:ADMIN').to('role:CASHIER').emit(
      isAddition ? 'order:updated' : 'order:new',
      order
    );

    await createAuditLog({
      userId: req.user.id, role: req.user.role,
      action: isAddition ? 'ADD_TO_ORDER' : 'CREATE_ORDER',
      description: isAddition ? `Added items to order ${order.orderNumber}` : `Created order ${order.orderNumber}`,
      tableName: 'Order', recordId: order.id,
    });

    res.status(isAddition ? 200 : 201).json({
      success: true,
      data: order,
      message: isAddition ? 'Items added to existing order' : 'Order created successfully',
      isAddition,
    });
  } catch (err) { next(err); }
};

const cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Waiters can only cancel unsent orders
    if (req.user.role === 'WAITER') {
      if (order.isSent) return res.status(403).json({ success: false, message: 'Cannot cancel an order already sent' });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED', cancelReason: reason, cancelledBy: req.user.id },
    });

    const io = req.app.get('io');
    io.emit('order:cancelled', updated);

    // Notify waiter if cancelled by manager/admin
    if (req.user.role !== 'WAITER' && order.waiterId !== req.user.id) {
      await createNotification({
        userIds: [order.waiterId],
        type: 'ORDER_UPDATE',
        title: 'Order Cancelled',
        message: `Order #${order.orderNumber} was cancelled by ${req.user.name}. Reason: ${reason}`,
        data: { orderId: order.id },
        io,
      });
    }

    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'CANCEL_ORDER', description: `Cancelled order ${order.orderNumber}: ${reason}`, tableName: 'Order', recordId: order.id });

    res.json({ success: true, data: updated, message: 'Order cancelled' });
  } catch (err) { next(err); }
};

const markServed = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (req.user.role === 'WAITER' && order.waiterId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the assigned waiter can mark this order as served' });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'SERVED' },
      include: { table: true, seat: true },
    });
    const io = req.app.get('io');
    io.emit('order:served', updated);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

const requestBill = async (req, res, next) => {
  try {
    const io = req.app.get('io');

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { table: true, seat: true, waiter: true },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.waiterId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your order' });
    }
    if (order.status !== 'SERVED') {
      return res.status(400).json({ success: false, message: 'Order must be marked served before requesting a bill' });
    }
    if (order.billRequested) {
      return res.status(409).json({ success: false, message: 'Bill already requested' });
    }

    // Mark bill as requested
    await prisma.order.update({
      where: { id: order.id },
      data: { billRequested: true },
    });

    // Notify all cashiers
    await createNotification({
      roles: ['CASHIER'],
      type: 'BILL_UPDATE',
      title: '🧾 Bill Requested',
      message: `${req.user.name} (Waiter) is requesting a bill for Table ${order.table.name} Seat ${order.seat.label} — Order #${order.orderNumber}`,
      data: { orderId: order.id },
      io,
    });

    // Also notify manager + admin
    await createNotification({
      roles: ['MANAGER', 'ADMIN'],
      type: 'BILL_UPDATE',
      title: 'Bill Requested',
      message: `Table ${order.table.name} ${order.seat.label} — Bill requested by ${req.user.name}`,
      data: { orderId: order.id },
      io,
    });

    res.json({ success: true, message: 'Bill requested. Cashier has been notified.' });
  } catch (err) { next(err); }
};

module.exports = { getOrders, getOrderById, createOrder, cancelOrder, markServed, requestBill };
