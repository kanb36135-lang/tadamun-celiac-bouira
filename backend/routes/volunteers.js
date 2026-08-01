const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const Volunteer = require('../models/Volunteer');
const SMSLog = require('../models/SMSLog');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/social-docs/');
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

// @route   POST /api/volunteers/register
// @desc    Register a new volunteer
// @access  Public
router.post('/register', [
  body('fullName').trim().notEmpty().withMessage('Le nom complet est requis'),
  body('phone').isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('activityCommune').notEmpty().withMessage(`La commune d'activité est requise`)  // ← CORRIGÉ LIGNE 39
], upload.single('socialDoc'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fullName, phone, activityCommune, associationName, nin } = req.body;

    // Check if phone already exists
    const existingVolunteer = await Volunteer.findOne({ phone });
    if (existingVolunteer) {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro de téléphone est déjà enregistré'
      });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const volunteer = new Volunteer({
      fullName,
      phone,
      activityCommune,
      associationName,
      nin,
      socialDocPath: req.file ? req.file.path : undefined,
      verificationCode: code,
      verificationCodeExpires: expiresAt
    });

    await volunteer.save();

    console.log(`📱 SMS to ${phone}: Votre code Tadamun: ${code}`);

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
      volunteerId: volunteer._id
    });

  } catch (error) {
    console.error('Register volunteer error:', error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de l'inscription`  // ← CORRIGÉ LIGNE 94
    });
  }
});

// @route   GET /api/volunteers
// @desc    Get all volunteers
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { commune } = req.query;
    const query = commune ? { activityCommune: commune, isActive: true } : { isActive: true };

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
      message: 'Erreur serveur'
    });
  }
});

// @route   GET /api/volunteers/:id
// @desc    Get volunteer by ID
// @access  Public
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
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;