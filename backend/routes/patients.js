const express = require('express');
const router = express.Router();
const multer = require('multer');
const jwt = require('jsonwebtoken');

// Configuration du dossier pour les certificats médicaux
const upload = multer({ dest: 'uploads/' });

// Importer le modèle Patient exact depuis backend/models/Patient.js
const Patient = require('../models/Patient');

// Middleware local pour vérifier le token JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Accès non autorisé : Token manquant.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Token invalide ou expiré.' });
    }
};

// Middleware local pour vérifier le rôle Admin
const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
    }
};

// --- 1. ROUTE GET : Récupérer tous les patients (ADMIN) ---
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const patients = await Patient.find().select('-password');
        res.json({
            success: true,
            count: patients.length,
            patients
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 2. ROUTE GET : Récupérer un patient par son ID ---
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

// --- 3. ROUTE POST : Compléter le profil (Après inscription) ---
router.post('/complete-profile', verifyToken, upload.single('medicalCert'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, phone, commune } = req.body;
        const fileUrl = req.file ? req.file.path : null;

        const updatedPatient = await Patient.findByIdAndUpdate(
            userId,
            {
                fullName,
                phone,
                commune,
                medicalCert: fileUrl,
                isProfileComplete: true
            },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profil mis à jour avec succès',
            patient: updatedPatient
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 4. ROUTE PUT : Modification d'un patient (ADMIN) ---
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

// --- 5. ROUTE DELETE : Suppression d'un patient (ADMIN) ---
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await Patient.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Patient supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;