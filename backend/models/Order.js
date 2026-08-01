const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  productName: {
    type: String,
    default: 'دقيق الأرز — مصنع الأمل'
  },
  quantity: {
    type: Number,
    required: [true, 'La quantité est requise'],
    min: 1
  },
  unitPrice: {
    type: Number,
    default: 450 // DZD
  },
  totalPrice: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Poste Mobile', 'Carte', 'Espèces'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  pickupPoint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PickupPoint'
  },
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Volunteer'
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

// Pre-save hook to calculate total
orderSchema.pre('save', function(next) {
  this.totalPrice = this.quantity * this.unitPrice;
  next();
});

module.exports = mongoose.model('Order', orderSchema);