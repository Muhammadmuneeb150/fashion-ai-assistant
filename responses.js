// data/responses.js
// Central place for all reply templates.
// Why separate file? Non-technical team members (or you, later) can edit
// wording here without touching bot logic. Also makes "Train AI Responses"
// (the admin dashboard feature from your spec) trivial later — this becomes
// a DB table instead of a JS file.

const RESPONSES = {
  greeting: `Welcome to FashionHub ❤️
Thank you for contacting us.
How may I help you today?

1. New Arrivals
2. Women's Collection
3. Men's Collection
4. Order Tracking
5. Delivery Information`,

  price_inquiry: `Sure! Could you tell me which product you're interested in so I can share the exact price? 😊
Or you can reply "New Arrivals" to see our latest price list.`,

  availability_inquiry: `Could you tell me the product name or send a screenshot? I'll confirm stock availability right away.`,

  size_inquiry: `We currently offer sizes: S, M, L, XL.
Which product are you asking about? I can confirm the exact size chart for it.`,

  color_inquiry: `We have multiple colors available depending on the product.
Which item are you interested in? I'll show you the available colors.`,

  delivery_charges: `Delivery charges:
📍 Within city: Rs 150
📍 Other cities: Rs 250
Free delivery on orders above Rs 5000!`,

  delivery_time: `Delivery usually takes:
🚚 Major cities: 2-3 working days
🚚 Other areas: 4-5 working days`,

  exchange_inquiry: `Yes! We offer exchange within 3 days of delivery, as long as the item is unused and has tags attached.
Would you like to start an exchange request?`,

  order_placement: `Great! Let's get your order started 🛍️
Please share:
1. Product name/code
2. Size
3. Color
4. Your full delivery address
5. Contact number`,

  fallback: `Thanks for reaching out! I want to make sure I understand you correctly — could you rephrase that, or choose one of these:
1. Product Info
2. Price
3. Delivery
4. Place an Order`,
};

module.exports = RESPONSES;
