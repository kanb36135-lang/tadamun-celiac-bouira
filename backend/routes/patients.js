const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configuration du dossier de destination pour les certificats
const upload = multer({ dest: 'uploads/' });

// Importer le modèle User
const User = require('../models/user');

// Middlewares d'authentification & de vérification Admin
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// --- 1. ROUTE GET : Récupérer tous les patients (ADMIN ONLY) ---
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Filtre les utilisateurs pour ne récupérer que ceux qui sont des patients
        const patients = await User.find({ userType: 'patient' }).select('-password');
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
        const patient = await User.findOne({ _id: req.params.id, userType: 'patient' }).select('-password');
        
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient non trouvé' });
        }

        res.json({
            success: true,
            patient
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 3. ROUTE POST : Compléter le profil (Après inscription Email) ---
router.post('/complete-profile', verifyToken, upload.single('medicalCert'), async (req, res) => {
    try {
        const userId = req.user.id; // Obtenu via verifyToken
        const { fullName, phone, commune, type } = req.body;
        const fileUrl = req.file ? req.file.path : null;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                fullName,
                phone,
                commune,
                userType: type, // 'volunteer' ou 'patient'
                medicalCert: fileUrl,
                isProfileComplete: true
            },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profil mis à jour avec succès',
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 4. ROUTE PUT : Modification d'un patient (ADMIN ONLY) ---
router.put('/user/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        ).select('-password');
        
        res.json({ success: true, user: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 5. ROUTE DELETE : Suppression d'un patient (ADMIN ONLY) ---
router.delete('/user/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;