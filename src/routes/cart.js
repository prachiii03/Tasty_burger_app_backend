const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController');

// All routes require authentication
router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.post('/remove', removeFromCart);
router.post('/clear', clearCart);

module.exports = router;
