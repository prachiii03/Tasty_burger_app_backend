const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Product = require('../models/Product');

// GET /api/cart
const getCart = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const user = await User.findById(req.user._id).populate('cart.product');
  res.json({ data: user.cart || [] });
});

// POST /api/cart -> { productId, quantity }
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const user = await User.findById(req.user._id);
  const existingItem = user.cart.find(
    (item) => item.product && item.product.toString() === productId.toString()
  );

  if (existingItem) {
    existingItem.quantity = (existingItem.quantity || 0) + (Number(quantity) || 1);
  } else {
    user.cart.push({ 
      product: productId, 
      quantity: Number(quantity) || 1 
    });
  }

  await user.save();

  const populated = await User.findById(req.user._id).populate('cart.product');
  res.json({ data: populated.cart });
});

// POST /api/cart/remove -> { productId }
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const user = await User.findById(req.user._id);
  user.cart = user.cart.filter(
    (item) => item.product && item.product.toString() !== productId.toString()
  );
  await user.save();

  const populated = await User.findById(req.user._id).populate('cart.product');
  res.json({ data: populated.cart });
});

// POST /api/cart/clear
const clearCart = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const user = await User.findById(req.user._id);
  user.cart = [];
  await user.save();

  res.json({ message: 'Cart cleared successfully', data: [] });
});

module.exports = { getCart, addToCart, removeFromCart, clearCart };