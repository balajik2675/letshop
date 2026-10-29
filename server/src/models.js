import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true, maxlength: 2000 },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true, index: true },
  image: { type: String, default: '' },
  stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
  active: { type: Boolean, default: true, index: true }
}, { timestamps: true });
productSchema.index({ name: 'text', description: 'text', category: 'text' });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    product: mongoose.Schema.Types.ObjectId,
    name: String,
    image: String,
    unitPrice: Number,
    quantity: { type: Number, min: 1 }
  }],
  shippingAddress: {
    name: String, phone: String, line1: String, city: String, state: String, postalCode: String, country: String
  },
  subtotal: Number,
  shippingCharge: { type: Number, default: 0 },
  total: Number,
  paymentMethod: { type: String, enum: ['cod', 'upi_demo', 'card_demo'] },
  paymentStatus: { type: String, enum: ['unpaid', 'simulated_paid', 'failed'], default: 'unpaid' },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const Product = mongoose.model('Product', productSchema);
export const Order = mongoose.model('Order', orderSchema);
