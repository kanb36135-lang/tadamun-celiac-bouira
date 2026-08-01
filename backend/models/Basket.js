const mongoose = require('mongoose');

const basketSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'delivered'],
    default: 'pending'
  },
  socialDocPath: {
    type: String
  },
  isNeedy: {
    type: Boolean,
    default: false
  },
  contents: [{
    item: String,
    quantity: Number,
    unit: String
  }],
  pickupPoint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PickupPoint'
  },
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Volunteer'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Basket', basketSchema);
