const prisma = require('../config/database');
const { createNotification } = require('../services/notification.service');

const getBarOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : { status: { not: 'CANCELLED' } };
    const orders = await prisma.barOrder.findMany({
      where,
      include: {
        order: {
          include: {
            items: { where: { type: 'DRINK' }, include: { product: true } },
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

const updateBarStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const io = req.app.get('io');

    const barOrder = await prisma.barOrder.update({
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

    const waiterId = barOrder.order.waiterId;
    const orderNum = barOrder.order.orderNumber;
    const tableName = barOrder.order.table.name;
    const seatLabel = barOrder.order.seat.label;

    if (status === 'PREPARING') {
      await createNotification({
        userIds: [waiterId],
        type: 'BAR_UPDATE',
        title: 'Bar Started',
        message: `Bar is preparing drink order #${orderNum}.`,
        data: { barOrderId: barOrder.id },
        io,
      });
    } else if (status === 'READY') {
      await createNotification({
        userIds: [waiterId],
        type: 'BAR_UPDATE',
        title: 'Drinks Ready!',
        message: `Drink order #${orderNum} for Table ${tableName} Seat ${seatLabel} is ready.`,
        data: { barOrderId: barOrder.id },
        io,
      });
    }

    io.emit('bar:updated', barOrder);
    res.json({ success: true, data: barOrder });
  } catch (err) { next(err); }
};

module.exports = { getBarOrders, updateBarStatus };
