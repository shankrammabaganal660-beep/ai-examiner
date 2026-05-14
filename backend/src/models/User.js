const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'teacher', 'examiner', 'student'], required: true },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  // Student fields
  rollNumber: { type: String, unique: true, sparse: true },
  usn: { type: String, unique: true, sparse: true },
  semester: String,
  section: String,
  department: String,
  collegeName: String,
  attendancePercentage: { type: Number, default: 0 },
  achievements: [{ type: String }],
  streakDays: { type: Number, default: 0 },
  lastLoginDate: Date,

  // Teacher/Examiner fields
  employeeId: { type: String, unique: true, sparse: true },
  subjects: [{ type: String }],
  evaluationsCompleted: { type: Number, default: 0 },
  avgEvaluationTime: { type: Number, default: 0 }, // minutes

  // Common
  phoneNumber: String,
  bio: String,
  avatar: String,
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },
  themePreference: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  devices: [{ deviceId: String, lastSeen: Date, userAgent: String }],
  lastPasswordChange: Date,

  // OTP for email verification
  otp: String,
  otpExpires: Date,
  isEmailVerified: { type: Boolean, default: false },

  // Password reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,

}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.otp;
  delete user.otpExpires;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  return user;
};

module.exports = mongoose.model('User', userSchema);
