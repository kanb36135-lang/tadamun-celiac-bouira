const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const Patient = require('../models/Patient');
const Volunteer = require('../models/Volunteer');
const SMSLog = require('../models/SMSLog');
const upload = require('../middleware/upload'); // Middleware Multer

// Générer un code de vérification à 6 chiffres
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Envoyer un SMS (placeholder)
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

// Fonction utilitaire pour nettoyer et extraire le nom de la commune s'il est au format "NomAr (NomFr)"
const formatCommuneName = (rawCommune) => {
  if (!rawCommune) return '';
  const str = rawCommune.trim();
  // Extrait le texte entre parenthèses si disponible (ex: "Chorfa" dans "الشرفة (Chorfa)")
  const match = str.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return str;
};

// ============================================
// ROUTES GOOGLE OAUTH
// ============================================

// 1. Lancer la connexion Google
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

// 2. Callback après connexion Google
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: 'https://tadamun-celiac-bouira-site.onrender.com' }),
  (req, res) => {
    res.redirect('https://tadamun-celiac-bouira-site.onrender.com');
  }
);

// 3. Interrogation de la session actuelle par le frontend
router.get('/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return res.json({
      authenticated: true,
      user: {
        id: req.user._id || req.user.googleId,
        fullName: req.user.fullName || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
        email: req.user.email,
        photo: req.user.photo || null
      }
    });
  }
  return res.json({ authenticated: false });
});

// ============================================
// FINALISATION DE L'INSCRIPTION (POST)
// ============================================
const cpUpload = upload.fields([
  { name: 'medicalCert', maxCount: 1 },
  { name: 'socialDoc', maxCount: 1 }
]);

router.post('/finalize-signup', cpUpload, async (req, res) => {
  try {
    const { googleId, email, lastName, firstName, phone, role, wilaya, commune } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "L'adresse email est requise pour finaliser l'inscription." 
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Utilisateur';
    const userRole = role || 'patient';
    const cleanedCommune = formatCommuneName(commune);

    // Données de base
    const baseUserData = {
      email: cleanEmail,
      lastName,
      firstName,
      fullName,
      phone,
      role: userRole,
      wilaya,
      commune: cleanedCommune || commune,
      // Champs requis par le schéma Volunteer
      activityWilaya: wilaya,
      activityCommune: cleanedCommune || commune,
      isVerified: true
    };

    if (googleId) {
      baseUserData.googleId = googleId;
    }

    // Traitement des fichiers reçus via Multer (si présents)
    if (req.files) {
      if (req.files.medicalCert && req.files.medicalCert[0]) {
        const file = req.files.medicalCert[0];
        baseUserData.medicalCert = {
          data: file.buffer,
          contentType: file.mimetype,
          fileName: file.originalname
        };
        baseUserData.medicalCertPath = file.originalname;
      }
      
      if (req.files.socialDoc && req.files.socialDoc[0]) {
        const file = req.files.socialDoc[0];
        baseUserData.socialDoc = {
          data: file.buffer,
          contentType: file.mimetype,
          fileName: file.originalname
        };
        baseUserData.socialDocPath = file.originalname;
      }
    }

    // Création du filtre de recherche
    const searchQuery = [{ email: cleanEmail }];
    if (googleId) searchQuery.push({ googleId });

    let savedUser;

    // A. Gestion du rôle 'patient'
    if (userRole === 'patient') {
      savedUser = await Patient.findOne({ $or: searchQuery });

      if (savedUser) {
        Object.assign(savedUser, baseUserData);
      } else {
        savedUser = new Patient(baseUserData);
      }
      await savedUser.save();

    // B. Gestion du rôle 'volunteer'
    } else {
      savedUser = await Volunteer.findOne({ $or: searchQuery });

      if (savedUser) {
        Object.assign(savedUser, baseUserData);
      } else {
        savedUser = new Volunteer(baseUserData);
      }
      await savedUser.save();
    }

    // Génération du Token JWT
    const token = jwt.sign(
      { id: savedUser._id, email: savedUser.email, role: savedUser.role },
      process.env.JWT_SECRET || 'tadamun_secret_key',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Inscription et profil enregistrés avec succès.',
      token,
      user: {
        id: savedUser._id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        role: savedUser.role,
        type: userRole
      }
    });

  } catch (error) {
    console.error('Finalize signup error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de la création ou mise à jour du profil.' 
    });
  }
});

// ============================================
// ROUTES SMS ET VÉRIFICATION
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
      { id: user._id, phone: user.phone, type: user instanceof Patient ? 'patient' : 'volunteer', role: user.role || 'user' },
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
        commune: user.commune || user.activityCommune,
        role: user.role || 'user'
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