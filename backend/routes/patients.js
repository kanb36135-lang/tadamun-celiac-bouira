const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

// ✅ Import exact du modèle Patient
const Patient = require('../models/Patient');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// --- 1. ROUTE GET : Tous les patients ---
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const patients = await Patient.find().select('-password');
        res.json({ success: true, count: patients.length, patients });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 2. ROUTE GET : Un patient par ID ---
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).select('-password');
        if (!patient) return res.status(404).json({ success: false, message: 'Patient non trouvé' });
        res.json({ success: true, patient });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 3. ROUTE POST : Compléter le profil ---
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

// --- 4. ROUTE PUT : Modification patient (ADMIN) ---
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const updatedPatient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
        res.json({ success: true, patient: updatedPatient });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- 5. ROUTE DELETE : Suppression patient (ADMIN) ---
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await Patient.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Patient supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;