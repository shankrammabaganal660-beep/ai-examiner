const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Protect Middleware: No auth header or invalid format');
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.log(`Protect Middleware: User not found for ID: ${decoded.id}`);
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      console.log(`Protect Middleware: User ${decoded.id} is deactivated`);
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Protect Middleware error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Role '${req.user.role}' is not authorized for this resource` });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (_) {}
  next();
};

module.exports = { protect, authorize, optionalAuth };
