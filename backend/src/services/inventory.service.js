const prisma = require('../config/database');
const { createNotification } = require('./notification.service');

const deductInventory = async ({ productId, quantity, reference, userId, io }) => {
  const links = await prisma.productInventory.findMany({
    where: { productId },
    include: { inventoryItem: true },
  });

  for (const link of links) {
    const deductAmount = link.quantity * quantity;
    const item = link.inventoryItem;
    const newQty = Math.max(0, parseFloat(item.quantity) - deductAmount);

    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: newQty },
    });

    await prisma.stockMovement.create({
      data: {
        inventoryItemId: item.id,
        type: 'CONSUMPTION',
        quantity: deductAmount,
        previousQty: item.quantity,
        newQty,
        reason: 'Order consumption',
        reference,
        userId,
      },
    });

    // Low stock alert
    if (newQty <= parseFloat(item.minimumStock)) {
      await createNotification({
        roles: ['ADMIN', 'MANAGER'],
        type: 'STOCK_ALERT',
        title: newQty === 0 ? 'Out of Stock' : 'Low Stock Alert',
        message: `${item.name} is ${newQty === 0 ? 'out of stock' : 'running low'}. Current: ${newQty} ${item.unit}`,
        data: { inventoryItemId: item.id },
        io,
      });
    }
  }
};

const adjustStock = async ({ inventoryItemId, type, quantity, reason, userId }) => {
  const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
  let newQty;
  if (type === 'IN') newQty = parseFloat(item.quantity) + quantity;
  else if (type === 'OUT') newQty = Math.max(0, parseFloat(item.quantity) - quantity);
  else newQty = quantity; // ADJUSTMENT

  await prisma.inventoryItem.update({ where: { id: inventoryItemId }, data: { quantity: newQty } });
  await prisma.stockMovement.create({
    data: { inventoryItemId, type, quantity, previousQty: item.quantity, newQty, reason, userId },
  });

  return { item, newQty };
};

module.exports = { deductInventory, adjustStock };
