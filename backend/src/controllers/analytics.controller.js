const prisma = require('../config/database');

const getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    const [totalOrders, totalRevenue, activeOrders, lowStockItems, todayAttendance, pendingBills] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } } }),
      prisma.payment.aggregate({ where: { createdAt: { gte: today } }, _sum: { amount: true } }),
      prisma.order.count({ where: { status: { in: ['PENDING', 'PREPARING'] } } }),
      prisma.inventoryItem.count({ where: { quantity: { lte: prisma.inventoryItem.fields.minimumStock } } }),
      prisma.attendance.count({ where: { date: { gte: today } } }),
      prisma.bill.count({ where: { status: 'GENERATED' } }),
    ]);

    // Get low stock items properly
    const allInventory = await prisma.inventoryItem.findMany();
    const lowStock = allInventory.filter(i => parseFloat(i.quantity) <= parseFloat(i.minimumStock));

    res.json({
      success: true,
      data: {
        today: {
          orders: totalOrders,
          revenue: parseFloat(totalRevenue._sum.amount || 0),
          activeOrders,
          lowStockItems: lowStock.length,
          attendance: todayAttendance,
          pendingBills,
        },
      },
    });
  } catch (err) { next(err); }
};

const getSalesAnalytics = async (req, res, next) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    const end = endDate ? new Date(endDate) : new Date();

    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { bill: { include: { order: { include: { items: { include: { product: { include: { category: true } } } } } } } } },
      orderBy: { createdAt: 'asc' },
    });

    // Group by payment method
    const byMethod = {};
    payments.forEach(p => {
      byMethod[p.method] = (byMethod[p.method] || 0) + parseFloat(p.amount);
    });

    // Daily revenue
    const dailyRevenue = {};
    payments.forEach(p => {
      const day = p.createdAt.toISOString().split('T')[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + parseFloat(p.amount);
    });

    // Best selling products
    const productSales = {};
    payments.forEach(p => {
      p.bill?.order?.items?.forEach(item => {
        const key = item.productId;
        if (!productSales[key]) productSales[key] = { id: key, name: item.product.name, category: item.product.category.name, type: item.product.category.type, count: 0, revenue: 0 };
        productSales[key].count += item.quantity;
        productSales[key].revenue += parseFloat(item.unitPrice) * item.quantity;
      });
    });

    const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const topFoods = topProducts.filter(p => p.type === 'FOOD').slice(0, 5);
    const topDrinks = topProducts.filter(p => p.type === 'DRINK').slice(0, 5);

    res.json({
      success: true,
      data: {
        totalRevenue: payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
        byMethod,
        dailyRevenue: Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount })),
        topFoods,
        topDrinks,
        transactionCount: payments.length,
      },
    });
  } catch (err) { next(err); }
};

const getRevenueReport = async (req, res, next) => {
  try {
    const { type = 'monthly', year, month } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();

    let data = [];
    if (type === 'monthly') {
      for (let m = 0; m < 12; m++) {
        const start = new Date(currentYear, m, 1);
        const end = new Date(currentYear, m + 1, 0);
        const result = await prisma.payment.aggregate({
          where: { createdAt: { gte: start, lte: end } },
          _sum: { amount: true },
          _count: true,
        });
        const expenses = await prisma.expense.aggregate({
          where: { date: { gte: start, lte: end } },
          _sum: { amount: true },
        });
        data.push({
          month: start.toLocaleString('default', { month: 'short' }),
          revenue: parseFloat(result._sum.amount || 0),
          expenses: parseFloat(expenses._sum.amount || 0),
          transactions: result._count,
        });
      }
    }

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { getDashboard, getSalesAnalytics, getRevenueReport };
