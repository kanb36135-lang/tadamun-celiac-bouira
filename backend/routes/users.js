const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');

// Configuration du stockage PDF
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Middleware d'authentification JWT/Session
const verifyToken = require('../middleware/auth');

router.post('/complete-profile', verifyToken, upload.single('medicalCert'), async (req, res) => {
    try {
        const { firstName, lastName, phone, wilaya, commune, role } = req.body;
        const userId = req.user.id;

        let certUrl = null;
        if (req.file) {
            const cleanPath = req.file.path.replace(/\\/g, '/');
            certUrl = `${req.protocol}://${req.get('host')}/${cleanPath}`;
        }

        const updateData = {
            firstName,
            lastName,
            phone,
            wilaya,
            commune,
            role,
            isProfileComplete: true
        };

        if (role === 'patient' && certUrl) {
            updateData.medicalCertUrl = certUrl;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

        res.json({
            success: true,
            message: 'Profil enregistré avec succès',
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;