const Customer = require('../models/Customer');
const Conversation = require('../models/Conversation');
const { handleMessage } = require('./aiAgent');

/**
 * Finds/creates the customer + conversation for this channel, runs the
 * message through the AI agent, logs both sides, and returns the result.
 * Shared by the website chat widget and the Instagram/Messenger webhooks so
 * there's exactly one place that talks to the AI agent and MongoDB.
 */
async function processIncomingMessage({ message, channel = 'website', customerRef = {} }) {
  const lookup = {};
  if (customerRef.phone) lookup.phone = customerRef.phone;
  if (customerRef.instagramId) lookup.instagramId = customerRef.instagramId;
  if (customerRef.whatsappId) lookup.whatsappId = customerRef.whatsappId;

  let customer = Object.keys(lookup).length ? await Customer.findOne(lookup) : null;
  if (!customer) {
    customer = await Customer.create({ ...lookup, name: customerRef.name || '' });
  }

  let conversation = await Conversation.findOne({ customer: customer._id, channel });
  if (!conversation) {
    conversation = await Conversation.create({ customer: customer._id, channel, messages: [] });
  }

  const result = await handleMessage(message, { conversationHistory: conversation.messages });

  conversation.messages.push({ sender: 'customer', text: message, intent: result.intent, sentiment: result.sentiment });
  conversation.messages.push({ sender: 'ai', text: result.reply, intent: result.intent, sentiment: result.sentiment });
  conversation.lastIntent = result.intent;
  conversation.lastSentiment = result.sentiment;
  await conversation.save();

  return { ...result, customer, conversationId: conversation._id };
}

module.exports = { processIncomingMessage };
