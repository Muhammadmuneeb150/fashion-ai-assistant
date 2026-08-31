# FashionHub Instagram DM Bot

Handles the 10 required auto-reply queries from the CodeCelix spec using a
two-tier intent system: keyword rules (fast, free) + OpenAI fallback (for
anything not covered by rules).

## 1. Install

```bash
npm install
cp .env.example .env
# then fill in .env with real values
```

## 2. Test locally WITHOUT Instagram first (recommended)

Before touching the real Instagram API, verify your logic works:

```bash
npm run dev
```

Then in a separate terminal, simulate an incoming DM:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "instagram",
    "entry": [{
      "messaging": [{
        "sender": { "id": "test_user_123" },
        "message": { "text": "Price?" }
      }]
    }]
  }'
```

Check your terminal logs — you should see the intent detected and a (failed,
since there's no real access token yet) send attempt. That failure is fine
at this stage; it confirms your intent + routing logic works.

## 3. Expose your server publicly (Instagram needs a real HTTPS URL)

Use ngrok for development:

```bash
npx ngrok http 3000
```

Copy the `https://xxxx.ngrok-free.app` URL — this becomes your webhook URL
in the Meta dashboard, with `/webhook` appended.

## 4. Connect to real Instagram

1. Go to https://developers.facebook.com/apps → Create App → "Business" type
2. Add the "Instagram" and "Messenger" products
3. Under Instagram settings, generate a Page Access Token → put it in `.env`
4. Under Messenger → Webhooks, set:
   - Callback URL: `https://your-ngrok-url.ngrok-free.app/webhook`
   - Verify Token: same string as `WEBHOOK_VERIFY_TOKEN` in `.env`
5. Subscribe to the `messages` webhook field
6. Send a real DM to your connected Instagram account and watch your server logs

## How it decides what to reply

```
Incoming message
   │
   ▼
Keyword match? ──yes──▶ Use matched intent (instant, $0)
   │no
   ▼
OpenAI classification ──▶ Use returned intent
   │
   ▼
Look up response template in data/responses.js
   │
   ▼
Send via Instagram Graph API
```

## Next steps to complete the full spec

- **Product recommendation**: connect a MongoDB `products` collection and,
  for `product_search` intent, do a filtered query (category/color/budget)
  instead of a static template — then feed matches into a prompt so the AI
  writes a natural recommendation sentence.
- **WhatsApp**: same architecture, swap `instagramService.js` for a
  `whatsappService.js` using the WhatsApp Business Cloud API — the webhook
  payload shape is different, but intent detection and response logic reuse
  as-is.
- **Sentiment analysis**: add a second OpenAI call (or one combined prompt
  that returns both intent AND sentiment as JSON) to flag angry/frustrated
  customers for human handoff.
- **Admin dashboard**: move `responses.js` into MongoDB so "Train AI
  Responses" becomes an editable table, not a code deploy.
- **Conversation memory**: currently each message is handled independently.
  For multi-turn flows (e.g., order placement collecting address, size,
  color across several messages), store conversation state per `senderId`
  in MongoDB or Redis.

## A note on cost control

The keyword tier handles the 10 required queries from your spec entirely
free. Only genuinely ambiguous messages ("I need something red for a
wedding") hit the OpenAI API. This is the difference between a bot that
costs pennies per 1000 conversations vs. one that costs dollars — worth
highlighting in your submission as a deliberate architecture decision.
