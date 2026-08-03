const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const Patient = require('../models/Patient');
const Volunteer = require('../models/Volunteer');
const SMSLog = require('../models/SMSLog');

// Generate 6-digit verification code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send SMS (placeholder - integrate with Twilio or local provider)
const sendSMS = async (phone, message, type = 'verification') => {
  try {
    console.log(`📱 SMS to ${phone}: ${message}`);
    await SMSLog.create({ phone, message, type, status: 'sent' });
    return { success: true };
  } catch (error) {
    console.error('SMS Error:', error);
    await SMSLog.create({ phone, message, type, status: 'failed', errorMessage: error.message });
    return { success: false, error: error.message };
  }
};

// ============================================
// ROUTES GOOGLE OAUTH (NOUVEAU)
// ============================================

// Lancer la connexion Google
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

// Callback après connexion Google
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const userData = {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      photo: req.user.photo || null
    };
    
    const userString = encodeURIComponent(JSON.stringify(userData));
    
    res.redirect(`https://tadamun-celiac-bouira-site.onrender.com?token=${token}&user=${userString}`);
  }
);

// ============================================
// ROUTES SMS (EXISTANT - CONSERVÉ)
// ============================================

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
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let user = await Patient.findOne({ phone }) || await Volunteer.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Numéro de téléphone non enregistré. Veuillez vous inscrire d\'abord.'
      });
    }

    user.verificationCode = code;
    user.verificationCodeExpires = expiresAt;
    await user.save();

    const message = `Votre code de vérification Tadamun est: ${code}. Valide pendant 10 minutes.`;
    const smsResult = await sendSMS(phone, message);

    res.json({
      success: true,
      message: smsResult.success ? 'Code envoyé' : 'Code envoyé (Mode développement)',
      devCode: code
    });

  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi du code' });
  }
});

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
    let user = await Patient.findOne({ phone }) || await Volunteer.findOne({ phone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ success: false, message: 'Code incorrect' });
    }

    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Code expiré' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, phone: user.phone, type: user instanceof Patient ? 'patient' : 'volunteer' },
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
    res.status(500).json({ success: false, message: 'Erreur lors de la vérification' });
  }
});
  
// Route de déconnexion
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Erreur lors de la destruction de la session' });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Déconnexion réussie' });
    });
  });
});

module.exports = router;