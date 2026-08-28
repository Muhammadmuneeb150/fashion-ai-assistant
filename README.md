# FashionHub — AI Fashion Sales Assistant

A working first build for the CodeCelix internship spec: an AI sales agent that
understands customer messages, recommends products, detects intent/sentiment,
and can plug into Instagram DMs, WhatsApp, and a storefront.

## What's actually working right now

- **Backend API** (Express + MongoDB): products, orders, and a `/api/chat`
  endpoint that any channel (website, Instagram, WhatsApp) can call.
- **AI Agent** (`backend/services/aiAgent.js`): rule-based intent detection,
  sentiment analysis, entity extraction (color/size/budget/category), and a
  MongoDB-backed product recommendation engine — plus an OpenAI layer for
  natural replies once you add an API key.
- **Demo mode**: with no `OPENAI_API_KEY` set, the agent still fully works
  using templated replies driven by the same intent/entity logic. This lets
  you demo the whole flow for free, then flip on real OpenAI replies later
  by just adding a key.
- **Demo storefront + admin, in one page** (`frontend/index.html`): a single
  static file (React + Tailwind via CDN, no build step) — product grid,
  order tracking, live chat widget, and an "Admin" toggle in the header that
  switches the same page into the admin dashboard (products, orders,
  integrations). No separate file to navigate to.

## Why this architecture

One AI agent module (`aiAgent.js`) is channel-agnostic — it takes a plain
text message and returns `{ intent, sentiment, entities, products, reply }`.
The website widget, and later the Instagram/WhatsApp webhooks, all just call
this same function with different transport code around it. That's the
"same AI brain works everywhere" design from your brief.

```
Instagram DM ─┐
WhatsApp ──────┼──▶  POST /api/chat  ──▶  aiAgent.handleMessage()  ──▶  reply
Website chat ─┘                                   │
                                                   ▼
                                    MongoDB (Products/Customers/Orders/Conversations)
```

## Run it locally

```bash
cd backend
cp .env.example .env        # fill in MONGO_URI at minimum
npm install
npm run seed                # loads 10 sample products
npm run dev                 # starts on http://localhost:5000
```

Then open `frontend/index.html` directly in your browser (or serve it with
`npx serve frontend`). It's a static file — no build step. It talks to
`http://localhost:5000/api` by default; change `window.API_BASE` at the top
of the `<script>` if you deploy the backend elsewhere. Click **Admin** in
the top-right of the header to switch the same page into the admin
dashboard — no separate file or URL needed.

Try typing into the chat widget: *"I need a black dress for Eid under 6000"*
— it will hit MongoDB, filter by color/category/budget, and reply with real
stock.

## Turning on real AI replies

Set `OPENAI_API_KEY` in `.env`. The agent will then use `gpt-4o-mini` to
generate the actual reply text (still grounded in real product data pulled
from MongoDB — the model is told exactly which products/prices/sizes exist
so it can't hallucinate stock).

## Product images

`seed.js` now assigns each product a placeholder image via
[placehold.co](https://placehold.co) — no API key, no download, just a URL
the browser renders directly. Swap `images: [...]` for real product photo
URLs (or an uploaded-file path) whenever you have actual photography.

## Connecting Instagram & Facebook (admin dashboard)

The admin view inside `frontend/index.html` (click **Admin** in the header)
has a **Settings** tab with "Connect" buttons for Facebook and Instagram. Clicking one opens Meta's login
dialog in a popup; once approved, it stores a long-lived Page access token in
MongoDB (`Integration` collection) that the webhook handlers below will use
to send replies.

**Before the buttons work, you need a Meta App:**

1. Go to [developers.facebook.com](https://developers.facebook.com) → My Apps
   → Create App → type "Business".
2. Add the **Facebook Login for Business** product.
3. Under that product's settings, add a Valid OAuth Redirect URI matching
   `META_REDIRECT_URI` exactly (e.g. `http://localhost:5000/api/meta/callback`
   locally, or your deployed backend URL in production).
4. Copy the **App ID** and **App Secret** from Settings → Basic into your
   `.env` as `META_APP_ID` and `META_APP_SECRET`.
5. Your Facebook Page needs an Instagram Business/Creator account linked to
   it (Meta Business Suite → Settings → Linked Accounts) before "Connect
   Instagram" will find an Instagram account to attach.
6. While the app is in Development mode, only Meta accounts added as
   Testers/Admins under Roles can complete the login — that's fine for
   building and demoing; switching to Live mode requires Meta's App Review
   for the messaging permissions.

Once connected, `Integration.findOne({ platform: 'instagram' })` (or
`'facebook'`) gives you the `accessToken` and `pageId`/`instagramBusinessId`
needed for the webhook handlers to actually send replies back — that's the
next piece to build (see below).

## Making the bot actually reply on Instagram & Messenger (built and working)

This is now implemented — not just planned. `routes/webhooks.js` receives real
DMs from both platforms on one endpoint, runs them through the same AI agent
as the website chat, and replies with your store link attached.

1. **Connect both platforms first** (Admin → Settings → Connect), as described
   above. The webhook can't send replies until a Page/Instagram access token
   exists in the database.

2. **Set a webhook verify token** — any random string you choose — in
   `.env` as `META_WEBHOOK_VERIFY_TOKEN`. Also set `SITE_URL` to your
   storefront's URL; that's the link the AI appends to every reply.

3. **Expose your local backend to the internet** so Meta can reach it.
   Locally, Meta cannot call `http://localhost:5000` directly — use a tunnel:
   ```bash
   npx ngrok http 5000
   ```
   This gives you an `https://xxxx.ngrok-free.app` URL. (For production,
   skip this — just use your deployed backend's real URL.)

4. **Register the webhook in your Meta App**: App dashboard → add the
   **Webhooks** product → Callback URL = `https://xxxx.ngrok-free.app/api/webhooks/meta`
   → Verify Token = the same string as `META_WEBHOOK_VERIFY_TOKEN` → Verify
   and Save. Then subscribe to the **messages** field for both the Page
   object and the Instagram object.

5. **Test it**: DM your connected Facebook Page or Instagram account from a
   different account. You should see the message logged in MongoDB
   (`Conversation` collection) and get an automatic reply with your intent/
   sentiment-aware AI response plus a link to `SITE_URL`.

One thing to know: while your Meta App is in **Development mode**, only
accounts added as Testers/Admins (App Roles → Roles) can message the bot and
get a reply — that's normal, it's how Meta lets you build safely before
going live. Submitting for **App Review** (to request the messaging
permissions for real customers) is the step after you're happy with how it
behaves in testing.

## Wiring up WhatsApp (next step)

## Deployment guide

- **Backend**: Railway or Render (both have a free/cheap tier, and support
  long-running Node processes needed for webhooks). Set your env vars there.
- **Database**: MongoDB Atlas free tier — swap `MONGO_URI` to the Atlas
  connection string.
- **Frontend**: Vercel or Netlify (drag-and-drop the `frontend` folder —
  it's fully static). Set `window.API_BASE` to your deployed backend URL.
- **n8n**: n8n.cloud, or self-host on the same Railway/Render project.

## What's stubbed vs. what to build next

Built: product/order data model, AI agent core (intent, sentiment, entities,
recommendations), chat API, demo storefront + admin in one page, Meta
connect flow, and a working Instagram/Messenger webhook that auto-replies
with a link to your store.

Still to build for full spec compliance: WhatsApp Business API integration
(same pattern as the Meta webhook, different API), voice message
transcription (Whisper API — same OpenAI key works), Urdu/Roman Urdu tuning
in the system prompt, and auth on the admin routes before this goes live.
