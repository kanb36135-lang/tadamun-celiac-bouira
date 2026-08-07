const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Route pour afficher/télécharger le PDF d'un patient spécifique
router.get('/download-cert/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user || !user.medicalCert || !user.medicalCert.data) {
            return res.status(404).send('Certificat médical introuvable.');
        }

        // Configuration pour ouvrir le PDF directement dans le navigateur
        res.set({
            'Content-Type': user.medicalCert.contentType,
            'Content-Disposition': `inline; filename="${user.medicalCert.fileName}"`
        });

        res.send(user.medicalCert.data);

    } catch (err) {
        res.status(500).send('Erreur lors de la récupération du fichier.');
    }
});

// Route pour récupérer TOUS les utilisateurs inscrits
router.get('/users', async (req, res) => {
    try {
        // On récupère tous les utilisateurs en masquant les données binaires lourdes du PDF pour alléger la réponse
        const users = await User.find({}, '-medicalCert.data').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
    }
});

module.exports = router;