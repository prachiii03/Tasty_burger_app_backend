require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/user'); 
const adminRoutes = require('./routes/admin');
const phonepeRoutes = require('./routes/phonepe');

connectDB();
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ FIXED: Mount PhonePe routes at root level (not /api/phonepe)
app.use('/phonepe', phonepeRoutes);

// ✅ CRITICAL: Serve static files BEFORE any other routes
// Go up one level from src folder to reach uploads
const uploadsPath = path.join(__dirname, '..', 'uploads');

app.use('/uploads', (req, res, next) => {
  console.log('📸 Image request:', req.url);
  const filePath = path.join(uploadsPath, req.url);
  console.log('📂 Full path:', filePath);
  console.log('📋 File exists:', fs.existsSync(filePath));
  next();
}, express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Set proper MIME types
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Burger Delivery API is running!',
    endpoints: {
      products: '/products',
      health: '/health',
      auth: '/auth',
      uploads: '/uploads/[filename]',
      phonepe: '/phonepe/pay ✅' // Added PhonePe endpoint
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Burger API is running!',
    timestamp: new Date().toISOString(),
    routes: {
      products: '/products',
      health: '/health',
      auth: '/auth',
      uploads: '/uploads/[filename]',
      phonepe: '/phonepe/pay ✅' // Added PhonePe endpoint
    }
  });
});

// ✅ Debug endpoint to check uploads folder
app.get('/debug/uploads', (req, res) => {
  const uploadsPath = path.join(__dirname, '..', 'uploads'); // Fixed path
  
  fs.readdir(uploadsPath, (err, files) => {
    if (err) {
      return res.status(500).json({ 
        error: 'Cannot read uploads folder',
        path: uploadsPath,
        message: err.message 
      });
    }
    
    const PORT = process.env.PORT || 5000;
    const fileDetails = files.map(file => ({
      filename: file,
      url: `/uploads/${file}`,
      fullUrl: `http://localhost:${PORT}/uploads/${file}`,
      path: path.join(uploadsPath, file),
      exists: fs.existsSync(path.join(uploadsPath, file))
    }));
    
    res.json({
      uploadsPath,
      totalFiles: files.length,
      files: fileDetails
    });
  });
});

// ✅ Debug endpoint to check products and their images
app.get('/debug/products', async (req, res) => {
  try {
    const Product = require('./models/Product');
    const products = await Product.find({});
    const PORT = process.env.PORT || 5000;
    
    const productsWithImageInfo = products.map(p => ({
      _id: p._id,
      name: p.name,
      images: p.images,
      imageUrls: p.images.map(img => `http://localhost:${PORT}${img}`)
    }));
    
    res.json({
      totalProducts: products.length,
      products: productsWithImageInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Debug endpoint to check PhonePe routes
app.get('/debug/routes', (req, res) => {
  const routes = [];
  
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Routes registered directly on app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  res.json({
    totalRoutes: routes.length,
    routes: routes
  });
});

// ✅ Mount API routes AFTER static files and debug routes
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ✅ 404 handler - MUST BE LAST
app.use('*', (req, res) => {
  console.log('⚠️ 404 Not Found:', req.originalUrl);
  res.status(404).json({ 
    message: 'API endpoint not found',
    requestedUrl: req.originalUrl,
    availableEndpoints: {
      products: '/products',
      health: '/health',
      auth: '/auth',
      uploads: '/uploads/[filename]',
      phonepe: '/phonepe/pay',
      debug: '/debug/uploads',
      debugRoutes: '/debug/routes'
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🍔 Products: http://localhost:${PORT}/products`);
  console.log(`🖼️  Static files: http://localhost:${PORT}/uploads/`);
  console.log(`💰 PhonePe: http://localhost:${PORT}/phonepe/pay ✅`);
  console.log(`🐛 Debug uploads: http://localhost:${PORT}/debug/uploads`);
  console.log(`🐛 Debug products: http://localhost:${PORT}/debug/products`);
  console.log(`🐛 Debug routes: http://localhost:${PORT}/debug/routes`);
});