const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    lastName: { type: String },
    firstName: { type: String },
    fullName: { type: String },
    phone: { type: String },
    role: { type: String, enum: ['patient', 'volunteer', 'user', 'admin'], default: 'patient' },
    wilaya: { type: String },
    commune: { type: String },
    
    medicalCert: {
        data: Buffer,
        contentType: String,
        fileName: String
    },
    medicalCertPath: { type: String, default: null }
}, { 
    timestamps: true 
});

// Force Mongoose à lire la collection 'patients' où sont enregistrés les comptes
module.exports = mongoose.model('User', UserSchema, 'patients');