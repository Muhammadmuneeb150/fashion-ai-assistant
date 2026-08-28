/**
 * Instagram + Facebook Messenger webhook.
 *
 * One URL handles both platforms — Meta tells you which one via
 * `req.body.object` ("page" = Messenger, "instagram" = Instagram DMs).
 *
 * Setup (after you've already connected via /api/meta/connect — see README):
 *   1. In your Meta App → Webhooks product → Callback URL: your deployed
 *      backend + "/api/webhooks/meta" (e.g. https://your-api.com/api/webhooks/meta).
 *      Verify Token: whatever you set as META_WEBHOOK_VERIFY_TOKEN in .env.
 *   2. Subscribe to the "messages" field for both the Page and the
 *      Instagram object.
 *   3. Meta will call the GET route below once to verify the URL, then POST
 *      here every time a customer sends a DM.
 *
 * Locally, Meta can't reach http://localhost — use a tunnel (ngrok/cloudflared)
 * and put the tunnel's https URL as the Callback URL while testing.
 */
const express = require('express');
const router = express.Router();
const Integration = require('../models/Integration');
const { processIncomingMessage } = require('../services/conversationService');

const GRAPH = 'https://graph.facebook.com/v19.0';
const SITE_URL = process.env.SITE_URL || 'http://localhost:5500'; // your storefront URL

// GET /api/webhooks/meta — Meta's one-time webhook verification handshake
router.get('/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST /api/webhooks/meta — actual incoming messages land here
router.post('/meta', async (req, res) => {
  // Meta requires a fast 200 response — acknowledge immediately, process after.
  res.sendStatus(200);

  const body = req.body;
  if (!['page', 'instagram'].includes(body.object)) return;
  const platform = body.object === 'instagram' ? 'instagram' : 'facebook';

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      const senderId = event.sender?.id;
      const text = event.message?.text;
      if (!senderId || !text || event.message?.is_echo) continue; // skip echoes of our own replies

      try {
        const customerRef = platform === 'instagram' ? { instagramId: senderId } : { phone: `fb:${senderId}` };
        const result = await processIncomingMessage({ message: text, channel: platform, customerRef });

        const replyWithLink = `${result.reply}\n\n🛍️ Shop & complete your order here: ${SITE_URL}`;
        await sendReply(platform, senderId, replyWithLink);
      } catch (err) {
        console.error('Webhook message handling failed:', err);
      }
    }
  }
});

async function sendReply(platform, recipientId, text) {
  const integration = await Integration.findOne({ platform });
  if (!integration?.connected || !integration.accessToken) {
    console.warn(`Cannot reply — ${platform} is not connected yet (admin Settings tab).`);
    return;
  }
  const endpointId = platform === 'instagram' ? integration.instagramBusinessId : integration.pageId;

  const resp = await fetch(`${GRAPH}/${endpointId}/messages?access_token=${integration.accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  if (!resp.ok) console.error('Meta send failed:', await resp.text());
}

module.exports = router;
