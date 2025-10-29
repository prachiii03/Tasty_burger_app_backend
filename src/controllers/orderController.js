const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');

// ✅ FIXED: Create order with proper structure
const createOrder = asyncHandler(async (req, res) => {
  try {
    console.log('📦 Creating order...');
    console.log('User:', req.user._id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { items, totalAmount, shippingDetails, paymentMethod = 'COD' } = req.body;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cart is empty' 
      });
    }

    if (!shippingDetails) {
      return res.status(400).json({ 
        success: false,
        message: 'Shipping details required' 
      });
    }

    // Validate shipping details
    const { fullName, email, address, city, pincode, phone } = shippingDetails;
    if (!fullName || !email || !address || !city || !pincode || !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'All shipping details are required' 
      });
    }

    // Create order items with proper structure
    const orderItems = items.map(item => ({
      product: item.product,
      qty: item.quantity || 1,
      price: item.price || 0
    }));

    // Calculate total if not provided
    const calculatedTotal = totalAmount || orderItems.reduce((total, item) => total + (item.price * item.qty), 0);

    // Create order with proper structure
    const orderData = {
      user: req.user._id,
      orderItems: orderItems,
      totalPrice: calculatedTotal,
      shippingAddress: {
        fullName: fullName.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        phone: phone.trim()
      },
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'pending' : 'pending'
    };

    console.log('📦 Order data to create:', JSON.stringify(orderData, null, 2));

    const order = await Order.create(orderData);

    console.log('✅ Order created successfully:', order._id);

    // Populate the order before sending response
    const populatedOrder = await Order.findById(order._id)
      .populate('orderItems.product')
      .populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: populatedOrder
    });

  } catch (error) {
    console.error('❌ Order creation error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // More specific error messages
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Duplicate order detected' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Something went wrong while creating order',
      error: error.message 
    });
  }
});

// Get logged-in user's orders
const getOrders = asyncHandler(async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('orderItems.product')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching orders',
      error: error.message 
    });
  }
});

// Get orders of the logged-in user (alternative listing, sorted)
const getUserOrders = asyncHandler(async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('orderItems.product')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching user orders',
      error: error.message 
    });
  }
});

// Get single order by ID
const getOrderById = asyncHandler(async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('orderItems.product')
      .populate('user', 'name email');
      
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }
    
    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to view this order' 
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching order',
      error: error.message 
    });
  }
});

module.exports = {
  createOrder,
  getOrders,
  getUserOrders,
  getOrderById,
};