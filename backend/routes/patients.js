const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');

// @route   GET /api/patients
// @desc    Obtenir tous les inscrits (Admin)
router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json({ success: true, count: patients.length, patients });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   PUT /api/patients/:id/update-profile
// @desc    Compléter le profil (Téléphone & Commune) après connexion Google
router.put('/:id/update-profile', async (req, res) => {
  try {
    const { phone, commune, userType } = req.body;
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $set: { phone, commune, role: userType || 'user' } },
      { new: true }
    );
    res.json({ success: true, message: 'Profil mis à jour', patient });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
});

// @route   PUT /api/patients/:id/role
// @desc    Modifier le rôle d'un utilisateur (Admin)
router.put('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true }
    );
    res.json({ success: true, message: 'Rôle mis à jour', patient });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors du changement de rôle' });
  }
});

// @route   DELETE /api/patients/:id
// @desc    Supprimer un utilisateur (Admin)
router.delete('/:id', async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
});

module.exports = router;