# Nexora Backend — Frontend API Overview

> Companion reference for the Nexora frontend.
> All routes (except `/auth/*`, `/healthz`, `/uploads/*`, `/demo/*`,
> Stripe webhook) are mounted under the **`/api/v1`** prefix.
> Auth uses **JWT cookies** (`accessToken`, `refreshToken`) **plus**
> Better Auth session cookie. Always send `credentials: "include"` from
> the browser and set CORS origin to the frontend URL.

---

## 0. Base URLs

| Environment | URL |
|---|---|
| Local       | `http://localhost:5000` |
| Production  | from `BETTER_AUTH_URL` / `FRONTEND_URL` envs |

| Prefix         | Description |
|----------------|-------------|
| `/auth`        | Auth endpoints (the ones the frontend calls directly, NOT the Better Auth internal `/api/auth`). |
| `/api/auth/*`  | Better Auth Node handler — internal / SDK-only. |
| `/api/v1/*`    | All business endpoints (also re-exposes `/auth` under `/api/v1/auth`). |
| `/uploads/*`   | Static uploaded files. |
| `/demo/*`      | Static demo widget assets. |
| `/api/v1/webhook` | Stripe webhook (raw body). |

---

## 1. Demo Accounts (Task 1) — NEW

Seeded automatically on every server boot (idempotent).

| Role     | Email                       | Password    |
|----------|-----------------------------|-------------|
| Customer | `demo.customer@nexora.dev`  | `Demo@1234` |
| Seller   | `demo.seller@nexora.dev`    | `Demo@1234` |
| Admin    | `demo.admin@nexora.dev`     | `Demo@1234` |

### Endpoint

```
POST /auth/demo-login
POST /auth/demo-login/:role
```

**Body / Param:**

```json
{ "role": "customer" | "seller" | "admin" }
```

**Response:** Same shape as `POST /auth/login`. Sets `accessToken`,
`refreshToken`, and Better Auth session cookies.

**Frontend usage:**

