import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { User, Product, Order } from './models.js';

dotenv.config({ path: new URL('../../.env', import.meta.url) });
export const app = express();
app.use(helmet());
const allowedOrigins = new Set([
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.1.4:5173'
]);
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS'));
}, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 80 }));

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const tokenFor = (u) => jwt.sign({ sub: u._id.toString(), role: u.role }, process.env.JWT_SECRET || 'development-secret', { expiresIn: '2h' });
const setAuth = (res, u) => res.cookie('aurel_token', tokenFor(u), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 2 * 60 * 60 * 1000 });

const auth = asyncRoute(async (req, res, next) => {
  const raw = req.cookies.aurel_token;
  if (!raw) return res.status(401).json({ message: 'Authentication required' });
  try {
    const data = jwt.verify(raw, process.env.JWT_SECRET || 'development-secret');
    const user = await User.findById(data.sub);
    if (!user) return res.status(401).json({ message: 'Session is no longer valid' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ message: 'Authentication required' }); }
});
const admin = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Administrator access required' });
const clean = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const validId = (id) => mongoose.Types.ObjectId.isValid(id);
import mongoose from 'mongoose';

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'aurel-api' }));
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const name = clean(req.body.name, 80), email = clean(req.body.email, 160).toLowerCase(), password = req.body.password;
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8) return res.status(400).json({ message: 'Use a valid name, email, and password of at least 8 characters' });
  if (await User.exists({ email })) return res.status(409).json({ message: 'An account with that email already exists' });
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  setAuth(res, user); res.status(201).json({ user: publicUser(user) });
}));
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = clean(req.body.email, 160).toLowerCase(), password = req.body.password;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' });
  setAuth(res, user); res.json({ user: publicUser(user) });
}));
app.post('/api/auth/logout', (req, res) => res.clearCookie('aurel_token').json({ message: 'Logged out' }));
app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/categories', asyncRoute(async (req, res) => res.json({ categories: await Product.distinct('category', { active: true }) })));
app.get('/api/products', asyncRoute(async (req, res) => {
  const { search = '', category, sort = 'newest' } = req.query;
  const filter = { active: true };
  if (category) filter.category = clean(category, 80);
  if (search) filter.$text = { $search: clean(search, 80) };
  if (req.query.minPrice || req.query.maxPrice) filter.price = {};
  if (req.query.minPrice) filter.price.$gte = Math.max(0, Number(req.query.minPrice));
  if (req.query.maxPrice) filter.price.$lte = Math.max(0, Number(req.query.maxPrice));
  const sortMap = { price_asc: { price: 1 }, price_desc: { price: -1 }, name: { name: 1 }, newest: { createdAt: -1 } };
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(24, Math.max(1, Number(req.query.limit) || 8));
  const [products, total] = await Promise.all([Product.find(filter).sort(sortMap[sort] || sortMap.newest).skip((page - 1) * limit).limit(limit), Product.countDocuments(filter)]);
  res.json({ products, page, pages: Math.ceil(total / limit), total });
}));
app.get('/api/products/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid product id' });
  const product = await Product.findOne({ _id: req.params.id, active: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product });
}));

