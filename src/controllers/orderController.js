const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const User = require('../models/User');

// Create order from user cart
const createOrder = asyncHandler(async (req, res) => {
  const { address } = req.body;

  const user = await User.findById(req.user._id).populate('cart.product');
  if (!user.cart.length) {
    return res.status(400).json({ message: 'Cart empty' });
  }

  const orderItems = user.cart.map(i => ({
    product: i.product._id,
    qty: i.qty,
    price: i.product.price,
  }));

  const totalPrice = orderItems.reduce((s, it) => s + it.qty * it.price, 0);

  const order = await Order.create({
    user: user._id,
    orderItems,
    totalPrice,
    address,
  });

  // clear cart
  user.cart = [];
  await user.save();

  res.status(201).json(order);
});

// Get logged-in user's orders
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).populate('orderItems.product');
  res.json(orders);
});

// Get orders of the logged-in user (alternative listing, sorted)
const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(orders);
});

// Get single order by ID
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('orderItems.product');
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  if (order.user.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  res.json(order);
});

module.exports = {
  createOrder,
  getOrders,
  getUserOrders,
  getOrderById,
};
