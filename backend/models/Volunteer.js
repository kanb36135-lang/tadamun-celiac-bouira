const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
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
  activityWilaya: {
    type: String,
    trim: true
  },
  activityCommune: {
    type: String,
    required: [true, `La commune d'activité est requise`],
    trim: true
    // Note: suppression du champ 'enum' restreint pour éviter les échecs de validation avec les libellés multilingues.
  },
  associationName: {
    type: String,
    trim: true
  },
  nin: {
    type: String,
    trim: true
  },
  socialDocPath: {
    type: String
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
  totalDeliveries: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

volunteerSchema.index({ activityCommune: 1 });

module.exports = mongoose.model('Volunteer', volunteerSchema);