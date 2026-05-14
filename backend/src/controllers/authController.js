const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, rollNumber, usn, semester, section, department, employeeId, collegeName, phoneNumber } = req.body;

    if (!['student', 'teacher', 'examiner'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role for self-registration' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const user = await User.create({
      name, email, password, role,
      rollNumber, usn, semester, section, department, employeeId, collegeName, phoneNumber,
      isApproved: role === 'student', // students are auto-approved; teachers need admin approval
    });

    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user });
  } catch (err) { next(err); }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'No account found with this email' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });

    if (!user.isActive) return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
    if (!user.isApproved && user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
    }

    // Update login stats
    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() }, $inc: { loginCount: 1 } }
    );

    // Log activity (non-fatal)
    try {
      await ActivityLog.create({ user: user._id, action: 'login', resource: 'auth', status: 'success', ipAddress: req.ip });
    } catch (logErr) {
      console.warn('[Login] ActivityLog write failed (non-fatal):', logErr.message);
    }

    const token = signToken(user._id);
    res.json({ success: true, token, user });
  } catch (err) {
    console.error('[LOGIN ERROR]', err.name, err.message, err.stack);
    res.status(500).json({ success: false, message: err.message || 'Internal server error during login' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// POST /api/auth/admin-login
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email, role: 'admin' });
    if (!user) return res.status(401).json({ success: false, message: 'No admin account found with this email' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect admin password' });

    if (!user.isActive) return res.status(403).json({ success: false, message: 'Admin account is deactivated' });

    // Log activity (non-fatal)
    try {
      await ActivityLog.create({ user: user._id, action: 'admin_login', resource: 'auth', status: 'success', ipAddress: req.ip });
    } catch (logErr) {
      console.warn('[AdminLogin] ActivityLog write failed (non-fatal):', logErr.message);
    }

    const token = signToken(user._id);
    res.json({ success: true, token, user });
  } catch (err) {
    console.error('[ADMIN LOGIN ERROR]', err.name, err.message, err.stack);
    res.status(500).json({ success: false, message: err.message || 'Internal server error during admin login' });
  }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
};
