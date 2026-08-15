const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
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
    sparse: true,
    trim: true
  },
  wilaya: { type: String, trim: true },
  commune: {
    type: String,
    default: 'non_defini'
  },
  address: {
    type: String,
    trim: true
  },
  medicalCert: {
    data: Buffer,
    contentType: String,
    fileName: String
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
    enum: ['patient', 'volunteer', 'user', 'admin'],
    default: 'patient'
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

// Forcer la liaison exacte avec la collection 'patients' dans MongoDB Atlas
module.exports = mongoose.model('Patient', patientSchema, 'patients');