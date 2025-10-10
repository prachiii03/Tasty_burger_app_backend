// src/controllers/adminController.js
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Get all users
exports.listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

// Delete a user
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await user.remove();
  res.json({ message: 'User removed' });
});

// List products (admin view)
exports.listProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

// Create product
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, price, description, images = [] } = req.body;
  const product = await Product.create({ name, price, description, images });
  res.status(201).json(product);
});

// Update product
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const { name, price, description, images } = req.body;
  product.name = name ?? product.name;
  product.price = price ?? product.price;
  product.description = description ?? product.description;
  product.images = images ?? product.images;
  await product.save();
  res.json(product);
});

// Delete product
// Delete product
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  await Product.findByIdAndDelete(req.params.id); // ✅ this is cleaner
  res.json({ message: 'Product removed' });
});

// List all orders
exports.listOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
  res.json(orders);
});

// Update order status
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.status = status;
  await order.save();
  res.json(order);
});
