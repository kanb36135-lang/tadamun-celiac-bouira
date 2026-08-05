const express = require('express');
const router = express.Router();
const multer = require('multer');
const jwt = require('jsonwebtoken');

// Configuration Multer pour sauvegarder les fichiers PDF / images (max 5 Mo)
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }
});

const Patient = require('../models/Patient');

// Middleware d'authentification autonome (Vérification du Token JWT)
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

// Middleware d'authentification autonome (Vérification Admin)
const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
    }
};

// --- 1. ROUTE GET : Récupérer tous les patients (ADMIN ONLY) ---
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Récupère les inscrits avec rôle patient ou sans rôle spécifié au départ
        const patients = await Patient.find({
            $or: [
                { userType: 'patient' },
                { userType: { $exists: false } },
                { userType: null }
            ]
        }).select('-password');

        res.json({
            success: true,
            count: patients.length,
            patients
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 2. ROUTE GET : Récupérer un patient spécifique par ID ---
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).select('-password');
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient non trouvé' });
        }
        res.json({ success: true, patient });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 3. ROUTE POST : Valider les données du patient + Fichier PDF ---
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
            message: 'Profil et attestation mis à jour avec succès',
            patient: updatedPatient
        });
    } catch (error) {
        console.error("Erreur complète :", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 4. ROUTE PUT : Modification d'un patient par l'Admin ---
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const updatedPatient = await Patient.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).select('-password');
        
        res.json({ success: true, patient: updatedPatient });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 5. ROUTE DELETE : Suppression d'un patient par l'Admin ---
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await Patient.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Patient supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;