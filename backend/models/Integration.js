const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['facebook', 'instagram'], required: true, unique: true },
    connected: { type: Boolean, default: false },
    pageId: { type: String, default: '' }, // Facebook Page ID
    pageName: { type: String, default: '' },
    instagramBusinessId: { type: String, default: '' },
    accessToken: { type: String, default: '' }, // long-lived page access token
    connectedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Integration', integrationSchema);
