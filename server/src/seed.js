import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Product } from './models.js';

dotenv.config({ path: new URL('../../.env', import.meta.url) });
const products = [
  ['Linen Everyday Shirt', 'Soft breathable linen blend for easy, all-day layering.', 42, 'Apparel', 18, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800'],
  ['Cedarwood Candle', 'A warm, understated cedar and amber scent for quiet evenings.', 24, 'Home', 32, 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800'],
  ['Stoneware Mug', 'Hand-finished ceramic mug with a generous morning capacity.', 18, 'Kitchen', 25, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800'],
  ['Canvas Weekender', 'Durable cotton canvas bag for short trips and everyday carry.', 68, 'Accessories', 11, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'],
  ['Everyday Face Serum', 'Lightweight botanical hydration with a clean finish.', 36, 'Wellness', 20, 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800'],
  ['Wool Throw', 'A textured wool-blend throw that adds warmth without fuss.', 74, 'Home', 7, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800'],
  ['Leather Card Holder', 'A slim leather card holder for the essentials you carry daily.', 29, 'Accessories', 16, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800'],
  ['Daily Journal', 'A durable ruled journal for plans, notes, and good ideas.', 16, 'Stationery', 40, 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800'],
  ['Linen Cushion Cover', 'A soft neutral cushion cover that refreshes any room.', 22, 'Home', 24, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800'],
  ['Stainless Water Bottle', 'A reusable insulated bottle for commutes and weekend walks.', 32, 'Wellness', 30, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800'],
  ['Relaxed Cotton Trousers', 'Easy cotton trousers with a comfortable everyday fit.', 54, 'Apparel', 14, 'https://images.unsplash.com/photo-1506629905607-d9c297d7f3b2?w=800'],
  ['Oak Serving Board', 'A simple oak serving board for snacks and shared moments.', 38, 'Kitchen', 12, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800']
];
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aurel');
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const exists = await User.exists({ email: process.env.ADMIN_EMAIL.toLowerCase() });
  if (!exists) await User.create({ name: 'LetShop Admin', email: process.env.ADMIN_EMAIL.toLowerCase(), passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), role: 'admin' });
}
let added = 0;
for (const [name, description, price, category, stock, image] of products) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (!await Product.exists({ slug })) {
    await Product.create({ name, description, price, category, stock, image, active: true, slug });
    added += 1;
  }
}
console.log(`Seed complete: ${added} new products added`); await mongoose.disconnect();
