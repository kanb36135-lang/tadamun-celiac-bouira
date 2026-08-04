const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const Patient = require('../models/Patient');
const SMSLog = require('../models/SMSLog');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/medical-certs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cert-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Seuls les fichiers PDF, JPG et PNG sont acceptés'));
  }
});

// Generate verification code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// @route   POST /api/patients/register
// @desc    Register a new patient
// @access  Public
router.post('/register', [
  body('fullName').trim().notEmpty().withMessage('Le nom complet est requis'),
  body('phone').isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('commune').notEmpty().withMessage('La commune est requise')
], upload.single('medicalCert'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fullName, phone, commune, address } = req.body;

    // Check if phone already exists
    const existingPatient = await Patient.findOne({ phone });
    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro de téléphone est déjà enregistré'
      });
    }

    // Check if file was uploaded
    const medicalCertPath = req.file ? req.file.path : 'pending_upload';

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const patient = new Patient({
      fullName,
      phone,
      commune,
      address,
      medicalCertPath: medicalCertPath,
      verificationCode: code,
      verificationCodeExpires: expiresAt
    });

    await patient.save();

    console.log(`📱 SMS to ${phone}: Votre code Tadamun: ${code}`);

    await SMSLog.create({
      phone,
      message: `Code: ${code}`,
      type: 'verification',
      status: 'sent'
    });

    res.status(201).json({
      success: true,
      message: 'Patient enregistré avec succès',
      devCode: code,
      patientId: patient._id
    });

  } catch (error) {
    console.error('Register patient error:', error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de l'inscription`
    });
  }
});

// @route   GET /api/patients
// @desc    Get all patients (admin access)
// @access  Public/Admin
router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find()
      .select('-verificationCode -verificationCodeExpires')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: patients.length,
      patients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// @route   GET /api/patients/:id
// @desc    Get patient by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .select('-verificationCode -verificationCodeExpires');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient non trouvé'
      });
    }

    res.json({
      success: true,
      patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;