const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  qty: Number,
  price: Number
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderItems: [orderItemSchema],
  totalPrice: Number,
  status: { type: String, default: 'pending' },
  address: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
