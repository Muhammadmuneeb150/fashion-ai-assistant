/**
 * AI Sales Agent
 * ----------------
 * Two-layer design:
 *   1. Fast rule/keyword layer for intent + entity extraction (works offline,
 *      zero cost, catches 80% of real customer messages instantly).
 *   2. OpenAI layer for anything the rules don't confidently catch, and for
 *      generating natural, on-brand replies.
 *
 * If OPENAI_API_KEY is not set, everything still works in "demo mode" using
 * only the rule layer + templated replies — useful for local demos/interviews
 * without burning API credits.
 */

const OpenAI = require('openai');
const Product = require('../models/Product');

const DEMO_MODE = !process.env.OPENAI_API_KEY;
const openai = DEMO_MODE ? null : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BRAND_NAME = process.env.BRAND_NAME || 'FashionHub';

// ---------- 1. Intent detection ----------

const INTENT_PATTERNS = [
  { intent: 'greeting', patterns: [/^(hi|hello|hey|salam|assalam)/i] },
  { intent: 'order_tracking', patterns: [/track|where.*(parcel|order)|order status|tracking id/i] },
  { intent: 'return_request', patterns: [/return|exchange|refund|damaged/i] },
  { intent: 'delivery_inquiry', patterns: [/deliver|shipping|how many days|same day/i] },
  { intent: 'discount_inquiry', patterns: [/discount|sale|cheapest|under rs|under \d+/i] },
  { intent: 'size_inquiry', patterns: [/size|xl\b|small|medium|large/i] },
  { intent: 'color_inquiry', patterns: [/color|colour/i] },
  { intent: 'order_placement', patterns: [/place.*order|i want to (buy|order)|checkout|confirm order/i] },
  { intent: 'complaint', patterns: [/worst|bad experience|not happy|complaint|disappointed/i] },
  {
    intent: 'product_search',
    patterns: [/price|available|dress|shirt|shoes|handbag|collection|outfit|trending|best selling/i],
  },
];

function detectIntent(message) {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(message))) return intent;
  }
  return 'general_query';
}

// ---------- 2. Sentiment analysis ----------

const POSITIVE_WORDS = /love|great|awesome|thank|happy|nice|perfect|amazing/i;
const NEGATIVE_WORDS = /angry|worst|bad|hate|disappointed|frustrat|late|damaged|refund|useless/i;

function detectSentiment(message) {
  if (NEGATIVE_WORDS.test(message)) {
    return /worst|hate|useless|angry/i.test(message) ? 'angry' : 'frustrated';
  }
  if (POSITIVE_WORDS.test(message)) return 'happy';
  if (/interested|show me|do you have|price\?/i.test(message)) return 'interested_buyer';
  return 'neutral';
}

// ---------- 3. Entity extraction (budget, color, category, size) ----------

const COLOR_WORDS = ['black', 'white', 'red', 'blue', 'beige', 'green', 'pink', 'maroon', 'grey', 'gray'];
const SIZE_WORDS = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large'];

