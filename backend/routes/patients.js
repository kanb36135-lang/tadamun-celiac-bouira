const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configuration Multer pour sauvegarder les fichiers PDF / images
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 } // Limite 5MB
});

const Patient = require('../models/Patient');

// Middleware d'authentification autonome
const jwt = require('jsonwebtoken');
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Accès non autorisé.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Token invalide.' });
    }
};

// Route POST : Valider les données du patient + Fichier PDF
router.post('/complete-profile', verifyToken, upload.single('medicalCert'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, phone, commune } = req.body;
        
        // Emplacement du fichier téléversé (PDF/Image)
        const fileUrl = req.file ? req.file.path : null;

        const updatedPatient = await Patient.findByIdAndUpdate(
            userId,
            {
                fullName,
                phone,
                commune,
                ...(fileUrl && { medicalCert: fileUrl }),
                isProfileComplete: true
            },
            { new: true, runValidators: false } // Avoid false validation errors
        );

        if (!updatedPatient) {
            return res.status(404).json({ success: false, message: 'Patient non trouvé' });
        }

        res.json({
            success: true,
            message: 'Profil et attestation mis à jour avec succès',
            patient: updatedPatient
        });
    } catch (error) {
        console.error("Erreur complète :", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;