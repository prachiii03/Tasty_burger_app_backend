// src/routes/admin.js
const express = require('express');
const router = express.Router();
   const protect = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');

router.use(protect, adminMiddleware);

// Users
router.get('/users', adminController.listUsers);
router.delete('/users/:id', adminController.deleteUser);

// Products
router.get('/products', adminController.listProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Orders
router.get('/orders', adminController.listOrders);
router.put('/orders/:id', adminController.updateOrderStatus);

module.exports = router;
