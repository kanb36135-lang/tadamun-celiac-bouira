const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Le nom complet est requis'],
    trim: true
  },
  phone: {
    type: String,
    required: function() { 
      return !this.googleId; 
    },
    default: undefined,
    sparse: true, // Permet à plusieurs utilisateurs d'avoir phone = undefined
    trim: true
  },
  commune: {
    type: String,
    default: 'non_defini'
  },
  address: {
    type: String,
    trim: true
  },
  medicalCertPath: {
    type: String,
    default: null
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  photo: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
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
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Patient', patientSchema);