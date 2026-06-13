const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');
const { createAuditLog } = require('../middleware/audit');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { employeeId, period } = req.query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (period) where.period = { contains: period };
    const records = await prisma.payroll.findMany({
      where,
      include: { employee: { select: { id: true, name: true, role: true } }, paidBy: { select: { id: true, name: true } } },
      orderBy: { paymentDate: 'desc' },
    });
    res.json({ success: true, data: records });
  } catch (err) { next(err); }
});

// Auto-calculate payroll for a given period (YYYY-MM)
router.get('/calculate', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { period } = req.query; // e.g. "2026-06"
    if (!period) return res.status(400).json({ success: false, message: 'period required (YYYY-MM)' });

    const [year, month] = period.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    const employees = await prisma.user.findMany({
      where: { isActive: true, role: { not: 'ADMIN' } },
      include: {
        profile: { select: { baseSalary: true, employmentDate: true } },
      },
    });

    // Check which employees already have payroll for this period
    const existingPayroll = await prisma.payroll.findMany({
      where: { period: { contains: period } },
      select: { employeeId: true },
    });
    const alreadyPaid = new Set(existingPayroll.map(p => p.employeeId));

    // Get attendance for the period
    const attendance = await prisma.attendance.findMany({
      where: { date: { gte: start, lt: end } },
      select: { employeeId: true, status: true, hoursWorked: true },
    });

    const attendanceByEmployee = {};
    attendance.forEach(a => {
      if (!attendanceByEmployee[a.employeeId]) {
        attendanceByEmployee[a.employeeId] = { present: 0, absent: 0, late: 0, hoursWorked: 0 };
      }
      if (a.status === 'PRESENT') attendanceByEmployee[a.employeeId].present++;
      else if (a.status === 'ABSENT') attendanceByEmployee[a.employeeId].absent++;
      else if (a.status === 'LATE') attendanceByEmployee[a.employeeId].late++;
      attendanceByEmployee[a.employeeId].hoursWorked += parseFloat(a.hoursWorked || 0);
    });

    const calculations = employees.map(emp => {
      const baseSalary = parseFloat(emp.profile?.baseSalary || 0);
      const att = attendanceByEmployee[emp.id] || { present: 0, absent: 0, late: 0, hoursWorked: 0 };
      const daysWorked = att.present + att.late;
      const dailyRate = daysInMonth > 0 ? baseSalary / daysInMonth : 0;
      const deductionForAbsence = att.absent * dailyRate;
      const lateDeduction = att.late * (dailyRate * 0.1); // 10% deduction per late day
      const totalDeductions = deductionForAbsence + lateDeduction;
      const netSalary = Math.max(0, baseSalary - totalDeductions);

      return {
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        baseSalary,
        daysWorked,
        daysAbsent: att.absent,
        daysLate: att.late,
        hoursWorked: att.hoursWorked,
        totalDeductions: Math.round(totalDeductions),
        netSalary: Math.round(netSalary),
        alreadyPaid: alreadyPaid.has(emp.id),
      };
    });

    res.json({ success: true, data: calculations, period, daysInMonth });
  } catch (err) { next(err); }
});

// Bulk process calculated payroll
router.post('/bulk', authorize('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { entries, period } = req.body; // entries: [{employeeId, amount, daysWorked, hoursWorked, deductions, notes}]
    if (!entries?.length) return res.status(400).json({ success: false, message: 'No entries provided' });

    const records = await prisma.$transaction(
      entries.map(e => prisma.payroll.create({
        data: {
          employeeId: e.employeeId,
          amount: parseFloat(e.amount),
          period,
          daysWorked: e.daysWorked,
          hoursWorked: e.hoursWorked,
          deductions: parseFloat(e.deductions || 0),
          paidById: req.user.id,
          notes: e.notes,
        },
      }))
    );

    await createAuditLog({
      userId: req.user.id, role: req.user.role,
      action: 'BULK_PAYROLL',
      description: `Bulk payroll processed for ${records.length} employees — period: ${period}`,
      tableName: 'Payroll',
    });

    res.status(201).json({ success: true, data: records, message: `Payroll processed for ${records.length} employees` });
  } catch (err) { next(err); }
});

// Set employee base salary
router.patch('/salary/:userId', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { baseSalary } = req.body;
    const profile = await prisma.employeeProfile.update({
      where: { userId: req.params.userId },
      data: { baseSalary: parseFloat(baseSalary) },
    });
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
});

router.post('/', authorize('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { employeeId, amount, period, daysWorked, hoursWorked, overtime, deductions, notes } = req.body;
    const payroll = await prisma.payroll.create({
      data: { employeeId, amount: parseFloat(amount), period, daysWorked, hoursWorked, overtime, deductions: parseFloat(deductions || 0), paidById: req.user.id, notes },
      include: { employee: { select: { id: true, name: true, role: true } } },
    });
    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'PAYROLL_PROCESSED', description: `Payroll processed for ${payroll.employee.name}: ${amount}`, tableName: 'Payroll', recordId: payroll.id });
    res.status(201).json({ success: true, data: payroll });
  } catch (err) { next(err); }
});

module.exports = router;
