const express = require('express');
const router = express.Router();
const multer = require('multer');
const jwt = require('jsonwebtoken');

const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }
});

const Patient = require('../models/Patient');

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

const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
    }
};

// GET : Liste de tous les patients pour l'Admin
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const patients = await Patient.find({
            $or: [
                { userType: 'patient' },
                { userType: { $exists: false } },
                { userType: null }
            ]
        }).select('-password');

        res.json({ success: true, count: patients.length, patients });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET : Détails d'un patient par ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).select('-password');
        if (!patient) return res.status(404).json({ success: false, message: 'Patient non trouvé' });
        res.json({ success: true, patient });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST : Mettre à jour le profil Patient + Formater l'URL du PDF
router.post('/complete-profile', verifyToken, upload.single('medicalCert'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, phone, commune } = req.body;
        
        // Construction de l'URL accessible du PDF pour l'administrateur
        let fileUrl = null;
        if (req.file) {
            const cleanPath = req.file.path.replace(/\\/g, '/'); // Remplacer anti-slashs Windows
            fileUrl = `${req.protocol}://${req.get('host')}/${cleanPath}`;
        }

        const updatedPatient = await Patient.findByIdAndUpdate(
            userId,
            {
                fullName,
                phone,
                commune,
                userType: 'patient',
                ...(fileUrl && { medicalCert: fileUrl }),
                isProfileComplete: true
            },
            { new: true, runValidators: false }
        ).select('-password');

        if (!updatedPatient) {
            return res.status(404).json({ success: false, message: 'Patient non trouvé' });
        }

        res.json({
            success: true,
            message: 'Profil mis à jour avec succès',
            patient: updatedPatient
        });
    } catch (error) {
        console.error("Erreur complète :", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;