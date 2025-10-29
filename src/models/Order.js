const mongoose = require('mongoose');

// Define order item schema
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  qty: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

// Define shipping address schema
const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  }
});

// Define main order schema
const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderItems: [orderItemSchema],
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  shippingAddress: shippingAddressSchema, // Use the defined sub-schema
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'PHONEPE'],
    default: 'COD'
  },
  merchantTransactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  phonepeTransactionId: String
}, {
  timestamps: true
});

// Remove any old address field if it exists in the database
orderSchema.pre('save', function(next) {
  // If there's an old address field, remove it
  if (this.address && typeof this.address === 'object') {
    this.address = undefined;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);