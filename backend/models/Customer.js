const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    phone: { type: String, index: true },
    instagramId: { type: String, index: true },
    whatsappId: { type: String, index: true },
    address: { type: String, default: '' },
    preferences: {
      favoriteColor: String,
      favoriteCategory: String,
      budget: Number,
      gender: String,
    },
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
