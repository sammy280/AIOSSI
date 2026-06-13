const PDFDocument = require('pdfkit');

const generatePDF = (res, type, data) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${Date.now()}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text('SAMMY RESTAURANT & BAR', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text(`${type.toUpperCase()} REPORT`, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();

  if (type === 'sales') {
    doc.fontSize(14).font('Helvetica-Bold').text(`Total Revenue: ${data.total.toLocaleString()} RWF`);
    doc.text(`Transactions: ${data.count}`);
    doc.moveDown();
    doc.fontSize(10);
    data.payments.forEach(p => {
      doc.text(`${new Date(p.createdAt).toLocaleString()} | Receipt: ${p.receiptNumber} | ${parseFloat(p.amount).toLocaleString()} RWF | ${p.method}`);
    });
  } else if (type === 'bill') {
    const { bill, restaurantName = 'Sammy Restaurant & Bar' } = data;
    doc.fontSize(14).text(restaurantName, { align: 'center' });
    doc.moveDown(0.5);
    doc.text(`Bill #: ${bill.billNumber}`);
    doc.text(`Table: ${bill.order?.table?.name} | Seat: ${bill.order?.seat?.label}`);
    doc.text(`Date: ${new Date(bill.createdAt).toLocaleString()}`);
    doc.moveDown();
    doc.fontSize(10).font('Helvetica-Bold').text('ITEM                     QTY    PRICE    TOTAL');
    doc.font('Helvetica');
    bill.order?.items?.forEach(item => {
      doc.text(`${item.product.name.padEnd(25)} ${item.quantity}      ${parseFloat(item.unitPrice).toLocaleString()}   ${(item.quantity * parseFloat(item.unitPrice)).toLocaleString()}`);
    });
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Subtotal: ${parseFloat(bill.subtotal).toLocaleString()} RWF`);
    if (parseFloat(bill.discount) > 0) doc.text(`Discount: -${parseFloat(bill.discount).toLocaleString()} RWF`);
    doc.fontSize(14).text(`TOTAL: ${parseFloat(bill.total).toLocaleString()} RWF`);
  }

  doc.end();
};

module.exports = { generatePDF };
