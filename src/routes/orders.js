const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getUserOrders,
  getOrderById,
  getAllOrders, 
  updateOrderStatus
} = require('../controllers/orderController');
const protect = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(protect);

// Create order
router.post('/', createOrder);

// Get user's orders
router.get('/', getOrders);
router.get('/user', getUserOrders);

// Get specific order
router.get('/:id', getOrderById);
router.get('/orders', getAllOrders);              // GET /admin/orders
router.put('/orders/:id', updateOrderStatus); 

module.exports = router;