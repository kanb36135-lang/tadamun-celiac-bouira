const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const Patient = require('../models/Patient');
const Volunteer = require('../models/Volunteer');
const SMSLog = require('../models/SMSLog');
const upload = require('../middleware/upload');  //  Correct (singulier) // Importation du middleware Multer (Mémoire vive)

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
// ROUTES GOOGLE OAUTH
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
      { id: req.user._id, email: req.user.email, role: req.user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const userData = {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      photo: req.user.photo || null,
      role: req.user.role || 'user'
    };
    
    const userString = encodeURIComponent(JSON.stringify(userData));
    
    res.redirect(`https://tadamun-celiac-bouira-site.onrender.com?token=${token}&user=${userString}`);
  }
);

// ============================================
// NOUVELLE ROUTE : FINALISATION DE L'INSCRIPTION (POST)
// ============================================
router.post('/finalize-signup', upload.single('medicalCert'), async (req, res) => {
  try {
    const { googleId, email, lastName, firstName, phone, role, wilaya, commune } = req.body;

    // 1. Vérifier si le numéro de téléphone ou le compte Google est déjà utilisé quelque part
    const alreadyPatient = await Patient.findOne({ $or: [{ googleId }, { phone }] });
    const alreadyVolunteer = await Volunteer.findOne({ $or: [{ googleId }, { phone }] });

    if (alreadyPatient || alreadyVolunteer) {
      return res.status(400).json({ success: false, message: 'Ce numéro ou ce compte Google est déjà enregistré.' });
    }

    // 2. Préparer le dictionnaire de données de base
    const baseUserData = {
      googleId,
      email,
      lastName,
      firstName,
      fullName: `${firstName} ${lastName}`,
      phone,
      role: role || 'user',
      wilaya,
      commune,
      isVerified: false // Sera vérifié par SMS plus tard si nécessaire
    };

    let savedUser;

    // 3. Sauvegarder dans la bonne collection selon le rôle choisi
    if (role === 'patient') {
      // Si c'est un patient, on ajoute le fichier PDF reçu en mémoire
      if (req.file) {
        baseUserData.medicalCert = {
          data: req.file.buffer,         // Les octets (Buffer) du PDF
          contentType: req.file.mimetype, // 'application/pdf'
          fileName: req.file.originalname // Le nom initial du fichier
        };
      }
      savedUser = new Patient(baseUserData);
    } else {
      // Si c'est un volontaire (ou autre rôle)
      savedUser = new Volunteer(baseUserData);
    }

    await savedUser.save();

    // 4. Générer un jeton d'accès JWT temporaire de session
    const token = jwt.sign(
      { id: savedUser._id, email: savedUser.email, role: savedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Inscription enregistrée en attente de vérification.',
      token,
      user: {
        id: savedUser._id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        role: savedUser.role,
        type: role
      }
    });

  } catch (error) {
    console.error('Finalize signup error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création du profil.' });
  }
});

// ============================================
// ROUTES SMS
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