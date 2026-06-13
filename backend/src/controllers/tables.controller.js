const prisma = require('../config/database');

const getTables = async (req, res, next) => {
  try {
    const tables = await prisma.restaurantTable.findMany({
      include: {
        seats: true,
        orders: { where: { status: { notIn: ['CANCELLED'] } }, include: { bill: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        reservations: { where: { status: { in: ['CONFIRMED', 'PENDING'] }, reservationDate: { gte: new Date() } } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: tables });
  } catch (err) { next(err); }
};

const createTable = async (req, res, next) => {
  try {
    const { name, seatCount } = req.body;
    const table = await prisma.restaurantTable.create({
      data: {
        name,
        seats: {
          create: Array.from({ length: seatCount }, (_, i) => ({ label: `${name}${i + 1}` })),
        },
      },
      include: { seats: true },
    });
    res.status(201).json({ success: true, data: table });
  } catch (err) { next(err); }
};

const updateTableStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const table = await prisma.restaurantTable.update({ where: { id: req.params.id }, data: { status } });
    const io = req.app.get('io');
    io.emit('table:updated', table);
    res.json({ success: true, data: table });
  } catch (err) { next(err); }
};

const getTableDetail = async (req, res, next) => {
  try {
    const table = await prisma.restaurantTable.findUnique({
      where: { id: req.params.id },
      include: {
        seats: {
          include: {
            orders: {
              where: { status: { notIn: ['CANCELLED'] } },
              include: {
                items: { include: { product: true } },
                waiter: { select: { id: true, name: true } },
                kitchenOrder: true,
                barOrder: true,
                bill: { include: { payment: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    if (!table) return res.status(404).json({ success: false, message: 'Table not found' });
    res.json({ success: true, data: table });
  } catch (err) { next(err); }
};

module.exports = { getTables, createTable, updateTableStatus, getTableDetail };
