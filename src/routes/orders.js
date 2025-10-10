const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  createOrder,
  getOrders,
  getUserOrders,
  getOrderById,
} = require('../controllers/orderController');

router.use(protect);

router.post('/', createOrder);          // create new order
router.get('/', getOrders);             // get orders for logged-in user
router.get('/me', getUserOrders);       // alternative view (sorted)
router.get('/:id', getOrderById);       // get single order

module.exports = router;
