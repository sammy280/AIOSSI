const prisma = require('../config/database');
const { adjustStock } = require('../services/inventory.service');

const getInventory = async (req, res, next) => {
  try {
    const { category, lowStock } = req.query;
    const where = {};
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (lowStock === 'true') where.quantity = { lte: prisma.inventoryItem.fields.minimumStock };

    const items = await prisma.inventoryItem.findMany({
      where,
      include: { supplier: true, movements: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { name: 'asc' },
    });

    // Flag low stock items
    const enriched = items.map(item => ({
      ...item,
      isLowStock: parseFloat(item.quantity) <= parseFloat(item.minimumStock),
      isOutOfStock: parseFloat(item.quantity) === 0,
    }));

    if (lowStock === 'true') {
      return res.json({ success: true, data: enriched.filter(i => i.isLowStock) });
    }
    res.json({ success: true, data: enriched });
  } catch (err) { next(err); }
};

const parseInventoryBody = (body) => {
  const d = { ...body };
  if (d.quantity !== undefined) d.quantity = parseFloat(d.quantity);
  if (d.minimumStock !== undefined) d.minimumStock = parseFloat(d.minimumStock);
  if (d.costPrice !== undefined) d.costPrice = parseFloat(d.costPrice);
  if (d.sellingPrice !== undefined) d.sellingPrice = d.sellingPrice ? parseFloat(d.sellingPrice) : null;
  if (d.bottleVolume !== undefined) d.bottleVolume = d.bottleVolume ? parseFloat(d.bottleVolume) : null;
  if (d.fullBottles !== undefined) d.fullBottles = parseInt(d.fullBottles) || 0;
  if (d.halfBottles !== undefined) d.halfBottles = parseInt(d.halfBottles) || 0;
  if (d.quarterBottles !== undefined) d.quarterBottles = parseInt(d.quarterBottles) || 0;
  if (d.fullBottlePrice !== undefined) d.fullBottlePrice = d.fullBottlePrice ? parseFloat(d.fullBottlePrice) : null;
  if (d.halfBottlePrice !== undefined) d.halfBottlePrice = d.halfBottlePrice ? parseFloat(d.halfBottlePrice) : null;
  if (d.quarterBottlePrice !== undefined) d.quarterBottlePrice = d.quarterBottlePrice ? parseFloat(d.quarterBottlePrice) : null;
  return d;
};

const createInventoryItem = async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.create({ data: parseInventoryBody(req.body) });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
};

const updateInventoryItem = async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.update({ where: { id: req.params.id }, data: parseInventoryBody(req.body) });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
};

const adjustInventory = async (req, res, next) => {
  try {
    const { type, quantity, reason } = req.body;
    const result = await adjustStock({ inventoryItemId: req.params.id, type, quantity: parseFloat(quantity), reason, userId: req.user.id });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

const getMovements = async (req, res, next) => {
  try {
    const { inventoryItemId, type, startDate, endDate } = req.query;
    const where = {};
    if (inventoryItemId) where.inventoryItemId = inventoryItemId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    const movements = await prisma.stockMovement.findMany({
      where,
      include: { inventoryItem: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: movements });
  } catch (err) { next(err); }
};

const getReconciliations = async (req, res, next) => {
  try {
    const reconciliations = await prisma.stockReconciliation.findMany({
      include: { reviewer: { select: { id: true, name: true } }, items: { include: { inventoryItem: true } } },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: reconciliations });
  } catch (err) { next(err); }
};

const createReconciliation = async (req, res, next) => {
  try {
    const { date, items, notes } = req.body;
    const reconciliation = await prisma.stockReconciliation.create({
      data: {
        date: new Date(date),
        reviewedBy: req.user.id,
        notes,
        items: {
          create: items.map(item => ({
            inventoryItemId: item.inventoryItemId,
            openingStock: parseFloat(item.openingStock),
            closingStock: parseFloat(item.closingStock),
            expectedStock: parseFloat(item.expectedStock),
            difference: parseFloat(item.closingStock) - parseFloat(item.expectedStock),
            explanation: item.explanation,
          })),
        },
      },
      include: { items: { include: { inventoryItem: true } }, reviewer: { select: { id: true, name: true } } },
    });
    res.status(201).json({ success: true, data: reconciliation });
  } catch (err) { next(err); }
};

module.exports = { getInventory, createInventoryItem, updateInventoryItem, adjustInventory, getMovements, getReconciliations, createReconciliation };
