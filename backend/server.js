require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/meta', require('./routes/meta'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/instagram', require('./routes/instagram'));

app.get('/api/health', (req, res) => {
  const { DEMO_MODE } = require('./services/aiAgent');
  res.json({ status: 'ok', demoMode: DEMO_MODE });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fashion_ai_assistant';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
