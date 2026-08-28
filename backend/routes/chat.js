const express = require('express');
const router = express.Router();
const { processIncomingMessage } = require('../services/conversationService');
const { getUpsellProducts } = require('../services/aiAgent');

/**
 * POST /api/chat
 * body: { message, channel, customerRef: { phone? instagramId? whatsappId? name? } }
 *
 * Channel-agnostic: the website widget calls this directly. The Instagram/
 * Messenger webhook (routes/webhooks.js) uses the same underlying service.
 */
router.post('/', async (req, res) => {
  try {
    const { message, channel = 'website', customerRef = {} } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const result = await processIncomingMessage({ message, channel, customerRef });

    res.json({
      reply: result.reply,
      intent: result.intent,
      sentiment: result.sentiment,
      products: result.products,
      conversationId: result.conversationId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong processing the message.' });
  }
});

// GET /api/chat/upsell/:category — used after an order is placed
router.get('/upsell/:category', async (req, res) => {
  const products = await getUpsellProducts(req.params.category);
  res.json({ products });
});

module.exports = router;
