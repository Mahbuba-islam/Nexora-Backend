
<div align="center">

# 🛒 Nexora — Multi-Vendor E-Commerce Backend

A modern, scalable marketplace API built for sellers, customers, and admins.
Powered by Express 5, Prisma 7, Better Auth, Stripe, and an AI suite.

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat-square&logo=render&logoColor=white)

</div>

---

## ✨ Overview

Nexora Backend is a production-ready REST + realtime API for a multi-vendor marketplace.

It powers:
- 🛍️ Product marketplace
- 🏪 Seller storefront system
- 👤 Customer shopping experience
- 🛡️ Admin moderation system
- 🤖 AI-assisted shopping & recommendations
- 💳 Secure payment processing (Stripe)

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| 🧑 Customer | Browse products, cart, checkout, wishlist, reviews, AI chat |
| 🧑‍💼 Seller | Create store, manage products, fulfill orders, analytics |
| 🛡️ Admin | Approve sellers, manage catalog, moderate reviews, analytics |
| 👀 Guest | Browse catalog, temporary cart support |

---

## ⭐ Core Features

- 🧠 AI-powered shopping assistant (recommendations + search)  
- 🏪 Seller store creation system (multi-vendor architecture)  
- 🤖 AI store builder for sellers  
- 📦 Smart product recommendation engine  
- 🔔 Real-time notification system  
- 💬 Realtime chat support system  
- 💳 Stripe payment integration (checkout + webhook)  
- ⭐ Review & moderation system  
- 🔐 Secure authentication (Better Auth + JWT)  
- 🧑 Role-based dashboards (Customer / Seller / Admin)  

---

## 🧠 AI System

Nexora includes a modular AI layer:

- Product recommendation engine  
- Smart product search  
- Seller store creation assistance  
- AI chat assistant for users  
- RAG-ready architecture for future scaling  

---

## ⚙️ Tech Stack

### Backend Core
- Node.js (v20+)
- Express 5
- TypeScript

### Database
- PostgreSQL
- Prisma ORM (multi-schema design)

### Auth & Security
- Better Auth
- JWT (Access + Refresh)
- Role-based access control

### Realtime & Services
- Webhooks (Stripe)
- Ably (notifications)
- Nodemailer (email)
- Cloudinary (media)

### AI Layer
- OpenAI / Gemini support
- Pluggable AI provider system

---

## 📁 Project Structure

```text
src/
├── app.ts              # Express app setup
├── server.ts           # Server bootstrap
├── index.ts            # API router entry
├── config/             # Env & config
├── lib/                # Prisma, Auth, integrations
├── middleware/         # Auth, validation, rate limit
├── modules/            # Feature-based modules
│   ├── auth/
│   ├── products/
│   ├── orders/
│   ├── cart/
│   ├── sellers/
│   ├── payments/
│   ├── reviews/
│   ├── ai/
│   ├── notifications/
│   └── admin/
├── shared/             # Helpers
├── utils/              # JWT, email, seed helpers
├── errorHelpers/       # Error handling
prisma/
├── schema/             # Multi-file Prisma schema
├── migrations/
├── seed.ts
docs/
├── FRONTEND_API_OVERVIEW.md
├── AI_API_CONTRACTS.md
deploy/
├── nginx/
├── ubuntu-setup/
````

---

## 🚀 Quick Start

### 1. Clone project

```bash
git clone <repo-url>
cd Nexora-Backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment

```bash
cp .env.example .env
```

### 4. Generate DB

```bash
npx prisma generate
npx prisma migrate deploy
```

### 5. Run server

```bash
npm run dev
```

---

## 🔐 Demo Accounts

| Role     | Email                                                       | Password  |
| -------- | ----------------------------------------------------------- | --------- |
| Customer | [demo.customer@nexora.dev](mailto:demo.customer@nexora.dev) | Demo@1234 |
| Seller   | [demo.seller@nexora.dev](mailto:demo.seller@nexora.dev)     | Demo@1234 |
| Admin    | [demo.admin@nexora.dev](mailto:demo.admin@nexora.dev)       | Demo@1234 |

---

## 🛒 System Highlights

### 🏪 Multi-Vendor Architecture

* Each seller has isolated store
* Independent product & order system
* Admin-controlled approval flow

### 🛍️ Smart Cart System

* Guest cart (cookie-based)
* User cart (DB-based)
* Secure merge on login

### 💳 Payment Flow

* Stripe Checkout
* Webhook-based confirmation
* Order state synchronization

### 🔔 Notifications

* Real-time event system
* Order, message, payment alerts

---

## ⚙️ Environment Variables

Required:

```env
PORT=
DATABASE_URL=

BETTER_AUTH_URL=
BETTER_AUTH_SECRET=

ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=

FRONTEND_URL=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Optional:

```env
OPENAI_API_KEY=
GEMINI_API_KEY=
AI_PROVIDER=
```

---

## 📡 API Overview

Base URL:

```
/api/v1
```

### Main Modules

* `/auth`
* `/users`
* `/products`
* `/sellers`
* `/orders`
* `/cart`
* `/wishlist`
* `/payments`
* `/reviews`
* `/notifications`
* `/ai`
* `/admin`

Response format:

```ts
{
  success: boolean,
  message: string,
  data: any,
  meta?: any
}
```

---

## ☁️ Deployment

### Render (Recommended)

* Use `render.yaml`
* Auto build with Prisma migrate
* Stripe webhook ready

### Other Options

* Docker
* PM2 (Ubuntu VPS)

---

## 🧪 Testing Stripe

```bash
npm run stripe:webhook
```

---

## 🧠 Roadmap

* AI seller analytics
* Advanced recommendation engine
* Multi-currency support
* Mobile app (React Native)
* Affiliate system
* Real-time tracking system

---

## 🤝 Contributing

1. Fork repo
2. Create feature branch
3. Commit changes
4. Open PR

---

## 📄 License

ISC License

---

## 👨‍💻 Author

**Mahbuba Akter**
Full-Stack Web Developer

```



একদম startup pitch level করে দিতে পারি 🔥
```
