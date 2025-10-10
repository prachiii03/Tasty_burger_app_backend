require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/user'); 
const adminRoutes = require('./routes/admin');

connectDB();
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ FIXED: Mount routes at root level OR add /api prefix consistently
// Option 1: Mount at root level (remove /api prefix)
app.use('/auth', authRoutes);
app.use('/products', productRoutes); // Now accessible at /products
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Burger API is running!',
    timestamp: new Date().toISOString(),
    routes: {
      products: '/products',
      health: '/health',
      auth: '/auth'
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Burger Delivery API is running!',
    endpoints: {
      products: '/products',
      health: '/health',
      auth: '/auth'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    requestedUrl: req.originalUrl,
    availableEndpoints: {
      products: '/products',
      health: '/health',
      auth: '/auth'
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🍔 Products: http://localhost:${PORT}/products`);
});