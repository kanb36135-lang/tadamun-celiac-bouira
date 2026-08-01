const express = require('express');
const router = express.Router();
const PickupPoint = require('../models/PickupPoint');

// @route   GET /api/pickup-points
// @desc    Get all pickup points
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { commune, lat, lng, radius = 10 } = req.query;
    let query = { isActive: true };

    if (commune) {
      query.commune = commune;
    }

    // If coordinates provided, find nearby points
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    }

    const pickupPoints = await PickupPoint.find(query)
      .populate('volunteer', 'fullName phone rating')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pickupPoints.length,
      pickupPoints
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// @route   GET /api/pickup-points/:id
// @desc    Get pickup point by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const pickupPoint = await PickupPoint.findById(req.params.id)
      .populate('volunteer', 'fullName phone rating totalDeliveries');

    if (!pickupPoint) {
      return res.status(404).json({
        success: false,
        message: 'Point de retrait non trouvé'
      });
    }

    res.json({
      success: true,
      pickupPoint
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// @route   POST /api/pickup-points
// @desc    Create a new pickup point
// @access  Private/Admin
router.post('/', async (req, res) => {
  try {
    const { name, commune, address, location, volunteerId, phone, schedule } = req.body;

    const pickupPoint = new PickupPoint({
      name,
      commune,
      address,
      location,
      volunteer: volunteerId,
      phone,
      schedule
    });

    await pickupPoint.save();

    res.status(201).json({
      success: true,
      message: 'Point de retrait créé',
      pickupPoint
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
