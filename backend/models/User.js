const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Authentification Google
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    
    // Informations de profil
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    wilaya: { type: String, required: true },
    commune: { type: String, required: true },

    // Type d'utilisateur
    role: { 
        type: String, 
        enum: ['patient', 'volunteer', 'admin'], 
        required: true 
    },

    // Champ spécifique Patient (URL du PDF hébergé)
    medicalCertUrl: { type: String },

    // Suivi du statut
    isProfileComplete: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);