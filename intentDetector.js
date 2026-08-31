// services/intentDetector.js
//
// Two-tier intent detection:
// 1. Keyword matching (instant, $0 cost) — catches the 10 exact queries
//    from your spec plus common variations.
// 2. OpenAI fallback (small cost, ~1-2s latency) — catches everything else,
//    like "I need a black dress for Eid" or typos/slang.
//
// This mirrors how production chatbots (Intercom, ManyChat, etc.) actually
// work — you never want to pay for an LLM call on "hi".

const OpenAI = require("openai");

// Lazy-initialized so the module can load (and rule-based matching can run)
// even before OPENAI_API_KEY is set — useful for local testing/demos.
let openai = null;
function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// --- Tier 1: Rule-based matching ---
// Order matters here: rules are checked top to bottom and the FIRST match
// wins. So more specific intents (color, size, delivery specifics) are
// listed BEFORE generic/overlapping ones (availability, greeting).
//
// Each pattern is matched as a WHOLE WORD or PHRASE, not a raw substring —
// otherwise short greetings like "hi" match inside unrelated words
// (e.g. "hi" inside "th-IS", "hi" inside "wHIch"). This bit us in testing:
// "Is this available?" was wrongly caught as a greeting before this fix.
const KEYWORD_RULES = [
  // Specific, low-ambiguity intents first
  { intent: "color_inquiry", patterns: ["color", "colour", "shade"] },
  { intent: "size_inquiry", patterns: ["size", "medium", "small", "large", "xl", "measurement"] },
  { intent: "delivery_charges", patterns: ["delivery charge", "shipping cost", "delivery fee"] },
  { intent: "delivery_time", patterns: ["how long", "delivery time", "how many days", "when will i get"] },
  { intent: "exchange_inquiry", patterns: ["exchange", "return", "refund", "damaged"] },
  { intent: "order_placement", patterns: ["place an order", "place my order", "how can i order", "i want to order", "i want to buy"] },
  { intent: "price_inquiry", patterns: ["price", "cost", "how much", "rate"] },
  // Generic "available" only fires if none of the above (more specific) matched first
  { intent: "availability_inquiry", patterns: ["available", "in stock", "stock hai"] },
  // Greeting last, and matched as a whole word so it doesn't fire on
  // substrings like "th-is", "wh-ich", etc.
  { intent: "greeting", patterns: ["hi", "hello", "hey", "salam", "assalam"] },
];

// Turns a plain keyword/phrase into a safe regex:
// - single words get \b...\b BUT allow a trailing "s" or "es" (size -> sizes,
//   color -> colors) since English plurals are extremely common in queries
// - multi-word phrases are escaped and matched as a substring, since phrases
//   like "delivery charge" are already specific enough
function buildPattern(p) {
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (p.includes(" ")) {
    return new RegExp(escaped);
  }
  return new RegExp(`\\b${escaped}(e?s)?\\b`); // word + optional plural
}

function detectIntentByKeywords(message) {
  const text = message.toLowerCase().trim();
  for (const rule of KEYWORD_RULES) {
    const matched = rule.patterns.some((p) => buildPattern(p).test(text));
    if (matched) return rule.intent;
  }
  return null; // no match — escalate to AI
}

// --- Tier 2: AI fallback using OpenAI ---
// We ask the model to classify into ONE of our fixed intent labels.
// Using a constrained label set (not free text) makes the output reliable
// and easy to map to a response template.
const INTENT_LABELS = [
  "greeting",
  "price_inquiry",
  "availability_inquiry",
  "size_inquiry",
  "color_inquiry",
  "delivery_charges",
  "delivery_time",
  "exchange_inquiry",
  "order_placement",
  "complaint",
  "other",
];

async function detectIntentByAI(message) {
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini", // cheap + fast, good enough for classification
    messages: [
      {
        role: "system",
        content: `You are an intent classifier for a clothing brand's customer support chat.
Classify the customer's message into EXACTLY ONE of these labels:
${INTENT_LABELS.join(", ")}.
Reply with ONLY the label, nothing else.`,
      },
      { role: "user", content: message },
    ],
    temperature: 0, // deterministic — we want consistent classification, not creativity
    max_tokens: 10,
  });

  const label = response.choices[0].message.content.trim().toLowerCase();
  return INTENT_LABELS.includes(label) ? label : "other";
}

// --- Main export: tries keywords first, falls back to AI ---
async function detectIntent(message) {
  const ruleMatch = detectIntentByKeywords(message);
  if (ruleMatch) {
    return { intent: ruleMatch, method: "rule" };
  }
  const aiMatch = await detectIntentByAI(message);
  return { intent: aiMatch, method: "ai" };
}

module.exports = { detectIntent };
