const prisma = require('../config/database');

const getCreditSales = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const credits = await prisma.creditSale.findMany({
      where,
      include: {
        approvedBy: { select: { id: true, name: true } },
        payments: { include: { receivedBy: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: credits });
  } catch (err) { next(err); }
};

const createCreditSale = async (req, res, next) => {
  try {
    const { customerName, customerPhone, customerRole, amount, billId, notes } = req.body;
    const credit = await prisma.creditSale.create({
      data: {
        billId,
        customerName,
        customerPhone,
        customerRole,
        amount: parseFloat(amount),
        amountPaid: 0,
        balance: parseFloat(amount),
        status: 'PENDING',
        approvedById: req.user.id,
        notes,
      },
    });
    res.status(201).json({ success: true, data: credit });
  } catch (err) { next(err); }
};

const recordPayment = async (req, res, next) => {
  try {
    const { amount, notes } = req.body;
    const credit = await prisma.creditSale.findUnique({ where: { id: req.params.id } });
    if (!credit) return res.status(404).json({ success: false, message: 'Credit sale not found' });

    const newPaid = parseFloat(credit.amountPaid) + parseFloat(amount);
    const newBalance = parseFloat(credit.amount) - newPaid;
    const newStatus = newBalance <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING';

    const [payment, updated] = await prisma.$transaction([
      prisma.creditPayment.create({
        data: {
          creditSaleId: credit.id,
          amount: parseFloat(amount),
          receivedById: req.user.id,
          notes,
        },
      }),
      prisma.creditSale.update({
        where: { id: credit.id },
        data: { amountPaid: newPaid, balance: Math.max(0, newBalance), status: newStatus },
      }),
    ]);

    res.json({ success: true, data: { payment, credit: updated } });
  } catch (err) { next(err); }
};

module.exports = { getCreditSales, createCreditSale, recordPayment };
