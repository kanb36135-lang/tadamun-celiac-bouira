const express = require('express');
const router = express.Router();
const Counter = require('../models/Counter');

// @route   GET /api/counter
// @desc    Get current counter status
// @access  Public
router.get('/', async (req, res) => {
  try {
    let counter = await Counter.findOne({ status: 'open' });

    if (!counter) {
      counter = await Counter.create({});
    }

    res.json({
      success: true,
      counter: {
        productName: counter.productName,
        targetQuantity: counter.targetQuantity,
        currentQuantity: counter.currentQuantity,
        remaining: counter.targetQuantity - counter.currentQuantity,
        unitPrice: counter.unitPrice,
        progress: counter.progress,
        status: counter.status,
        deadline: counter.deadline
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// @route   POST /api/counter
// @desc    Create a new counter (admin)
// @access  Private/Admin
router.post('/', async (req, res) => {
  try {
    const { productName, targetQuantity, unitPrice, deadline } = req.body;

    // Close any existing open counter
    await Counter.updateMany({ status: 'open' }, { status: 'closed' });

    const counter = new Counter({
      productName,
      targetQuantity,
      unitPrice,
      deadline: deadline ? new Date(deadline) : undefined
    });

    await counter.save();

    res.status(201).json({
      success: true,
      message: 'Nouveau compteur créé',
      counter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
