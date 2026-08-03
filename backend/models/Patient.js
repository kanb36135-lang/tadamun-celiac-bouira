const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Le nom complet est requis'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Le numéro de téléphone est requis'],
    unique: true,
    trim: true
  },
  commune: {
    type: String,
    required: [true, 'La commune est requise'],
    enum: ['البويرة', 'الشرفة', 'الحيزر', 'سور الغزلان', 'مشد اللجم', 'الأخضرية', ' autres']
  },
  address: {
    type: String,
    trim: true
  },
  medicalCertPath: {
    type: String,
    required: [true, 'Le certificat médical est requis']
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String
  },
  verificationCodeExpires: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });  // ✅ timestamps: true gère createdAt/updatedAt automatiquement

// Index for phone lookups
// patientSchema.index({ phone: 1 });

module.exports = mongoose.model('Patient', patientSchema);