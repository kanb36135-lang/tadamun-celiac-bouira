const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const Basket = require('../models/Basket');
const Patient = require('../models/Patient');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/social-docs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'basket-' + uniqueSuffix + path.extname(file.originalname));
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

// @route   POST /api/baskets/request
// @desc    Request a solidarity basket
// @access  Private
router.post('/request', [
  body('patientId').isMongoId().withMessage('ID patient invalide')
], upload.single('socialDoc'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { patientId, isNeedy, notes } = req.body;

    // Verify patient
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient non trouvé'
      });
    }

    // Check if patient already has a pending basket
    const existingBasket = await Basket.findOne({
      patient: patientId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingBasket) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà une demande de panier en cours'
      });
    }

    // Default basket contents
    const defaultContents = [
      { item: 'دقيق أرز', quantity: 2, unit: 'كيس 5kg' },
      { item: 'معكرونة خالية من الغلوتين', quantity: 1, unit: 'كيس' },
      { item: 'حليب نباتي', quantity: 1, unit: 'علبة' },
      { item: 'خبز خالٍ من الغلوتين', quantity: 1, unit: 'رغيف' }
    ];

    const basket = new Basket({
      patient: patientId,
      isNeedy: isNeedy === 'true',
      socialDocPath: req.file ? req.file.path : undefined,
      contents: defaultContents,
      notes
    });

    await basket.save();

    res.status(201).json({
      success: true,
      message: 'Demande de panier solidaire envoyée avec succès',
      basket: {
        id: basket._id,
        status: basket.status,
        contents: basket.contents
      }
    });

  } catch (error) {
    console.error('Basket request error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la demande'
    });
  }
});

// @route   GET /api/baskets
// @desc    Get all basket requests
// @access  Private/Admin
router.get('/', async (req, res) => {
  try {
    const { status, patientId } = req.query;
    const query = {};

    if (status) query.status = status;
    if (patientId) query.patient = patientId;

    const baskets = await Basket.find(query)
      .populate('patient', 'fullName phone commune')
      .populate('pickupPoint', 'name commune')
      .populate('volunteer', 'fullName phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: baskets.length,
      baskets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// @route   PUT /api/baskets/:id/approve
// @desc    Approve a basket request
// @access  Private/Admin
router.put('/:id/approve', async (req, res) => {
  try {
    const basket = await Basket.findById(req.params.id);
    if (!basket) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    basket.status = 'approved';
    basket.approvedAt = new Date();
    await basket.save();

    res.json({
      success: true,
      message: 'Demande approuvée',
      basket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