function extractEntities(message) {
  const lower = message.toLowerCase();
  const entities = {};

  const budgetMatch = lower.match(/under\s*(?:rs\.?\s*)?(\d{3,6})/);
  if (budgetMatch) entities.budget = parseInt(budgetMatch[1], 10);

  const color = COLOR_WORDS.find((c) => lower.includes(c));
  if (color) entities.color = color;

  const size = SIZE_WORDS.find((s) => new RegExp(`\\b${s}\\b`).test(lower));
  if (size) entities.size = size.toUpperCase();

  if (/\bmen'?s?\b/.test(lower)) entities.gender = 'men';
  if (/\bwomen'?s?\b|\bladies\b/.test(lower)) entities.gender = 'women';

  const categoryWords = ['dress', 'shirt', 'jeans', 'shoes', 'handbag', 'kurta', 'maxi'];
  const category = categoryWords.find((c) => lower.includes(c));
  if (category) entities.category = category;

  return entities;
}

// ---------- 4. Product recommendation engine ----------

async function recommendProducts(entities = {}, limit = 3) {
  const query = {};
  if (entities.color) query.colors = { $regex: entities.color, $options: 'i' };
  if (entities.gender) query.gender = { $in: [entities.gender, 'unisex'] };
  if (entities.category) query.category = { $regex: entities.category, $options: 'i' };
  if (entities.budget) query.price = { $lte: entities.budget };
  if (entities.size) query.sizes = entities.size;

  let results = await Product.find(query).sort({ rating: -1 }).limit(limit).lean();

  // Fallback: widen the search if nothing matched (e.g. drop budget/size filters)
  if (results.length === 0 && Object.keys(query).length > 0) {
    const looseQuery = {};
    if (entities.category) looseQuery.category = { $regex: entities.category, $options: 'i' };
    if (entities.gender) looseQuery.gender = { $in: [entities.gender, 'unisex'] };
    results = await Product.find(looseQuery).sort({ rating: -1 }).limit(limit).lean();
  }

  // Last resort: trending products
  if (results.length === 0) {
    results = await Product.find({ tags: 'trending' }).limit(limit).lean();
  }

  return results;
}

async function getUpsellProducts(justOrderedCategory, limit = 3) {
  return Product.find({ category: { $ne: justOrderedCategory }, tags: 'best-selling' })
    .limit(limit)
    .lean();
}

// ---------- 5. Response generation ----------

function formatProductList(products) {
  return products
    .map((p) => `• ${p.name} — Rs ${p.finalPrice ? p.finalPrice() : p.price}${p.discount ? ' (on sale)' : ''}`)
    .join('\n');
}

function templatedReply(intent, entities, products, sentiment) {
  switch (intent) {
    case 'greeting':
      return (
        `Welcome to ${BRAND_NAME}! 🛍️\nHow can I help you today?\n` +
        `1. New Arrivals\n2. Women's Collection\n3. Men's Collection\n4. Order Tracking\n5. Delivery Information`
      );
    case 'product_search':
      if (products.length === 0) {
        return "I couldn't find an exact match, but tell me a category, color, or budget and I'll find something for you!";
      }
      return `Here's what I found for you:\n${formatProductList(products)}\n\nWould you like to see pictures or sizes available?`;
    case 'size_inquiry':
      return 'We stock S, M, L, XL, and XXL depending on the item. Tell me the product name and I\'ll confirm exact sizes in stock.';
    case 'color_inquiry':
      return products.length
        ? `Yes! Available in: ${[...new Set(products.flatMap((p) => p.colors))].join(', ')}.`
        : 'Let me know which product you mean and I\'ll list the available colors.';
    case 'discount_inquiry':
      return products.length
        ? `Here are current deals:\n${formatProductList(products)}`
        : 'We run seasonal sales — tell me a category or budget and I\'ll show discounted picks.';
    case 'delivery_inquiry':
      return 'Delivery takes 2-4 business days within Pakistan (same-day available in select cities). Delivery charge: Rs 200 (free above Rs 5,000).';
    case 'return_request':
      return 'You can exchange or return an item within 7 days of delivery if it\'s unused and tagged. Could you share your order ID so I can start the process?';
    case 'order_tracking':
      return 'Sure — please share your order ID or the phone number used while ordering and I\'ll pull up the status.';
    case 'order_placement':
      return 'Great choice! Please confirm: product, size, color, quantity, and your delivery address, and I\'ll place the order for you.';
    case 'complaint':
      return 'I\'m really sorry about that experience. I\'m escalating this to our support team right now — could you share your order ID so we can fix this urgently?';
    default:
      return `Thanks for reaching out to ${BRAND_NAME}! Could you tell me a bit more — are you looking for a product, checking an order, or something else?`;
  }
}

/**
 * Main entry point: takes a raw customer message, returns a structured
 * result the API layer can log + send back to Instagram/WhatsApp/website.
 */
async function handleMessage(message, { conversationHistory = [] } = {}) {
  const intent = detectIntent(message);
  const sentiment = detectSentiment(message);
  const entities = extractEntities(message);

  let products = [];
  if (['product_search', 'discount_inquiry', 'color_inquiry', 'size_inquiry'].includes(intent)) {
    products = await recommendProducts(entities);
  }

  let reply;
  if (DEMO_MODE) {
    reply = templatedReply(intent, entities, products, sentiment);
  } else {
    reply = await generateAIReply({ message, intent, sentiment, entities, products, conversationHistory });
  }

  return { intent, sentiment, entities, products, reply };
}

async function generateAIReply({ message, intent, sentiment, entities, products, conversationHistory }) {
  const productContext = products.length
    ? `Relevant products in stock:\n${products
        .map((p) => `- ${p.name} | Rs ${p.finalPrice ? p.finalPrice() : p.price} | colors: ${p.colors.join(', ')} | sizes: ${p.sizes.join(', ')}`)
        .join('\n')}`
    : 'No specific products matched — ask a clarifying question.';

  const systemPrompt = `You are a friendly, professional sales representative for ${BRAND_NAME}, a clothing brand.
Detected customer intent: ${intent}. Detected sentiment: ${sentiment}.
${productContext}
Rules:
- Keep replies short (2-4 lines), warm, and conversational, like a real sales rep on WhatsApp/Instagram.
- If sentiment is "angry" or "frustrated", acknowledge it first and offer to help immediately.
- Never invent prices, sizes, or colors that aren't in the product context above.
- If placing an order, ask for size, color, quantity, and delivery address.
- Support replying in Roman Urdu if the customer writes in Roman Urdu.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6).map((m) => ({
      role: m.sender === 'customer' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: message },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.6,
    max_tokens: 250,
  });

  return completion.choices[0].message.content.trim();
}

module.exports = {
  DEMO_MODE,
  detectIntent,
  detectSentiment,
  extractEntities,
  recommendProducts,
  getUpsellProducts,
  handleMessage,
};
