const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    default: 'دقيق الأرز — مصنع الأمل'
  },
  targetQuantity: {
    type: Number,
    required: true,
    default: 500
  },
  currentQuantity: {
    type: Number,
    default: 0
  },
  unitPrice: {
    type: Number,
    default: 450
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'fulfilled'],
    default: 'open'
  },
  deadline: {
    type: Date
  },
  supplier: {
    name: String,
    phone: String,
    email: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for progress percentage
counterSchema.virtual('progress').get(function() {
  return Math.round((this.currentQuantity / this.targetQuantity) * 100);
});

module.exports = mongoose.model('Counter', counterSchema);
