const XLSX = require('xlsx');

const generateExcel = (res, type, data) => {
  const wb = XLSX.utils.book_new();

  if (type === 'sales') {
    const rows = data.payments.map(p => ({
      Date: new Date(p.createdAt).toLocaleString(),
      Receipt: p.receiptNumber,
      Amount: parseFloat(p.amount),
      Method: p.method,
      Cashier: p.cashier?.name,
      Table: p.bill?.order?.table?.name,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
  } else if (type === 'inventory') {
    const ws = XLSX.utils.json_to_sheet(data.items.map(i => ({
      Name: i.name, Category: i.category, Quantity: parseFloat(i.quantity), Unit: i.unit,
      'Cost Price': parseFloat(i.costPrice), 'Min Stock': parseFloat(i.minimumStock),
      Status: parseFloat(i.quantity) <= parseFloat(i.minimumStock) ? 'LOW' : 'OK',
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  } else if (type === 'attendance') {
    const ws = XLSX.utils.json_to_sheet(data.records.map(r => ({
      Employee: r.user?.name, Role: r.user?.role, Date: new Date(r.date).toLocaleDateString(),
      'Clock In': new Date(r.clockIn).toLocaleTimeString(), 'Clock Out': r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : '-',
      'Hours Worked': r.hoursWorked || 0,
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${Date.now()}.xlsx"`);
  res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
};

module.exports = { generateExcel };
