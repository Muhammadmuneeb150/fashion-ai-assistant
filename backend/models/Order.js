const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    size: String,
    color: String,
    quantity: { type: Number, default: 1 },
    price: Number,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'pending',
    },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    trackingNumber: { type: String, default: '' },
    deliveryAddress: { type: String, default: '' },
    channel: { type: String, enum: ['instagram', 'whatsapp', 'website'], default: 'website' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
