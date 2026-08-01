const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['verification', 'notification', 'alert'],
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    default: 'pending'
  },
  provider: {
    type: String,
    default: 'twilio'
  },
  errorMessage: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SMSLog', smsLogSchema);
