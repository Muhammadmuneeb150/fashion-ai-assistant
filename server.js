// server.js
//
// This is the entry point. Instagram sends every incoming DM to your
// webhook URL as an HTTP POST. We verify it, extract the message,
// detect intent, pick a reply, and send it back.
//
// Setup checklist (do this on Meta for Developers dashboard):
// 1. Create a Meta App -> add "Instagram" + "Messenger" products
// 2. Connect your Instagram Business account to a Facebook Page
// 3. Set Webhook URL to: https://yourdomain.com/webhook
// 4. Set Verify Token to match WEBHOOK_VERIFY_TOKEN below
// 5. Subscribe to "messages" webhook field

require("dotenv").config();
const express = require("express");
const { detectIntent } = require("./services/intentDetector");
const { sendInstagramMessage } = require("./services/instagramService");
const RESPONSES = require("./data/responses");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// --- Step 1: Webhook verification (Meta calls this once, via GET, when you set up the webhook) ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// --- Step 2: Receiving actual messages (Meta calls this via POST for every DM) ---
app.post("/webhook", async (req, res) => {
  const body = req.body;

  // Respond 200 immediately — Meta expects a fast ack, or it will retry/flag your webhook
  res.status(200).send("EVENT_RECEIVED");

  if (body.object !== "instagram") return;

  for (const entry of body.entry) {
    const messagingEvents = entry.messaging || [];
    for (const event of messagingEvents) {
      const senderId = event.sender?.id;
      const messageText = event.message?.text;

      if (!senderId || !messageText) continue; // skip non-text events (likes, attachments, etc.)

      console.log(`📩 From ${senderId}: ${messageText}`);

      try {
        const { intent, method } = await detectIntent(messageText);
        console.log(`🧠 Detected intent: ${intent} (via ${method})`);

        const reply = RESPONSES[intent] || RESPONSES.fallback;
        await sendInstagramMessage(senderId, reply);
      } catch (err) {
        console.error("Error handling message:", err);
        await sendInstagramMessage(senderId, RESPONSES.fallback);
      }
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
