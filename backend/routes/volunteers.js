const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const Volunteer = require('../models/Volunteer');
const SMSLog = require('../models/SMSLog');

// Création dynamique du dossier d'upload si nécessaire
const fs = require('fs');
const uploadDir = 'uploads/social-docs/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration de Multer pour stocker les pièces jointes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Seuls les fichiers PDF, JPG et PNG sont acceptés'));
    }
});

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Middleware d'authentification autonome
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

// Fonction utilitaire pour formater l'URL complète d'accès aux fichiers
const formatFileUrl = (req, filePath) => {
    if (!filePath) return null;
    const cleanPath = filePath.replace(/\\/g, '/');
    return `${req.protocol}://${req.get('host')}/${cleanPath}`;
};

// @route   POST /api/volunteers/register
// @desc    Inscription initiale d'un bénévole (Formulaire public)
// @access  Public
router.post('/register', [
    body('fullName').trim().notEmpty().withMessage('Le nom complet est requis'),
    body('phone').isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
    body('activityCommune').notEmpty().withMessage("La commune d'activité est requise")
], upload.single('socialDoc'), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { fullName, phone, activityCommune, associationName, nin } = req.body;

        let volunteer = await Volunteer.findOne({ phone });
        if (volunteer) {
            return res.status(400).json({
                success: false,
                message: 'Ce numéro de téléphone est déjà enregistré'
            });
        }

        const code = generateCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const documentUrl = req.file ? formatFileUrl(req, req.file.path) : undefined;

        volunteer = new Volunteer({
            fullName,
            phone,
            activityCommune,
            associationName,
            nin,
            socialDocPath: documentUrl,
            verificationCode: code,
            verificationCodeExpires: expiresAt,
            isActive: true, // ✅ Défini à true pour que l'Admin puisse immédiatement le voir
            userType: 'volunteer'
        });

        await volunteer.save();

        console.log(`📱 SMS à ${phone}: Votre code Tadamun: ${code}`);

        await SMSLog.create({
            phone,
            message: `Code: ${code}`,
            type: 'verification',
            status: 'sent'
        });

        res.status(201).json({
            success: true,
            message: 'Bénévole enregistré avec succès',
            devCode: code,
            volunteer
        });

    } catch (error) {
        console.error('Register volunteer error:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de l'inscription"
        });
    }
});

// @route   POST /api/volunteers/complete-profile
// @desc    Finalisation/Mise à jour du profil bénévole connecté via JWT (Google OAuth/Session)
// @access  Private (JWT)
router.post('/complete-profile', verifyToken, upload.single('socialDoc'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, phone, activityCommune, associationName, nin } = req.body;
        
        const documentUrl = req.file ? formatFileUrl(req, req.file.path) : undefined;

        const updatedVolunteer = await Volunteer.findByIdAndUpdate(
            userId,
            {
                fullName,
                phone,
                activityCommune,
                associationName,
                nin,
                ...(documentUrl && { socialDocPath: documentUrl }),
                isActive: true,
                isProfileComplete: true,
                userType: 'volunteer'
            },
            { new: true, runValidators: false }
        ).select('-verificationCode -verificationCodeExpires');

        if (!updatedVolunteer) {
            return res.status(404).json({ success: false, message: 'Compte bénévole non trouvé' });
        }

        res.json({
            success: true,
            message: 'Profil bénévole mis à jour avec succès',
            volunteer: updatedVolunteer
        });
    } catch (error) {
        console.error("Complete volunteer profile error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/volunteers
// @desc    Obtenir la liste complète des bénévoles (pour le Dashboard Admin)
// @access  Public / Admin
router.get('/', async (req, res) => {
    try {
        const { commune } = req.query;
        // ✅ Supression du filtre restrictif "isActive: true" forcé pour afficher tous les inscrits à l'Admin
        const query = commune ? { activityCommune: commune } : {};

        const volunteers = await Volunteer.find(query)
            .select('-verificationCode -verificationCodeExpires')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: volunteers.length,
            volunteers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des bénévoles'
        });
    }
});

// @route   GET /api/volunteers/:id
// @desc    Obtenir les détails d'un bénévole par son ID
// @access  Public / Admin
router.get('/:id', async (req, res) => {
    try {
        const volunteer = await Volunteer.findById(req.params.id)
            .select('-verificationCode -verificationCodeExpires');

        if (!volunteer) {
            return res.status(404).json({
                success: false,
                message: 'Bénévole non trouvé'
            });
        }

        res.json({
            success: true,
            volunteer
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la recherche du bénévole'
        });
    }
});

module.exports = router;