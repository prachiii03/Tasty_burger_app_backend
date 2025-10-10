const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  images: [String], // Change from image: String to images: [String]
  rating: { type: Number, default: 0 },
  countInStock: { type: Number, default: 0 },
  category: String
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);