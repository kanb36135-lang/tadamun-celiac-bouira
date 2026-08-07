const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['patient', 'volunteer', 'admin'], default: 'patient' },
    wilaya: { type: String, required: true },
    commune: { type: String, required: true },
    
    // On stocke le PDF sous forme de données binaires
    medicalCert: {
        data: Buffer,
        contentType: String,
        fileName: String
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);