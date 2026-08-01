const mongoose = require('mongoose');

const pickupPointSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du point est requis'],
    trim: true
  },
  commune: {
    type: String,
    required: [true, 'La commune est requise']
  },
  address: {
    type: String,
    required: true
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Volunteer',
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  schedule: {
    open: String,
    close: String,
    days: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

pickupPointSchema.index({ commune: 1 });
pickupPointSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('PickupPoint', pickupPointSchema);