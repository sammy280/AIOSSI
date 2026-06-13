const prisma = require('../config/database');

const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;
    const where = type ? { type, isActive: true } : { isActive: true };
    const categories = await prisma.category.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
};

const createCategory = async (req, res, next) => {
  try {
    const cat = await prisma.category.create({ data: req.body });
    res.status(201).json({ success: true, data: cat });
  } catch (err) { next(err); }
};

const updateCategory = async (req, res, next) => {
  try {
    const cat = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: cat });
  } catch (err) { next(err); }
};

const deleteCategory = async (req, res, next) => {
  try {
    await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Category deactivated' });
  } catch (err) { next(err); }
};

const getProducts = async (req, res, next) => {
  try {
    const { categoryId, type, search, available } = req.query;
    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (available !== undefined) where.isAvailable = available === 'true';
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (type) where.category = { type };

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, inventoryLinks: { include: { inventoryItem: true } } },
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, categoryId, image, preparationTime, allergens, isFeatured } = req.body;
    const product = await prisma.product.create({
      data: { name, description, price: parseFloat(price), categoryId, image, preparationTime, allergens, isFeatured: isFeatured || false },
      include: { category: true },
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { ...req.body, price: req.body.price ? parseFloat(req.body.price) : undefined },
      include: { category: true },
    });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

const toggleProductAvailability = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { isAvailable: !product.isAvailable },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory, getProducts, getProductById, createProduct, updateProduct, toggleProductAvailability };
