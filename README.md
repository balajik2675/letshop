# LetShop — Everyday Shopping, Made Simple.

LetShop is a full-stack e-commerce application for browsing everyday products, managing a shopping bag, completing demo checkout, tracking orders, and operating a protected admin dashboard.

It is designed as a clear, portfolio-ready project that demonstrates React frontend development, REST APIs, MongoDB persistence, authentication, authorization, inventory handling, and responsive UI design.

## Features

### Customer experience

- LetShop storefront with Ivory & Deep Teal visual theme
- Responsive homepage with featured categories and benefits
- Product catalog loaded from MongoDB through the backend API
- Product search, category filtering, sorting, and pagination-ready API support
- Product detail pages with stock availability and quantity controls
- Guest shopping bag persisted in browser local storage
- Customer registration, login, logout, and protected routes
- HTTP-only cookie authentication using JWT
- Server-side password hashing with bcrypt
- Checkout with shipping address validation
- Cash on Delivery
- UPI demo payment
- Card demo payment
- Server-side price calculation and inventory validation
- Atomic stock reservation with rollback when order creation fails
- Customer order history and order detail pages
- Order status tracking
- Order cancellation for eligible pending/confirmed orders

### Administrator experience

- Separate administrator login at `/admin/login`
- Backend-enforced admin role authorization
- Dashboard statistics based on database records
- Product catalog and inventory visibility
- Recent order management
- Valid order status transitions:
  - Pending
  - Confirmed
  - Processing
  - Shipped
  - Delivered
  - Cancelled
- Protected admin API endpoints for product management, orders, inventory, and statistics

## Technology stack

- **Frontend:** React, Vite, React Router, JavaScript, JSX
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT, HTTP-only cookies, bcrypt
- **Security middleware:** Helmet, CORS, rate limiting
- **Testing:** Vitest and Supertest
- **Images:** External Unsplash image URLs for demo product imagery

## Project structure

```text
letShop/
├── client/
│   ├── src/
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── app.js
│   │   ├── app.test.js
│   │   ├── models.js
│   │   ├── seed.js
│   │   └── server.js
│   └── package.json
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Prerequisites

- Node.js 20 or newer
- npm
- MongoDB local installation or MongoDB Atlas account
- A MongoDB database user with read/write access

## Installation

From the project root:

```powershell
npm.cmd install
npm.cmd --prefix server install
npm.cmd --prefix client install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Update `.env` with your own values:

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@your-cluster.mongodb.net/letshop?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-secure-admin-password
PORT=5000
```

Never commit `.env` or real credentials to GitHub. The `.gitignore` file excludes local environment files.

If a MongoDB password contains special characters, URL-encode them before placing the password in `MONGO_URI`. For example, `@` becomes `%40`.

For MongoDB Atlas:

1. Create a database user under **Database Access**.
2. Grant the user read/write permissions.
3. Add your development IP address under **Network Access**.
4. Copy the Atlas connection string into `MONGO_URI`.

## Seed products and the first admin

The seed command:

- Creates the configured admin only if that email does not already exist.
- Adds missing sample products without overwriting existing products.
- Is safe to run again after updating database credentials.

Run:

```powershell
npm.cmd run seed
```

The sample catalog contains 12 products across Apparel, Home, Kitchen, Accessories, Wellness, and Stationery.

For a local demo, set your own temporary values for `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`. Do not publish those values in the repository or README.

## Run the application

Start the backend and frontend together:

```powershell
npm.cmd run dev
```

Open the storefront:

```text
http://localhost:5173/
```

Open the product catalog:

```text
http://localhost:5173/shop
```

Open the administrator login:

```text
http://localhost:5173/admin/login
```

The backend runs at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

Expected response:

```json
{
  "ok": true,
  "service": "aurel-api"
}
```

The health response retains the existing internal service identifier for compatibility.

## Access from a mobile device on the same Wi-Fi

Find the computer's LAN IP address, then start Vite on all network interfaces:

```powershell
npm.cmd --prefix client run dev -- --host 0.0.0.0
```

Open the following address on a phone connected to the same Wi-Fi:

```text
http://YOUR-COMPUTER-IP:5173/
```

The backend CORS configuration includes the local development origins and the configured `CLIENT_ORIGIN`. For a different LAN IP, update `CLIENT_ORIGIN` and the allowed origin list in `server/src/app.js` as needed.

## Available commands

From the project root:

```powershell
# Start frontend and backend
npm.cmd run dev

# Build the frontend
npm.cmd run build

# Run backend and frontend tests
npm.cmd test

# Seed the database
npm.cmd run seed
```

Individual application commands:

```powershell
npm.cmd --prefix server run dev
npm.cmd --prefix server test
npm.cmd --prefix client run dev
npm.cmd --prefix client run build
```

## API summary

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Products and categories

```text
GET    /api/products
GET    /api/products/:id
GET    /api/categories
POST   /api/products              Admin
PUT    /api/products/:id          Admin
DELETE /api/products/:id          Admin
```

Product listing supports search, category, price, sorting, and pagination query parameters.

### Orders

```text
POST  /api/orders
GET   /api/orders/my-orders
GET   /api/orders/:id
PATCH /api/orders/:id/cancel
```

### Admin

```text
GET   /api/admin/stats
GET   /api/admin/orders
PATCH /api/admin/orders/:id/status
GET   /api/admin/products
```

All admin endpoints require an authenticated user with the `admin` role. Customer ownership checks prevent users from viewing other customers' orders.

## Data models

### User

- Name
- Normalized unique email
- Bcrypt password hash
- Role: `user` or `admin`
- Timestamps

### Product

- Name and slug
- Description
- Price
- Category
- Image URL
- Stock quantity
- Active status
- Timestamps and indexes

### Order

- Unique order number
- Customer reference
- Immutable product snapshots
- Shipping address snapshot
- Server-calculated subtotal, shipping charge, and total
- Payment method and payment status
- Independent order status
- Timestamps

## Testing

Run:

```powershell
npm.cmd test
```

Current automated checks include:

- API health endpoint
- Unauthorized admin access rejection
- Backend syntax validation
- Frontend production build

MongoDB-dependent integration workflows require a working MongoDB connection. The test suite must not be used against production data.

## Demo payment limitations

UPI and card options are simulations only:

- No real payment gateway is connected.
- No card numbers, CVVs, or banking credentials are collected.
- Simulated prepaid orders use a separate `simulated_paid` payment status.
- COD orders remain `unpaid` until an appropriate operational workflow confirms collection.

## Security notes

- Passwords are never stored in plaintext.
- JWTs are stored in HTTP-only cookies rather than local storage.
- Admin authorization is enforced on the backend, not only hidden in the UI.
- Product prices and totals are recalculated on the server.
- Stock updates use conditional atomic updates to reduce overselling.
- Secrets and environment files are excluded from Git.
- Production deployments should use HTTPS, a strong managed JWT secret, a MongoDB replica set, stricter CSRF protection, production CORS configuration, and monitoring.

## Screenshots

Add screenshots of the storefront, catalog, checkout, order history, and admin dashboard here before publishing the project to GitHub.

## Known limitations and future improvements

- Add a full admin product create/edit form to the dashboard UI.
- Add dedicated frontend component and workflow tests.
- Add image upload storage instead of external demo image URLs.
- Add production-grade CSRF protection and refresh-token rotation.
- Add transactional order creation when deployed on a MongoDB replica set.
- Add deployment configuration and CI checks.
