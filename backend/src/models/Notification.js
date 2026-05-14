const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['evaluation_complete', 'submission_received', 'exam_published', 'announcement', 'deadline_reminder', 'reeval_request', 'marks_updated', 'system'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: String,
  metadata: { type: mongoose.Schema.Types.Mixed },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