```ts
// pages/login.tsx
async function loginAsDemo(role: "customer" | "seller" | "admin") {
  const res = await fetch(`${API_BASE}/auth/demo-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  const json = await res.json();
  // Optional: store accessToken in memory; cookies are already set.
  return json.data;
}
```

The seller demo is **auto-approved** with a ready-to-use shop
(`demo-shop`), so the seller dashboard works immediately.
The customer demo has a wishlist row pre-created.
The admin demo is a full `ADMIN` user.

---

## 2. Auth — `/auth`

File: [src/modules/auth/auth.router.ts](src/modules/auth/auth.router.ts)

| Method | Path                     | Auth                    | Purpose |
|--------|--------------------------|-------------------------|---------|
| POST   | `/auth/register`         | public                  | Register customer (creates User + Customer + Wishlist). |
| POST   | `/auth/login`            | public                  | Email/password login. Sets cookies. |
| POST   | `/auth/demo-login`       | public                  | **NEW.** Demo customer/seller/admin login. |
| POST   | `/auth/demo-login/:role` | public                  | Same, role in URL. |
| GET    | `/auth/me`               | any logged-in           | Current user (+ customer/admin/addresses). |
| POST   | `/auth/refresh-token`    | refresh cookie          | Rotate access token. |
| POST   | `/auth/change-password`  | CUSTOMER/ADMIN/STAFF    | Change password. |
| POST   | `/auth/logOut`           | CUSTOMER/ADMIN/STAFF    | Sign out + clear cookies. |
| POST   | `/auth/verify-email`     | public                  | Verify email OTP. |
| POST   | `/auth/forget-password`  | public                  | Request reset OTP. |
| POST   | `/auth/reset-password`   | public                  | Reset with OTP. |
| GET    | `/auth/login/google`     | public                  | Redirect to Google OAuth. |
| GET    | `/auth/google/success`   | OAuth callback          | Sets cookies, redirects to FRONTEND. |
| GET    | `/auth/oauth/error`      | public                  | Redirects to `/login?error=oauth`. |
| GET    | `/auth/check-email`      | public                  | `?email=` → `{ exists, available }`. |
| PUT    | `/auth/update-profile`   | any logged-in           | Update name/email/image/phone. |

Service: [src/modules/auth/auth.service.ts](src/modules/auth/auth.service.ts)
Controller: [src/modules/auth/auth.controler.ts](src/modules/auth/auth.controler.ts)

---

## 3. Users / Admin Users — `/api/v1/users`, `/api/v1/admin`

| Method | Path                          | Auth          | Purpose |
|--------|-------------------------------|---------------|---------|
| POST   | `/api/v1/users/admin`         | ADMIN         | Create another admin/staff user. |
| GET    | `/api/v1/users/customers`     | ADMIN/STAFF   | List all customers. |
| GET    | `/api/v1/admin`               | ADMIN         | List admins. |
| GET    | `/api/v1/admin/:id`           | ADMIN         | Get admin by id. |
| PUT    | `/api/v1/admin/:id`           | ADMIN         | Update admin. |
| DELETE | `/api/v1/admin/:id`           | ADMIN         | Delete admin. |

Files: [user.router.ts](src/modules/user/user.router.ts), [admin.router.ts](src/modules/admin/admin.router.ts)

---

## 4. Sellers / Marketplace — `/api/v1/sellers`

| Method | Path                                   | Auth                | Purpose |
|--------|----------------------------------------|---------------------|---------|
| GET    | `/api/v1/sellers/shops`                | public              | Public list of approved shops. |
| GET    | `/api/v1/sellers/shops/:slug`          | public              | Public shop by slug. |
| POST   | `/api/v1/sellers/apply`                | any logged-in       | Apply to become a seller (PENDING). |
| GET    | `/api/v1/sellers/me`                   | SELLER/ADMIN        | My seller profile. |
| PATCH  | `/api/v1/sellers/me`                   | SELLER/ADMIN        | Update my shop. |
| GET    | `/api/v1/sellers/me/dashboard`         | SELLER/ADMIN        | Seller dashboard KPIs. |
| GET    | `/api/v1/sellers/admin`                | ADMIN/STAFF         | List all sellers (moderation). |
| GET    | `/api/v1/sellers/admin/:id`            | ADMIN/STAFF         | Get seller (moderation). |
| PATCH  | `/api/v1/sellers/admin/:id/approve`    | ADMIN               | Approve seller. |
| PATCH  | `/api/v1/sellers/admin/:id/reject`     | ADMIN               | Reject seller. |
| PATCH  | `/api/v1/sellers/admin/:id/suspend`    | ADMIN               | Suspend seller. |
| PATCH  | `/api/v1/sellers/admin/:id/reinstate`  | ADMIN               | Reinstate suspended seller. |

File: [seller.router.ts](src/modules/seller/seller.router.ts)

---

## 5. Catalog

### Categories — `/api/v1/categories`
File: [category.router.ts](src/modules/category/category.router.ts)

| Method | Path                          | Auth          | Purpose |
|--------|-------------------------------|---------------|---------|
| GET    | `/api/v1/categories`          | public        | Flat list. |
| GET    | `/api/v1/categories/tree`     | public        | Nested tree. |
| GET    | `/api/v1/categories/:slug`    | public        | By slug. |
| POST   | `/api/v1/categories`          | ADMIN/STAFF   | Create. |
| PATCH  | `/api/v1/categories/:id`      | ADMIN/STAFF   | Update. |
| DELETE | `/api/v1/categories/:id`      | ADMIN         | Delete. |

### Brands — `/api/v1/brands`
File: [brand.router.ts](src/modules/brand/brand.router.ts)

| Method | Path                       | Auth          | Purpose |
|--------|----------------------------|---------------|---------|
| GET    | `/api/v1/brands`           | public        | List brands. |
| GET    | `/api/v1/brands/:slug`     | public        | By slug. |
| POST   | `/api/v1/brands`           | ADMIN/STAFF   | Create. |
| PATCH  | `/api/v1/brands/:id`       | ADMIN/STAFF   | Update. |
| DELETE | `/api/v1/brands/:id`       | ADMIN         | Delete. |

### Products — `/api/v1/products`
Files: [product.router.ts](src/modules/product/product.router.ts), [productVariant.router.ts](src/modules/product/productVariant.router.ts)

| Method | Path                                              | Auth                | Purpose |
|--------|---------------------------------------------------|---------------------|---------|
| GET    | `/api/v1/products`                                | public              | Filter/search. Query: `?q=&categorySlug=&brandSlug=&minPrice=&maxPrice=&page=&limit=&sort=`. |
| GET    | `/api/v1/products/by-id/:id`                      | public              | By id. |
| GET    | `/api/v1/products/:slug`                          | public              | By slug (full detail w/ images, specs, variants). |
| POST   | `/api/v1/products`                                | SELLER/ADMIN/STAFF  | Create. |
| PATCH  | `/api/v1/products/:id`                            | SELLER/ADMIN/STAFF  | Update. |
| DELETE | `/api/v1/products/:id`                            | SELLER/ADMIN        | Delete. |
| GET    | `/api/v1/products/:productId/variants`            | public              | Variants list. |
| POST   | `/api/v1/products/:productId/variants`            | ADMIN/STAFF         | Create variant. |
| PATCH  | `/api/v1/products/:productId/variants/:variantId` | ADMIN/STAFF         | Update variant. |
| DELETE | `/api/v1/products/:productId/variants/:variantId` | ADMIN               | Delete variant. |

---

## 6. Commerce

### Cart — `/api/v1/cart`
File: [cart.router.ts](src/modules/cart/cart.router.ts) (guest carts allowed via cookie/session id)

| Method | Path                          | Purpose |
|--------|-------------------------------|---------|
| GET    | `/api/v1/cart`                | Get current cart. |
| POST   | `/api/v1/cart/items`          | Add item `{ productId, variantId?, quantity }`. |
| PATCH  | `/api/v1/cart/items/:itemId`  | Update quantity. |
| DELETE | `/api/v1/cart/items/:itemId`  | Remove item. |
| POST   | `/api/v1/cart/clear`          | Clear cart. |
| POST   | `/api/v1/cart/coupon`         | Apply coupon `{ code }`. |
| DELETE | `/api/v1/cart/coupon`         | Remove coupon. |

### Wishlist — `/api/v1/wishlist`
File: [wishlist.router.ts](src/modules/wishlist/wishlist.router.ts) — auth required

| Method | Path                                  | Purpose |
|--------|---------------------------------------|---------|
| GET    | `/api/v1/wishlist`                    | Get wishlist + items. |
| POST   | `/api/v1/wishlist/items`              | Add `{ productId }`. |
| DELETE | `/api/v1/wishlist/items/:productId`   | Remove. |

### Addresses — `/api/v1/addresses`
File: [address.router.ts](src/modules/address/address.router.ts) — auth required

| Method | Path                          | Purpose |
|--------|-------------------------------|---------|
| GET    | `/api/v1/addresses`           | List my addresses. |
| POST   | `/api/v1/addresses`           | Create. |
| PATCH  | `/api/v1/addresses/:id`       | Update. |
| DELETE | `/api/v1/addresses/:id`       | Delete. |

### Coupons — `/api/v1/coupons`
File: [coupon.router.ts](src/modules/coupon/coupon.router.ts)

| Method | Path                          | Auth    | Purpose |
|--------|-------------------------------|---------|---------|
| POST   | `/api/v1/coupons/validate`    | public  | Validate `{ code, amount }`. |
| POST   | `/api/v1/coupons`             | ADMIN   | Create coupon. |
| GET    | `/api/v1/coupons`             | ADMIN   | List coupons. |
| GET    | `/api/v1/coupons/:id`         | ADMIN   | Get by id. |
| PATCH  | `/api/v1/coupons/:id`         | ADMIN   | Update. |
| DELETE | `/api/v1/coupons/:id`         | ADMIN   | Delete. |

### Orders — `/api/v1/orders`
File: [order.router.ts](src/modules/order/order.router.ts) — auth required

| Method | Path                                  | Auth                | Purpose |
|--------|---------------------------------------|---------------------|---------|
| POST   | `/api/v1/orders/checkout`             | CUSTOMER/ADMIN/STAFF| Checkout (creates Order + SellerOrders). |
| GET    | `/api/v1/orders/me`                   | CUSTOMER/ADMIN/STAFF| My orders. |
| POST   | `/api/v1/orders/:id/cancel`           | CUSTOMER/ADMIN/STAFF| Cancel order. |
| GET    | `/api/v1/orders/:id`                  | CUSTOMER/ADMIN/STAFF| Order detail. |
| GET    | `/api/v1/orders`                      | ADMIN/STAFF         | All orders. |
| PATCH  | `/api/v1/orders/:id/status`           | ADMIN/STAFF         | Update order status. |

### Seller Orders — `/api/v1/seller-orders`
File: [sellerOrder.router.ts](src/modules/sellerOrder/sellerOrder.router.ts)

| Method | Path                                          | Auth                | Purpose |
|--------|-----------------------------------------------|---------------------|---------|
| GET    | `/api/v1/seller-orders/me`                    | SELLER/ADMIN/STAFF  | My (seller's) sub-orders. |
| GET    | `/api/v1/seller-orders/admin`                 | ADMIN/STAFF         | All sub-orders. |
| GET    | `/api/v1/seller-orders/:id`                   | SELLER/ADMIN/STAFF  | Detail. |
| PATCH  | `/api/v1/seller-orders/:id/status`            | SELLER/ADMIN/STAFF  | Update fulfillment status. |
| PATCH  | `/api/v1/seller-orders/:id/tracking`          | SELLER/ADMIN/STAFF  | Add tracking info. |
| PATCH  | `/api/v1/seller-orders/:id/cancel`            | SELLER/ADMIN/STAFF  | Cancel sub-order. |

### Payouts — `/api/v1/payouts`
File: [payout.router.ts](src/modules/payout/payout.router.ts)

| Method | Path                                  | Auth                | Purpose |
|--------|---------------------------------------|---------------------|---------|
| GET    | `/api/v1/payouts/me`                  | SELLER/ADMIN/STAFF  | My payouts. |
| GET    | `/api/v1/payouts/admin`               | ADMIN/STAFF         | All payouts. |
| GET    | `/api/v1/payouts/:id`                 | SELLER/ADMIN/STAFF  | Detail. |
| POST   | `/api/v1/payouts/admin/generate`      | ADMIN               | Generate payout for seller. |
| PATCH  | `/api/v1/payouts/admin/:id/paid`      | ADMIN               | Mark paid. |
| PATCH  | `/api/v1/payouts/admin/:id/failed`    | ADMIN               | Mark failed. |

### Reviews — `/api/v1/reviews`
File: [review.router.ts](src/modules/review/review.router.ts)

| Method | Path                                          | Auth                | Purpose |
|--------|-----------------------------------------------|---------------------|---------|
| GET    | `/api/v1/reviews/product/:productId`          | public              | Reviews for product. |
| POST   | `/api/v1/reviews`                             | CUSTOMER/ADMIN/STAFF| Create review. |
| DELETE | `/api/v1/reviews/:id`                         | CUSTOMER/ADMIN/STAFF| Delete (own/admin). |
| PATCH  | `/api/v1/reviews/:id/moderate`                | ADMIN/STAFF         | Approve/reject. |

---

## 7. Payments — `/api/v1/payments` + Stripe Webhook

File: [payment.router.ts](src/modules/payment/payment.router.ts)

| Method | Path                                              | Auth                | Purpose |
|--------|---------------------------------------------------|---------------------|---------|
| POST   | `/api/v1/payments/orders/:orderId/intent`         | CUSTOMER/ADMIN/STAFF| Create Stripe PaymentIntent. |
| POST   | `/api/v1/webhook`                                 | Stripe (raw body)   | Stripe webhook (do NOT call from frontend). |

---

## 8. Notifications — `/api/v1/notifications`

File: [notification.route.ts](src/modules/notification/notification.route.ts) — auth required

| Method | Path                                      | Purpose |
|--------|-------------------------------------------|---------|
| GET    | `/api/v1/notifications`                   | List my notifications. |
| PATCH  | `/api/v1/notifications/read-all`          | Mark all as read. |
| PATCH  | `/api/v1/notifications/:id/read`          | Mark one as read. |
| DELETE | `/api/v1/notifications/:id`               | Delete. |

---

## 9. Stats (Admin) — `/api/v1/stats`

File: [stats.router.ts](src/modules/stats/stats.router.ts) — ADMIN/STAFF only

| Method | Path                                  | Purpose |
|--------|---------------------------------------|---------|
| GET    | `/api/v1/stats/overview`              | KPI cards. |
| GET    | `/api/v1/stats/recent-orders`         | Recent orders feed. |
| GET    | `/api/v1/stats/top-products`          | Best sellers. |
| GET    | `/api/v1/stats/revenue`               | Revenue by day. |
| GET    | `/api/v1/stats/marketplace`           | Marketplace-level KPIs. |
| GET    | `/api/v1/stats/top-sellers`           | Top sellers leaderboard. |
| GET    | `/api/v1/stats/payout-pipeline`       | Pending/processing/paid totals. |

---

## 10. AI — `/api/v1/ai`

File: [ai.router.ts](src/modules/ai/ai.router.ts). All endpoints rate-limited per minute.

| Method | Path                                                                   | Auth          | Purpose |
|--------|------------------------------------------------------------------------|---------------|---------|
| GET    | `/api/v1/ai/health`                                                    | public        | Provider health. |
| GET    | `/api/v1/ai/metrics`                                                   | public        | Aggregated AI metrics. |
| POST   | `/api/v1/ai/support`                                                   | public        | Storefront support widget. |
| POST   | `/api/v1/ai/recommendations`                                           | public        | Personalised product recs. |
| POST   | `/api/v1/ai/industry-creation`                                         | public        | Industry suggestion tool. |
| POST   | `/api/v1/ai/search`                                                    | public        | Semantic product search. |
| POST   | `/api/v1/ai/summary`                                                   | public        | Long-text summarisation. |
| POST   | `/api/v1/ai/chat`                                                      | public        | Stateless chat. |
| POST   | `/api/v1/ai/chat/messages`                                             | logged-in     | Persisted chat send. |
| GET    | `/api/v1/ai/chat/conversations`                                        | logged-in     | List my conversations. |
| GET    | `/api/v1/ai/chat/conversations/:conversationId`                        | logged-in     | Get conversation. |
| PATCH  | `/api/v1/ai/chat/conversations/:cid/messages/:mid/feedback`            | logged-in     | Up/down vote. |
| POST   | `/api/v1/ai/document-analysis`                                         | public        | Doc analysis. |
| POST   | `/api/v1/ai/rag/query`                                                 | public        | RAG query. |

Detailed payload contracts: [docs/AI_API_CONTRACTS.md](docs/AI_API_CONTRACTS.md).

---

## 11. Standard Response Shape

Every controller goes through `sendResponse`:

```ts
{
  success: boolean,
  message: string,
  data: T | null,
  meta?: { page, limit, total, totalPages }   // for paginated lists
}
```

Errors go through `globalErrorHandler` and return:

```ts
{
  success: false,
  message: string,
  errorSources?: { path: string, message: string }[],
  err?: any,
  stack?: string  // dev only
}
```

---

## 12. Auth & CORS Notes for the Frontend

- The browser MUST send credentials: `fetch(url, { credentials: "include" })` or
  `axios({ withCredentials: true })`.
- After login, the backend sets:
  - `accessToken` cookie (JWT, used by `checkAuth` middleware).
  - `refreshToken` cookie (used by `POST /auth/refresh-token`).
  - `better-auth.session_token` cookie (Better Auth).
- For cross-domain prod (frontend on Vercel, backend on Render) all cookies are
  set with `SameSite=None; Secure`.
- Add the frontend origin to `FRONTEND_URL` env var — CORS uses it.
- For Server Components / server actions, prefer hitting endpoints from the
  browser so the `Origin` header is preserved (Better Auth rejects null Origin).

---

## 13. File Map (one-liner per module)

```
src/modules/
  auth/        Sign-up, login, demo-login, OAuth, password, profile
  user/        Admin-only customer/staff management
  admin/       Admin user CRUD
  seller/      Seller application + storefront + admin moderation
  category/    Category tree CRUD (admin) + public reads
  brand/       Brand CRUD (admin) + public reads
  product/     Product CRUD + variants
  cart/        Guest + user carts, items, coupons
  wishlist/    Customer wishlist
  address/     Customer address book
  coupon/      Admin coupons + public validate
  order/       Checkout + customer/admin order lifecycle
  sellerOrder/ Seller-side fulfillment of sub-orders
  payout/      Seller payout requests + admin generate/mark
  payment/     Stripe PaymentIntent + webhook
  review/      Reviews CRUD + moderation
  notification/User notifications
  stats/       Admin/staff dashboards
  ai/          Chat, recommendations, search, RAG, document analysis
```

Each module follows the pattern:

```
xxx.router.ts      Express routes + auth + validation
xxx.controler.ts   Reads req, calls service, sendResponse
xxx.service.ts     Business logic + Prisma calls
xxx.validation.ts  Zod schemas
xxx.interface.ts   TS types (some modules)
```
