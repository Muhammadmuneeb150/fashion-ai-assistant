// services/instagramService.js
//
// Wraps calls to the Instagram Graph API (Messenger Platform, since
// Instagram DMs are sent through the same API as Facebook Messenger).
// Docs: https://developers.facebook.com/docs/messenger-platform/instagram

const axios = require("axios");

const PAGE_ACCESS_TOKEN = process.env.IG_PAGE_ACCESS_TOKEN;
const GRAPH_API_VERSION = "v19.0";

async function sendInstagramMessage(recipientId, messageText) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`;

  try {
    await axios.post(
      url,
      {
        recipient: { id: recipientId },
        message: { text: messageText },
      },
      {
        params: { access_token: PAGE_ACCESS_TOKEN },
      }
    );
    console.log(`✅ Sent reply to ${recipientId}`);
  } catch (err) {
    console.error("❌ Failed to send Instagram message:", err.response?.data || err.message);
    // In production: log to a monitoring tool (Sentry, etc.) and consider retry logic
  }
}

module.exports = { sendInstagramMessage };
