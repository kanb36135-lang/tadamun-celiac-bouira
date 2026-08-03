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
    unique: true,
    sparse: true,
    trim: true
  },
  commune: {
    type: String,
    required: function() {
      return !this.googleId;
    },
    enum: ['البويرة', 'الشرفة', 'الحيزر', 'سور الغزلان', 'مشد اللجم', 'الأخضرية', ' autres', 'non_defini']
  },
  address: {
    type: String,
    trim: true
  },
  medicalCertPath: {
    type: String,
    required: function() {
      return !this.googleId;
    }
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
  }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);