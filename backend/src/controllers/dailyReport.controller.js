const prisma = require('../config/database');

// Get all reports (manager/boss/admin)
const getReports = async (req, res, next) => {
  try {
    const reports = await prisma.dailyReport.findMany({
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
};

const getReport = async (req, res, next) => {
  try {
    const report = await prisma.dailyReport.findUnique({
      where: { id: req.params.id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
};

// Auto-calculate totals from today's data then save report
const generateReport = async (req, res, next) => {
  try {
    const { date, notes, expenseBreakdown, creditBreakdown, manualOverrides } = req.body;
    const reportDate = date ? new Date(date) : new Date();
    const dayStart = new Date(reportDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(reportDate); dayEnd.setHours(23, 59, 59, 999);

    // Fetch today's payments
    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
      include: { bill: { include: { order: { include: { items: { include: { product: { include: { category: true } } } } } } } } },
    });

    let totalCash = 0, totalMomo = 0, totalCard = 0, totalCredit = 0;
    let barSales = 0, kitchenSales = 0;

    for (const p of payments) {
      const amt = parseFloat(p.amount);
      if (p.method === 'CASH') totalCash += amt;
      else if (p.method === 'MOBILE_MONEY') totalMomo += amt;
      else if (p.method === 'CREDIT_CARD' || p.method === 'DEBIT_CARD') totalCard += amt;
      else if (p.method === 'CREDIT') totalCredit += amt;

      // Bar vs Kitchen breakdown
      for (const item of p.bill?.order?.items || []) {
        const lineTotal = parseFloat(item.unitPrice) * item.quantity;
        if (item.product?.category?.type === 'DRINK') barSales += lineTotal;
        else kitchenSales += lineTotal;
      }
    }

    // Today's expenses
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      include: { recorder: { select: { name: true } } },
    });
    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const autoExpenseBreakdown = expenses.map(e => ({
      item: e.description,
      amount: parseFloat(e.amount),
      approvedBy: e.recorder.name,
      category: e.category,
    }));

    // Recovery (credit payments received today)
    const recoveries = await prisma.creditPayment.findMany({
      where: { paidAt: { gte: dayStart, lte: dayEnd } },
    });
    const recoveryAmount = recoveries.reduce((s, r) => s + parseFloat(r.amount), 0);

    // Credit sales created today (if not provided manually)
    let autoCreditBreakdown = creditBreakdown;
    if (!creditBreakdown) {
      const credits = await prisma.creditSale.findMany({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        include: { approvedBy: { select: { name: true } } },
      });
      autoCreditBreakdown = credits.map(c => ({
        name: c.customerName,
        role: c.customerRole,
        amount: parseFloat(c.amount),
        balance: parseFloat(c.balance),
      }));
    }

    const report = await prisma.dailyReport.create({
      data: {
        date: dayStart,
        totalCash: manualOverrides?.totalCash ?? totalCash,
        totalMomo: manualOverrides?.totalMomo ?? totalMomo,
        totalCard: manualOverrides?.totalCard ?? totalCard,
        totalCredit: manualOverrides?.totalCredit ?? totalCredit,
        totalExpenses: manualOverrides?.totalExpenses ?? totalExpenses,
        barSales: manualOverrides?.barSales ?? barSales,
        kitchenSales: manualOverrides?.kitchenSales ?? kitchenSales,
        recoveryAmount: manualOverrides?.recoveryAmount ?? recoveryAmount,
        creditBreakdown: autoCreditBreakdown,
        expenseBreakdown: expenseBreakdown || autoExpenseBreakdown,
        notes,
        createdById: req.user.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: report });
  } catch (err) { next(err); }
};

const updateReport = async (req, res, next) => {
  try {
    const report = await prisma.dailyReport.update({
      where: { id: req.params.id },
      data: req.body,
      include: { createdBy: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
};

// Get today's auto-calculated totals for preview
const getTodayPreview = async (req, res, next) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    const dayStart = new Date(reportDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(reportDate); dayEnd.setHours(23, 59, 59, 999);

    const [payments, expenses, recoveries, credits] = await Promise.all([
      prisma.payment.findMany({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        include: { bill: { include: { order: { include: { items: { include: { product: { include: { category: true } } } } } } } } },
      }),
      prisma.expense.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
        include: { recorder: { select: { name: true } } },
      }),
      prisma.creditPayment.findMany({ where: { paidAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.creditSale.findMany({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        include: { approvedBy: { select: { name: true } } },
      }),
    ]);

    let totalCash = 0, totalMomo = 0, totalCard = 0, totalCredit = 0;
    let barSales = 0, kitchenSales = 0;

    for (const p of payments) {
      const amt = parseFloat(p.amount);
      if (p.method === 'CASH') totalCash += amt;
      else if (p.method === 'MOBILE_MONEY') totalMomo += amt;
      else if (p.method === 'CREDIT_CARD' || p.method === 'DEBIT_CARD') totalCard += amt;
      else if (p.method === 'CREDIT') totalCredit += amt;
      for (const item of p.bill?.order?.items || []) {
        const lineTotal = parseFloat(item.unitPrice) * item.quantity;
        if (item.product?.category?.type === 'DRINK') barSales += lineTotal;
        else kitchenSales += lineTotal;
      }
    }

    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const recoveryAmount = recoveries.reduce((s, r) => s + parseFloat(r.amount), 0);

    res.json({
      success: true,
      data: {
        totalCash, totalMomo, totalCard, totalCredit,
        totalExpenses, barSales, kitchenSales, recoveryAmount,
        expenseBreakdown: expenses.map(e => ({ item: e.description, amount: parseFloat(e.amount), approvedBy: e.recorder.name, category: e.category })),
        creditBreakdown: credits.map(c => ({ name: c.customerName, role: c.customerRole, amount: parseFloat(c.amount), balance: parseFloat(c.balance) })),
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getReports, getReport, generateReport, updateReport, getTodayPreview };
