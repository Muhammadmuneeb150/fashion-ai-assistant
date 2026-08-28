const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Customer = require('../models/Customer');

// POST /api/orders — place a new order (from website checkout or AI-collected chat order)
router.post('/', async (req, res) => {
  const { customerId, items, deliveryAddress, channel } = req.body;
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const order = await Order.create({
    customer: customerId,
    items,
    totalAmount,
    deliveryAddress,
    channel: channel || 'website',
    trackingNumber: `FH-${Date.now().toString().slice(-8)}`,
  });

  await Customer.findByIdAndUpdate(customerId, { $push: { orderHistory: order._id } });
  res.status(201).json(order);
});

// GET /api/orders/track/:trackingNumber
router.get('/track/:trackingNumber', async (req, res) => {
  const order = await Order.findOne({ trackingNumber: req.params.trackingNumber });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// GET /api/orders — admin dashboard list
router.get('/', async (req, res) => {
  const orders = await Order.find().populate('customer').sort({ createdAt: -1 });
  res.json(orders);
});

router.put('/:id/status', async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json(order);
});

module.exports = router;
