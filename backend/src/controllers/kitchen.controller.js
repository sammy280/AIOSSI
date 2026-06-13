const prisma = require('../config/database');
const { createNotification } = require('../services/notification.service');

const getKitchenOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : { status: { not: 'CANCELLED' } };
    const orders = await prisma.kitchenOrder.findMany({
      where,
      include: {
        order: {
          include: {
            items: { where: { type: 'FOOD' }, include: { product: true } },
            table: true,
            seat: true,
            waiter: { select: { id: true, name: true } },
          },
        },
        staff: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
};

const updateKitchenStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const io = req.app.get('io');

    const kitchenOrder = await prisma.kitchenOrder.update({
      where: { id: req.params.id },
      data: {
        status,
        staffId: req.user.id,
        startedAt: status === 'PREPARING' ? new Date() : undefined,
        readyAt: status === 'READY' ? new Date() : undefined,
      },
      include: {
        order: { include: { table: true, seat: true, waiter: { select: { id: true, name: true } } } },
      },
    });

    // Notify waiter
    const waiterId = kitchenOrder.order.waiterId;
    const orderNum = kitchenOrder.order.orderNumber;
    const tableName = kitchenOrder.order.table.name;
    const seatLabel = kitchenOrder.order.seat.label;

    if (status === 'PREPARING') {
      await createNotification({
        userIds: [waiterId],
        type: 'KITCHEN_UPDATE',
        title: 'Kitchen Started',
        message: `Kitchen has started preparing Order #${orderNum}.`,
        data: { kitchenOrderId: kitchenOrder.id },
        io,
      });
    } else if (status === 'READY') {
      await createNotification({
        userIds: [waiterId],
        type: 'KITCHEN_UPDATE',
        title: 'Food Ready!',
        message: `Order #${orderNum} for Table ${tableName} Seat ${seatLabel} is ready to serve.`,
        data: { kitchenOrderId: kitchenOrder.id },
        io,
      });
    }

    io.emit('kitchen:updated', kitchenOrder);
    res.json({ success: true, data: kitchenOrder });
  } catch (err) { next(err); }
};

module.exports = { getKitchenOrders, updateKitchenStatus };
