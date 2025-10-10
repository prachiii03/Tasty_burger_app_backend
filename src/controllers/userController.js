const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Get user dashboard overview
const getDashboardOverview = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const user = await User.findById(userId).select('-password');
    const totalOrders = await Order.countDocuments({ user: userId });
    const pendingOrders = await Order.countDocuments({ 
      user: userId, 
      status: 'pending' 
    });
    
    // Get wishlist count - handle both array and object structure
    const wishlistCount = Array.isArray(user.wishlist) ? user.wishlist.length : 0;
    
    const recentOrders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.product');

    res.json({
      success: true,
      data: {
        user,
        stats: {
          totalOrders,
          pendingOrders,
          completedOrders: totalOrders - pendingOrders,
          wishlistCount
        },
        recentOrders
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

// Get user profile
const getUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('-password');
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile'
    });
  }
});

// Update user profile
const updateUserProfile = asyncHandler(async (req, res) => {
  try {
    const { name, email, phone, dateOfBirth } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id || req.user.id,
      { name, email, phone, dateOfBirth },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// Get user orders
const getUserOrders = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: req.user._id || req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('items.product');

    const totalOrders = await Order.countDocuments({ user: req.user._id || req.user.id });

    res.json({
      success: true,
      data: {
        orders,
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

// Get user addresses
const getUserAddresses = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('addresses');
    res.json({
      success: true,
      data: user.addresses || []
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching addresses'
    });
  }
});

// Add user address
const addUserAddress = asyncHandler(async (req, res) => {
  try {
    const { street, city, state, zipCode, country, isDefault, type } = req.body;
    
    const user = await User.findById(req.user._id || req.user.id);
    
    const newAddress = {
      type: type || 'home',
      street,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault || false
    };

    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push(newAddress);
    await user.save();

    res.json({
      success: true,
      message: 'Address added successfully',
      data: user.addresses
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding address'
    });
  }
});

// Update user address
const updateUserAddress = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { street, city, state, zipCode, country, isDefault, type } = req.body;

    const user = await User.findById(req.user._id || req.user.id);
    const address = user.addresses.id(id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    Object.assign(address, {
      type: type || address.type,
      street,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault || false
    });

    if (isDefault) {
      user.addresses.forEach(addr => {
        if (addr._id.toString() !== id) {
          addr.isDefault = false;
        }
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: user.addresses
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating address'
    });
  }
});

// Delete user address
const deleteUserAddress = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id || req.user.id);
    user.addresses.pull(id);
    await user.save();

    res.json({
      success: true,
      message: 'Address deleted successfully',
      data: user.addresses
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting address'
    });
  }
});

// WISHLIST FUNCTIONS

// Get user wishlist
const getWishlist = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id)
      .populate({
        path: 'wishlist',
        select: 'name price images category rating description'
      });

    // Handle both old and new wishlist structures
    let wishlistData = [];
    
    if (user.wishlist) {
      if (Array.isArray(user.wishlist)) {
        // New structure: array of product references
        wishlistData = user.wishlist.filter(product => product !== null);
      } else if (user.wishlist.length) {
        // Old structure: array of objects with product field
        wishlistData = user.wishlist
          .filter(item => item.product !== null)
          .map(item => item.product);
      }
    }

    res.json({
      success: true,
      data: wishlistData
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist'
    });
  }
});

// Add to wishlist
const addToWishlist = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id || req.user.id;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const user = await User.findById(userId);
    
    // Check if product already in wishlist (handle both structures)
    const alreadyInWishlist = user.wishlist.some(item => {
      if (typeof item === 'object' && item.product) {
        return item.product.toString() === productId;
      }
      return item.toString() === productId;
    });

    if (alreadyInWishlist) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add to wishlist (use simple product reference)
    user.wishlist.push(productId);
    await user.save();

    // Populate the response with product details
    await user.populate({
      path: 'wishlist',
      select: 'name price images category rating description'
    });

    res.json({
      success: true,
      message: 'Product added to wishlist successfully',
      data: user.wishlist
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding product to wishlist'
    });
  }
});

// Remove from wishlist
const removeFromWishlist = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId);
    
    // Remove from wishlist (handle both structures)
    user.wishlist = user.wishlist.filter(item => {
      if (typeof item === 'object' && item.product) {
        return item.product.toString() !== productId;
      }
      return item.toString() !== productId;
    });
    
    await user.save();

    // Populate the response
    await user.populate({
      path: 'wishlist',
      select: 'name price images category rating description'
    });

    res.json({
      success: true,
      message: 'Product removed from wishlist successfully',
      data: user.wishlist
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing product from wishlist'
    });
  }
});

// Check if product is in wishlist
const checkWishlist = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId);
    const isInWishlist = user.wishlist.some(item => {
      if (typeof item === 'object' && item.product) {
        return item.product.toString() === productId;
      }
      return item.toString() === productId;
    });

    res.json({
      success: true,
      data: { isInWishlist }
    });
  } catch (error) {
    console.error('Error checking wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking wishlist status'
    });
  }
});

module.exports = {
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
};