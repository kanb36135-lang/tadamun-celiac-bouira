const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');
const Volunteer = require('../models/Volunteer');
const SMSLog = require('../models/SMSLog');

// Generate 6-digit verification code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send SMS (placeholder - integrate with Twilio or local provider)
const sendSMS = async (phone, message, type = 'verification') => {
  try {
    // TODO: Integrate with Twilio or Algerian SMS provider
    // For now, log the SMS
    console.log(`📱 SMS to ${phone}: ${message}`);

    await SMSLog.create({
      phone,
      message,
      type,
      status: 'sent'
    });

    return { success: true };
  } catch (error) {
    console.error('SMS Error:', error);
    await SMSLog.create({
      phone,
      message,
      type,
      status: 'failed',
      errorMessage: error.message
    });
    return { success: false, error: error.message };
  }
};

// @route   POST /api/auth/send-code
// @desc    Send verification code via SMS
// @access  Public
router.post('/send-code', [
  body('phone').isMobilePhone('any').withMessage('Numéro de téléphone invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone } = req.body;
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if phone exists in patients or volunteers
    let user = await Patient.findOne({ phone }) || await Volunteer.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `Numéro de téléphone non enregistré. Veuillez vous inscrire d'abord.`  // ← backticks
      });
    }

    // Update verification code
    user.verificationCode = code;
    user.verificationCodeExpires = expiresAt;
    await user.save();

    // Send SMS
    const message = `Votre code de vérification Tadamun est: ${code}. Valide pendant 10 minutes.`;
    const smsResult = await sendSMS(phone, message);

    if (!smsResult.success) {
      // For development, return the code in the response
      return res.json({
        success: true,
        message: 'Code envoyé (Mode développement)',
        devCode: code // Remove in production!
      });
    }

    res.json({
      success: true,
      message: 'Code de vérification envoyé avec succès'
    });

  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de l'envoi du code`  // ← backticks
    });
  }
});

// @route   POST /api/auth/verify-code
// @desc    Verify SMS code and login
// @access  Public
router.post('/verify-code', [
  body('phone').notEmpty().withMessage('Le téléphone est requis'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, code } = req.body;

    // Find user
    let user = await Patient.findOne({ phone }) || await Volunteer.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Check code
    if (user.verificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: 'Code de vérification incorrect'
      });
    }

    // Check expiration
    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Code expiré. Veuillez demander un nouveau code.'
      });
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        phone: user.phone,
        type: user instanceof Patient ? 'patient' : 'volunteer'
      },
      process.env.JWT_SECRET || 'tadamun_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        type: user instanceof Patient ? 'patient' : 'volunteer',
        commune: user.commune || user.activityCommune
      }
    });

  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification'
    });
  }
});

module.exports = router;