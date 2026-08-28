require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

// Dummy placeholder images (placehold.co renders these directly in the browser,
// no API key needed). Swap the `images` array for real product photo URLs later.
const placeholder = (label, bg, fg) => [`https://placehold.co/500x650/${bg}/${fg}?text=${encodeURIComponent(label)}`];

const products = [
  { name: 'Black Embroidered Maxi', category: 'dress', gender: 'women', price: 4999, discount: 0, sizes: ['S', 'M', 'L'], colors: ['black'], stock: 12, tags: ['trending', 'formal'], rating: 4.6, images: placeholder('Black Maxi', '1a1a1a', 'B8862B') },
  { name: 'Black Chiffon Dress', category: 'dress', gender: 'women', price: 5499, discount: 10, sizes: ['S', 'M', 'L', 'XL'], colors: ['black'], stock: 8, tags: ['best-selling'], rating: 4.4, images: placeholder('Chiffon Dress', '1a1a1a', 'B8862B') },
  { name: 'Beige Formal Kurta', category: 'kurta', gender: 'women', price: 3499, discount: 0, sizes: ['M', 'L'], colors: ['beige'], stock: 15, tags: ['new-arrival'], rating: 4.2, images: placeholder('Beige Kurta', 'e8ddc7', '5c4b32') },
  { name: 'Red Party Maxi', category: 'dress', gender: 'women', price: 6499, discount: 15, sizes: ['S', 'M', 'L'], colors: ['red'], stock: 5, tags: ['trending'], rating: 4.7, images: placeholder('Red Maxi', '7a1f1f', 'f5e6e6') },
  { name: "Men's Black Casual Shirt", category: 'shirt', gender: 'men', price: 2499, discount: 0, sizes: ['M', 'L', 'XL'], colors: ['black', 'white'], stock: 20, tags: ['best-selling', 'casual'], rating: 4.3, images: placeholder('Casual Shirt', '222222', 'ffffff') },
  { name: "Men's Slim Fit Jeans", category: 'jeans', gender: 'men', price: 3299, discount: 0, sizes: ['30', '32', '34', '36'], colors: ['blue', 'black'], stock: 18, tags: ['casual'], rating: 4.1, images: placeholder('Slim Jeans', '2b3a55', 'dbe4f0') },
  { name: 'Leather Belt', category: 'accessory', gender: 'men', price: 1499, discount: 0, sizes: ['Free'], colors: ['black', 'brown'], stock: 25, tags: ['best-selling'], rating: 4.0, images: placeholder('Leather Belt', '3b2a1a', 'd8b98a') },
  { name: 'Sneakers Classic White', category: 'shoes', gender: 'unisex', price: 2999, discount: 0, sizes: ['38', '40', '42', '44'], colors: ['white'], stock: 10, tags: ['best-selling', 'trending'], rating: 4.5, images: placeholder('Sneakers', 'f2f2f2', '333333') },
  { name: "Women's Handbag Tote", category: 'handbag', gender: 'women', price: 2799, discount: 5, sizes: ['Free'], colors: ['beige', 'black'], stock: 9, tags: ['new-arrival'], rating: 4.2, images: placeholder('Tote Bag', 'ded2b8', '4a3c26') },
  { name: 'Summer Cotton Kurta', category: 'kurta', gender: 'women', price: 1999, discount: 0, sizes: ['S', 'M', 'L'], colors: ['white', 'pink'], stock: 22, tags: ['casual'], rating: 4.0, images: placeholder('Cotton Kurta', 'f6e4e8', '8a4a5a') },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fashion_ai_assistant');
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products`);
  process.exit(0);
}

seed();
