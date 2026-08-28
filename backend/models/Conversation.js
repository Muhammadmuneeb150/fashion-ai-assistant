const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['customer', 'ai', 'admin'], required: true },
    text: { type: String, required: true },
    intent: { type: String, default: '' },
    sentiment: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    channel: { type: String, enum: ['instagram', 'whatsapp', 'website'], default: 'website' },
    messages: [messageSchema],
    lastIntent: { type: String, default: '' },
    lastSentiment: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
