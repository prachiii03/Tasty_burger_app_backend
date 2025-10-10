const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = adminMiddleware;
