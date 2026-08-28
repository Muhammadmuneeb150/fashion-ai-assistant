const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET /api/products?category=&gender=&maxPrice=&search=
router.get('/', async (req, res) => {
  const { category, gender, maxPrice, search } = req.query;
  const query = {};
  if (category) query.category = { $regex: category, $options: 'i' };
  if (gender) query.gender = gender;
  if (maxPrice) query.price = { $lte: Number(maxPrice) };
  if (search) query.name = { $regex: search, $options: 'i' };

  const products = await Product.find(query).sort({ createdAt: -1 });
  res.json(products);
});

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

// Admin-only in a real deployment — protect with auth middleware before going live
router.post('/', async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

router.put('/:id', async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(product);
});

router.delete('/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

module.exports = router;
