const router = require('express').Router();
const ctrl = require('../controllers/menu.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Public for online store
router.get('/categories', ctrl.getCategories);
router.get('/products', ctrl.getProducts);
router.get('/products/:id', ctrl.getProductById);

router.use(authenticate);

router.post('/categories', authorize('ADMIN', 'MANAGER'), ctrl.createCategory);
router.put('/categories/:id', authorize('ADMIN', 'MANAGER'), ctrl.updateCategory);
router.delete('/categories/:id', authorize('ADMIN', 'MANAGER'), ctrl.deleteCategory);
router.post('/products', authorize('ADMIN', 'MANAGER'), ctrl.createProduct);
router.put('/products/:id', authorize('ADMIN', 'MANAGER'), ctrl.updateProduct);
router.patch('/products/:id/toggle', authorize('ADMIN', 'MANAGER'), ctrl.toggleProductAvailability);

module.exports = router;
