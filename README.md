<div align="center">

# 🛒 Nexora — Multi-Vendor E-Commerce Backend

A modern marketplace API built for sellers, customers and admins.
Powered by Express 5, Prisma 7, Better Auth, Stripe and an AI suite.

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat-square&logo=render&logoColor=white)

</div>

---

## ✨ What it does

Nexora is a production-ready REST API for a multi-vendor marketplace.
Customers browse a catalog of products from multiple sellers, manage carts,
checkout via Stripe, leave reviews, and chat with an AI support assistant.
Sellers manage their own shop, products, sub-orders and payouts. Admins
moderate sellers, products and reviews and access marketplace analytics.

| Audience  | What they can do |
|-----------|------------------|
| Customer  | Browse, cart, checkout, orders, reviews, wishlist, addresses, AI chat |
| Seller    | Apply, list/edit products, fulfill sub-orders, view payouts, dashboard |
| Admin     | Approve/suspend sellers, CRUD catalog, moderate reviews, payouts, stats |
| Guest     | Browse catalog, build a guest cart (cookie-scoped), register/login |

---

## 🧱 Tech stack

- **Runtime**: Node 20, TypeScript 5
- **HTTP**: Express 5 with `cookie-parser`, `cors`, `express-rate-limit`
- **DB**: PostgreSQL via Prisma 7 (multi-file schema in `prisma/schema/`)
- **Auth**: [Better Auth](https://www.better-auth.com/) + custom JWT (access + refresh)
- **Payments**: Stripe Checkout + webhooks (raw body)
- **Realtime**: Ably (notifications)
- **Email**: Nodemailer (SMTP / Gmail)
- **Media**: Cloudinary (images)
- **AI**: Pluggable provider — Gemini (dev) / OpenAI (prod), with rate limiting,
  RAG, document analysis, recommendations, semantic search, persisted chat
- **Build**: `tsup` → bundles `src/server.ts` + `src/index.ts` to `api/`
- **Process**: `pm2` (VM) or Render (managed)

---

## 📁 Project layout

```
src/
  app.ts              Express app (CORS, Better Auth handler, routes)
  server.ts           HTTP bootstrap, graceful shutdown, seed runners
  index.ts            Root /api/v1 router
  config/             Env loader + module configs
  lib/                Prisma client, Better Auth instance, integrations
  middleware/         checkAuth, optionalAuth, validateRequest, rateLimiter
  modules/            Feature modules (router/controler/service/validation)
  shared/             sendResponse, catchAsync helpers
  utilis/             jwt, token, cookie, email, slug, seed
  errorHelpers/       AppError, globalErrorHandler
prisma/
  schema/             Multi-file Prisma schema (auth, product, order, …)
  migrations/         SQL migration history
  seed.ts             Marketplace data seed (5 sellers, brands, products)
docs/
  FRONTEND_API_OVERVIEW.md   Endpoint reference for the frontend team
  AI_API_CONTRACTS.md        AI request/response schemas
deploy/                       Nginx + Ubuntu setup scripts (self-hosted)
render.yaml                   Render Blueprint
Dockerfile                    Optional Docker build
ecosystem.config.cjs          PM2 config for VM deploys
```

Each module follows the same shape:

```
xxx.router.ts      Express routes + auth + validation
xxx.controler.ts   Reads req, calls service, sendResponse
xxx.service.ts     Business logic + Prisma
xxx.validation.ts  Zod schemas
```

---

## 🚀 Quick start (local)

Prereqs: **Node 20+**, **PostgreSQL 14+** (Neon, Supabase or local).

```bash
git clone <repo-url>
cd Nexora-Backend
cp .env.example .env        # fill in DB, Better Auth, Stripe, etc.
npm install
npx prisma generate
npx prisma migrate deploy   # applies prisma/migrations to your DB
npm run seed                # optional: marketplace demo data
npm run dev                 # http://localhost:5000
```

Verify:

```bash
curl http://localhost:5000/healthz          # { "status": "ok" }
curl http://localhost:5000/api/v1/products  # paginated list
```

---

## 🔐 Demo accounts

The server seeds three demo users on every boot (idempotent). They are perfect
for showcasing the frontend's role-based dashboards without a signup flow.

| Role     | Email                       | Password    |
|----------|-----------------------------|-------------|
| Customer | `demo.customer@nexora.dev`  | `Demo@1234` |
| Seller   | `demo.seller@nexora.dev`    | `Demo@1234` |
| Admin    | `demo.admin@nexora.dev`     | `Demo@1234` |

The seller comes pre-approved with shop slug `demo-shop`.

One-click login from the frontend:

```bash
POST /auth/demo-login    body: { "role": "customer" | "seller" | "admin" }
```

Returns the same payload as `/auth/login` and sets cookies.

---

## 🛒 Cart isolation (important)

The cart works for both guests and logged-in users:

- **Logged-in** → cart is scoped strictly by `userId`. The guest cookie is
  ignored for ownership and used only as a one-shot **merge source** when the
  user logs in. After merge, the guest cookie is cleared so it can never be
  reused to view another user's cart.
- **Guest** → server mints a per-browser `nexora-cart` HttpOnly cookie on first
  request and binds the cart to that token.

This prevents the "every user sees the same cart" bug that happens when a
public route trusts a shared cookie.

---

## ⚙️ Environment variables

See `.env.example` for the full list. Required for boot:

```
NODE_ENV, PORT, DATABASE_URL,
BETTER_AUTH_URL, BETTER_AUTH_SECRET,
ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY,
EMAIL_SENDER_SMTP_USER, EMAIL_SENDER_SMTP_PASSWORD, EMAIL_SENDER_SMTP_HOST,
EMAIL_SENDER_SMTP_PORT, EMAIL_SENDER_SMTP_FROM,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL,
FRONTEND_URL,
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
ADMIN_EMAIL, ADMIN_PASSWORD
```

Optional: `OPENAI_API_KEY`, `OPENAI_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`,
`AI_PROVIDER`, `ABLY_API_KEY`.

---

## 📚 API surface

Full route table: [`docs/FRONTEND_API_OVERVIEW.md`](docs/FRONTEND_API_OVERVIEW.md).

Top-level groups (mounted under `/api/v1`):

| Path           | Description |
|----------------|-------------|
| `/auth`        | Register/login/demo-login, OAuth, password, profile |
| `/users`, `/admin` | Admin user management |
| `/sellers`     | Seller application + storefront + admin moderation |
| `/categories`, `/brands`, `/products` | Catalog (public reads, admin/seller writes) |
| `/cart`, `/wishlist`, `/addresses` | Customer commerce data |
| `/coupons`     | Coupon CRUD + public validate |
| `/orders`, `/seller-orders`, `/payouts` | Order lifecycle, fulfilment, seller payouts |
| `/payments`    | Stripe PaymentIntent (webhook is at `/api/v1/webhook`) |
| `/reviews`     | Reviews + moderation |
| `/notifications` | User notifications |
| `/stats`       | Admin/staff dashboards |
| `/ai`          | Chat, recommendations, semantic search, RAG, document analysis |

Standard response shape:

```ts
{ success, message, data, meta? }
```

---

## 🔧 npm scripts

| Script | Purpose |
|--------|---------|
| `npm run dev`      | Watch mode via `tsx` |
| `npm run build`    | Bundle TS to `api/` via `tsup` |
| `npm start`        | Run compiled server (`node api/server.js`) |
| `npm run seed`     | Idempotent marketplace seed (5 sellers + catalog) |
| `npm run migrate`  | `prisma migrate dev` |
| `npm run generate` | `prisma generate` |
| `npm run studio`   | Open Prisma Studio |
| `npm run service:up` / `service:restart` / `service:logs` | PM2 helpers |
| `npm run stripe:webhook` | Forward Stripe events to local server |

---

## ☁️ Deployment

### Render (recommended)

`render.yaml` is a Render Blueprint:

1. Push the repo to GitHub.
2. In Render: **New → Blueprint → connect repo**.
3. Fill the secret env vars (everything marked `sync: false`).
4. First deploy runs:
   ```
   npm ci && npx prisma generate && npm run build && npx prisma migrate deploy
   ```
5. Render hits `/healthz` to verify the service is up.
6. Add the Stripe webhook endpoint:
   `https://<your-render-domain>/api/v1/webhook` (raw body — already
   configured in `app.ts`).

> **Free tier note**: Render free web services sleep after ~15 min idle and
> can take 30–60s to wake. Use an external pinger like
> [cron-job.org](https://cron-job.org) hitting `/healthz` every ~10 min
> (do **not** self-ping).

### Other targets

- **Docker**: `docker-compose.yml` builds from the included `Dockerfile`.
- **Bare VM (Ubuntu / Nginx)**: see `deploy/setup-ubuntu.sh` and
  `deploy/nginx.conf.example`. Run with PM2 via
  `npm run service:up`.

---

## 🧪 Testing the Stripe webhook

```bash
npm run stripe:webhook    # forwards Stripe CLI events
# in another terminal
npx tsx prisma/test-stripe-webhook.ts
```

The webhook route lives at `POST /api/v1/webhook` and uses
`express.raw({ type: "application/json" })` (mounted before `express.json()`
so Stripe signature verification works).

---

## 📝 License

ISC.
