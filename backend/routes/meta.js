/**
 * Meta (Facebook + Instagram) connect flow.
 *
 * Instagram messaging is only available through a connected Facebook Page,
 * so both "Connect Instagram" and "Connect Facebook" go through the same
 * Facebook OAuth dialog — we just request Instagram scopes too and pull the
 * linked Instagram Business Account ID off the resulting Page.
 *
 * Requires a Meta App (developers.facebook.com) with the "Facebook Login for
 * Business" product added. Set these in .env before this works:
 *   META_APP_ID, META_APP_SECRET, META_REDIRECT_URI
 */
const express = require('express');
const router = express.Router();
const Integration = require('../models/Integration');

const GRAPH = 'https://graph.facebook.com/v19.0';

const SCOPES = [
  'pages_show_list',
  'pages_messaging',
  'pages_manage_metadata',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_manage_messages',
].join(',');

function requireMetaConfig(res) {
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET || !process.env.META_REDIRECT_URI) {
    res
      .status(500)
      .json({ error: 'Meta App not configured yet. Set META_APP_ID, META_APP_SECRET, META_REDIRECT_URI in .env — see README.' });
    return false;
  }
  return true;
}

// GET /api/meta/connect/facebook  and  /api/meta/connect/instagram
// Both kick off the same Facebook Login dialog; ?platform tells the callback
// which record to mark as connected.
router.get('/connect/:platform', (req, res) => {
  if (!requireMetaConfig(res)) return;
  const { platform } = req.params;
  if (!['facebook', 'instagram'].includes(platform)) return res.status(400).json({ error: 'Unknown platform' });

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: process.env.META_REDIRECT_URI,
    scope: SCOPES,
    state: platform,
    response_type: 'code',
  });

  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`);
});

// GET /api/meta/callback — Meta redirects here after the user approves
router.get('/callback', async (req, res) => {
  try {
    if (!requireMetaConfig(res)) return;
    const { code, state: platform, error: oauthError } = req.query;
    if (oauthError) return res.status(400).send(`Meta login was cancelled or failed: ${oauthError}`);
    if (!code) return res.status(400).send('Missing authorization code from Meta.');

    // 1. Exchange the code for a short-lived user access token
    const tokenParams = new URLSearchParams({
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: process.env.META_REDIRECT_URI,
      code,
    });
    const tokenRes = await fetch(`${GRAPH}/oauth/access_token?${tokenParams.toString()}`);
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(400).send('Could not get access token from Meta.');

    // 2. Exchange for a long-lived user access token (~60 days)
    const longLivedParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      fb_exchange_token: tokenData.access_token,
    });
    const longLivedRes = await fetch(`${GRAPH}/oauth/access_token?${longLivedParams.toString()}`);
    const longLivedData = await longLivedRes.json();
    const userToken = longLivedData.access_token || tokenData.access_token;

    // 3. Get the Pages this user manages, with per-page access tokens
    const pagesRes = await fetch(`${GRAPH}/me/accounts?access_token=${userToken}`);
    const pagesData = await pagesRes.json();
    const page = pagesData.data?.[0];
    if (!page) return res.status(400).send('No Facebook Page found on this account. Create/manage a Page first.');

    // 4. If connecting Instagram, look up the Instagram Business Account linked to the page
    let instagramBusinessId = '';
    if (platform === 'instagram') {
      const igRes = await fetch(`${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
      const igData = await igRes.json();
      instagramBusinessId = igData.instagram_business_account?.id || '';
      if (!instagramBusinessId) {
        return res.status(400).send('This Page has no linked Instagram Business account. Link one in Meta Business Suite first.');
      }
    }

    await Integration.findOneAndUpdate(
      { platform },
      {
        platform,
        connected: true,
        pageId: page.id,
        pageName: page.name,
        instagramBusinessId,
        accessToken: page.access_token,
        connectedAt: new Date(),
      },
      { upsert: true }
    );

    res.send(`<html><body style="font-family:sans-serif;padding:40px;">
      <h2>${platform === 'instagram' ? 'Instagram' : 'Facebook'} connected ✅</h2>
      <p>Page: ${page.name}</p>
      <p>You can close this tab and go back to the admin dashboard.</p>
    </body></html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong connecting to Meta.');
  }
});

// GET /api/meta/status — used by the admin dashboard to show connect/connected state
router.get('/status', async (req, res) => {
  const integrations = await Integration.find({});
  const status = { facebook: null, instagram: null };
  integrations.forEach((i) => {
    status[i.platform] = { connected: i.connected, pageName: i.pageName, connectedAt: i.connectedAt };
  });
  res.json(status);
});

// POST /api/meta/disconnect/:platform
router.post('/disconnect/:platform', async (req, res) => {
  await Integration.findOneAndUpdate({ platform: req.params.platform }, { connected: false, accessToken: '' });
  res.json({ ok: true });
});

module.exports = router;
