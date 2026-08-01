const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const Patient = require('../models/Patient');

// @route   POST /api/orders
// @desc    Create a new order (group buy)
// @access  Private
router.post('/', [
  body('patientId').isMongoId().withMessage('ID patient invalide'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantité invalide'),
  body('paymentMethod').isIn(['Poste Mobile', 'Carte', 'Espèces']).withMessage('Méthode de paiement invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { patientId, quantity, paymentMethod, notes } = req.body;

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient non trouvé'
      });
    }

    // Get active counter
    let counter = await Counter.findOne({ status: 'open' });
    if (!counter) {
      counter = await Counter.create({});
    }

    // Check if counter is full
    if (counter.currentQuantity + quantity > counter.targetQuantity) {
      return res.status(400).json({
        success: false,
        message: `Quantité demandée dépasse la cible. Restant: ${counter.targetQuantity - counter.currentQuantity} sacs`
      });
    }

    // Create order
    const order = new Order({
      patient: patientId,
      quantity,
      unitPrice: counter.unitPrice,
      totalPrice: quantity * counter.unitPrice,
      paymentMethod,
      notes
    });

    await order.save();

    // Update counter
    counter.currentQuantity += quantity;
    if (counter.currentQuantity >= counter.targetQuantity) {
      counter.status = 'fulfilled';
    }
    await counter.save();

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      order: {
        id: order._id,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        paymentStatus: order.paymentStatus,
        progress: counter.progress
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la commande'
    });
  }
});

// @route   GET /api/orders
// @desc    Get all orders
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { patientId, status } = req.query;
    const query = {};

    if (patientId) query.patient = patientId;
    if (status) query.deliveryStatus = status;

    const orders = await Order.find(query)
      .populate('patient', 'fullName phone commune')
      .populate('pickupPoint', 'name commune')
      .populate('volunteer', 'fullName phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('patient', 'fullName phone commune')
      .populate('pickupPoint', 'name commune location')
      .populate('volunteer', 'fullName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/:id/status', async (req, res) => {
  try {
    const { deliveryStatus, paymentStatus } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    if (deliveryStatus) order.deliveryStatus = deliveryStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    res.json({
      success: true,
      message: 'Statut mis à jour',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