const productPayload = (body) => {
  const name = clean(body.name, 120), description = clean(body.description, 2000), category = clean(body.category, 80);
  const price = Number(body.price), stock = Number(body.stock);
  if (name.length < 2 || !description || !category || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) throw Object.assign(new Error('Invalid product fields'), { status: 400 });
  return { name, description, category, price, stock, image: clean(body.image, 500), active: body.active !== false };
};
app.post('/api/products', auth, admin, asyncRoute(async (req, res) => {
  const data = productPayload(req.body); const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID().slice(0, 8)}`;
  res.status(201).json({ product: await Product.create({ ...data, slug }) });
}));
app.put('/api/products/:id', auth, admin, asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid product id' });
  const product = await Product.findByIdAndUpdate(req.params.id, productPayload(req.body), { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product });
}));
app.delete('/api/products/:id', auth, admin, asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid product id' });
  const product = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Product archived' });
}));

const addressFields = ['name', 'phone', 'line1', 'city', 'state', 'postalCode', 'country'];
app.post('/api/orders', auth, asyncRoute(async (req, res) => {
  if (!Array.isArray(req.body.items) || !req.body.items.length || req.body.items.length > 50) return res.status(400).json({ message: 'At least one cart item is required' });
  const ids = req.body.items.map((item) => item.productId);
  if (new Set(ids).size !== ids.length || ids.some((id) => !validId(id))) return res.status(400).json({ message: 'Invalid cart items' });
  const products = await Product.find({ _id: { $in: ids }, active: true });
  const byId = new Map(products.map((p) => [p.id, p]));
  const quantities = req.body.items.map((item) => ({ product: byId.get(item.productId), quantity: Number(item.quantity) }));
  if (quantities.some(({ product, quantity }) => !product || !Number.isInteger(quantity) || quantity < 1)) return res.status(400).json({ message: 'Invalid product quantity or unavailable product' });
  const address = Object.fromEntries(addressFields.map((key) => [key, clean(req.body.shippingAddress?.[key], 120)]));
  if (Object.values(address).some((value) => !value)) return res.status(400).json({ message: 'Complete shipping details are required' });
  const paymentMethod = ['cod', 'upi_demo', 'card_demo'].includes(req.body.paymentMethod) ? req.body.paymentMethod : null;
  if (!paymentMethod) return res.status(400).json({ message: 'Choose a valid demo payment method' });
  const reserved = [];
  try {
    for (const { product, quantity } of quantities) {
      const updated = await Product.findOneAndUpdate({ _id: product._id, active: true, stock: { $gte: quantity } }, { $inc: { stock: -quantity } }, { new: true });
      if (!updated) throw Object.assign(new Error(`${product.name} is out of stock`), { status: 409 });
      reserved.push({ product, quantity });
    }
    const items = reserved.map(({ product, quantity }) => ({ product: product._id, name: product.name, image: product.image, unitPrice: product.price, quantity }));
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), shippingCharge = subtotal >= 75 ? 0 : 6;
    const order = await Order.create({ orderNumber: `AUR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`, user: req.user._id, items, shippingAddress: address, subtotal, shippingCharge, total: subtotal + shippingCharge, paymentMethod, paymentStatus: paymentMethod === 'cod' ? 'unpaid' : 'simulated_paid' });
    res.status(201).json({ order });
  } catch (error) {
    await Promise.all(reserved.map(({ product, quantity }) => Product.findByIdAndUpdate(product._id, { $inc: { stock: quantity } })));
    throw error;
  }
}));
app.get('/api/orders/my-orders', auth, asyncRoute(async (req, res) => res.json({ orders: await Order.find({ user: req.user._id }).sort({ createdAt: -1 }) })));
app.get('/api/orders/:id', auth, asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid order id' });
  const order = await Order.findOne({ _id: req.params.id, ...(req.user.role === 'admin' ? {} : { user: req.user._id }) });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ order });
}));
app.patch('/api/orders/:id/cancel', auth, asyncRoute(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!['Pending', 'Confirmed'].includes(order.status)) return res.status(409).json({ message: 'This order can no longer be cancelled' });
  order.status = 'Cancelled'; await order.save();
  await Promise.all(order.items.map((item) => Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })));
  res.json({ order });
}));

app.get('/api/admin/stats', auth, admin, asyncRoute(async (req, res) => {
  const [products, orders, awaiting, delivered, sales] = await Promise.all([
    Product.countDocuments({ active: true }),
    Order.countDocuments(),
    Order.countDocuments({ status: { $in: ['Pending', 'Confirmed', 'Processing'] } }),
    Order.countDocuments({ status: 'Delivered' }),
    Order.aggregate([
      { $match: { status: 'Delivered', paymentStatus: { $in: ['simulated_paid'] } } },
      { $group: { _id: null, value: { $sum: '$total' } } }
    ])
  ]);
  res.json({ stats: { products, orders, awaiting, delivered, sales: sales[0]?.value || 0 } });
}));
app.get('/api/admin/orders', auth, admin, asyncRoute(async (req, res) => res.json({ orders: await Order.find().populate('user', 'name email').sort({ createdAt: -1 }) })));
const transitions = { Pending: ['Confirmed', 'Cancelled'], Confirmed: ['Processing', 'Cancelled'], Processing: ['Shipped'], Shipped: ['Delivered'], Delivered: [], Cancelled: [] };
app.patch('/api/admin/orders/:id/status', auth, admin, asyncRoute(async (req, res) => {
  const order = await Order.findById(req.params.id); if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!transitions[order.status]?.includes(req.body.status)) return res.status(409).json({ message: `Cannot move ${order.status} to ${req.body.status}` });
  order.status = req.body.status; await order.save(); res.json({ order });
}));
app.get('/api/admin/products', auth, admin, asyncRoute(async (req, res) => res.json({ products: await Product.find().sort({ createdAt: -1 }) })));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((error, req, res, next) => { console.error(error); res.status(error.status || 500).json({ message: error.status ? error.message : 'Unexpected server error' }); });
