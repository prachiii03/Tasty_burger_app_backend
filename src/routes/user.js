const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  getDashboardOverview,
  getUserProfile,
  updateUserProfile,
  getUserOrders,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist
} = require('../controllers/userController');

// All routes require authentication
router.use(protect);

// Dashboard route
router.get('/dashboard/overview', getDashboardOverview);

// Profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// Order routes
router.get('/orders', getUserOrders);

// Address routes
router.get('/addresses', getUserAddresses);
router.post('/addresses', addUserAddress);
router.put('/addresses/:id', updateUserAddress);
router.delete('/addresses/:id', deleteUserAddress);

// Wishlist routes
router.get('/wishlist', getWishlist);
router.post('/wishlist', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);
router.get('/wishlist/check/:productId', checkWishlist);

module.exports = router;