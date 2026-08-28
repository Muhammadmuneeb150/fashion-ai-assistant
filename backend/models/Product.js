const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, index: true }, // e.g. "Women's Dress", "Men's Shirt"
    gender: { type: String, enum: ['men', 'women', 'unisex'], default: 'unisex' },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 }, // percentage
    description: { type: String, default: '' },
    sizes: [{ type: String }], // ["S","M","L","XL"]
    colors: [{ type: String }],
    stock: { type: Number, default: 0 },
    images: [{ type: String }],
    rating: { type: Number, default: 0 },
    tags: [{ type: String }], // ["trending","best-selling","new-arrival","formal","casual"]
  },
  { timestamps: true }
);

productSchema.methods.finalPrice = function () {
  return Math.round(this.price - (this.price * this.discount) / 100);
};

module.exports = mongoose.model('Product', productSchema);
