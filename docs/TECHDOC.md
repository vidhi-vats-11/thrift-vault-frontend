# Thrift Vault — Backend Tech Doc

Status: Draft for review before backend implementation begins.
Scope: Design the backend for the existing React/Vite storefront (`src/`). The frontend currently runs entirely client-side against a static `products.js` array with cart/wishlist persisted to `localStorage`. This doc designs the API and data layer that replaces that mock data with a real system.

## 1. Goals & Constraints

- Products are predominantly **one-of-one secondhand pieces** (stock = 1). Reselling an item that's already sold is the worst failure mode — inventory correctness under concurrent checkout is the central design constraint, not scale.
- Single-vendor/admin-curated catalog (per the "Started in a dorm room" story copy) — **not** a multi-vendor marketplace. No seller-facing auth/dashboard in v1.
- Existing UX to preserve: guest browsing, search + category filter, quick-view modal, cart drawer, wishlist drawer, toasts, newsletter signup, testimonials.
- Payment methods implied by footer (Visa, Mastercard, UPI, PayPal) → need a gateway abstraction that supports both card rails and UPI (India) — points to **Razorpay** (or Stripe + Razorpay) rather than Stripe alone.

## 2. Stack Decision

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js + Express | Matches existing JS/React codebase; one language across the stack |
| DB | PostgreSQL | ACID transactions + row locking needed to prevent double-selling a stock=1 item; relational fits orders/inventory better than a document store |
| ORM | Prisma | Type-safe schema, migrations, works well with Express |
| Auth | JWT (access + refresh), bcrypt for passwords | Stateless API, simple to scale horizontally |
| Cache/Queue | Redis (+ BullMQ) | Session/rate-limit store now; email + abandoned-cart jobs later |
| Object storage | S3-compatible (Cloudinary or AWS S3) | Product photos, admin-uploaded |
| Payments | Razorpay (cards + UPI), Stripe as alt/international fallback | Matches footer payment icons |
| Deployment | Dockerized API + managed Postgres/Redis (Railway/Render/AWS) | Simple ops for current scale |

---

## 3. High-Level Design (HLD)

```mermaid
flowchart LR
    subgraph Client
        SPA["React SPA (Vite)\ncart/wishlist state via API"]
    end

    subgraph Edge
        CDN["CDN / Static Hosting\n(SPA assets)"]
    end

    subgraph API["Backend API (Node.js/Express)"]
        AuthSvc["Auth module"]
        CatalogSvc["Catalog module"]
        CartSvc["Cart module"]
        OrderSvc["Order/Checkout module"]
        PaySvc["Payment module"]
        AdminSvc["Admin module"]
    end

    DB[(PostgreSQL)]
    Cache[(Redis)]
    Store[(Object Storage\nproduct images)]
    Gateway["Payment Gateway\n(Razorpay/Stripe)"]
    Mail["Email provider\n(order confirm, newsletter)"]

    SPA -->|HTTPS/JSON| API
    CDN --> SPA
    AuthSvc --> DB
    CatalogSvc --> DB
    CartSvc --> DB
    CartSvc --> Cache
    OrderSvc --> DB
    OrderSvc --> PaySvc
    PaySvc --> Gateway
    Gateway -->|webhook| PaySvc
    AdminSvc --> DB
    AdminSvc --> Store
    CatalogSvc --> Store
    OrderSvc --> Mail
```

**Module boundaries** (all within one Express app initially — split into services later only if needed):

1. **Auth** — signup/login, JWT issuance/refresh, password reset.
2. **Catalog** — products, categories, search/filter, quick-view detail.
3. **Cart** — server-persisted cart per user; guest cart merges into account cart on login.
4. **Wishlist** — server-persisted saved items.
5. **Order/Checkout** — cart → order, atomic inventory hold, payment orchestration, order status.
6. **Payment** — gateway abstraction, webhook verification, refunds.
7. **Admin** — product CRUD, image upload, order fulfillment status, condition/tag management.
8. **Newsletter** — subscriber capture (footer + newsletter section already in UI).

---

## 4. Low-Level Design (LLD)

### 4.1 Data Model (ERD)

```mermaid
erDiagram
    USER ||--o{ ADDRESS : has
    USER ||--o{ CART_ITEM : owns
    USER ||--o{ WISHLIST_ITEM : owns
    USER ||--o{ ORDER : places
    USER ||--o{ REVIEW : writes

    PRODUCT ||--o{ PRODUCT_IMAGE : has
    PRODUCT }o--|| CATEGORY : belongs_to
    PRODUCT ||--o{ CART_ITEM : referenced_by
    PRODUCT ||--o{ WISHLIST_ITEM : referenced_by
    PRODUCT ||--o{ ORDER_ITEM : referenced_by
    PRODUCT ||--o{ REVIEW : has

    ORDER ||--|{ ORDER_ITEM : contains
    ORDER ||--o| PAYMENT : paid_by

    USER {
        uuid id PK
        string email UK
        string password_hash
        string name
        string role "customer|admin"
        timestamp created_at
    }
    ADDRESS {
        uuid id PK
        uuid user_id FK
        string line1
        string city
        string state
        string postal_code
        string country
        boolean is_default
    }
    CATEGORY {
        uuid id PK
        string name UK
        string slug UK
    }
    PRODUCT {
        uuid id PK
        string name
        string brand
        uuid category_id FK
        int price_cents
        int original_price_cents
        string condition "Good|Like New|New"
        string era
        string tag "NEW DROP|TRENDING|RARE FIND|ONE OF ONE|null"
        int stock_quantity "almost always 1"
        int version "optimistic lock for stock updates"
        string status "draft|live|sold|archived"
        text description
        timestamp created_at
    }
    PRODUCT_IMAGE {
        uuid id PK
        uuid product_id FK
        string url
        int sort_order
    }
    PRODUCT_SIZE {
        uuid id PK
        uuid product_id FK
        string size
    }
    CART_ITEM {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        string size
        int qty
        timestamp added_at
    }
    WISHLIST_ITEM {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        timestamp added_at
    }
    ORDER {
        uuid id PK
        uuid user_id FK
        uuid address_id FK
        int subtotal_cents
        int total_cents
        string status "pending_payment|paid|fulfilled|cancelled|refunded"
        timestamp created_at
    }
    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        string size
        int qty
        int price_cents "price at time of purchase"
    }
    PAYMENT {
        uuid id PK
        uuid order_id FK
        string gateway "razorpay|stripe"
        string gateway_ref
        string status "created|authorized|captured|failed|refunded"
        int amount_cents
        timestamp created_at
    }
    REVIEW {
        uuid id PK
        uuid product_id FK
        uuid user_id FK
        int rating "1-5"
        text comment
        timestamp created_at
    }
    NEWSLETTER_SUBSCRIBER {
        uuid id PK
        string email UK
        timestamp subscribed_at
    }
```

Notes:
- Money stored as integer cents to avoid float rounding errors.
- `PRODUCT.version` is an optimistic-concurrency column (Prisma `@@version` pattern) used specifically to guard the stock decrement — see §4.3.
- `PRODUCT.status` drives visibility: only `live` products with `stock_quantity > 0` appear in catalog/search results.

### 4.2 API Surface

Base path: `/api/v1`. Auth via `Authorization: Bearer <JWT>`; guest-accessible endpoints marked **public**.

| Module | Method & Path | Auth | Purpose |
|---|---|---|---|
| Auth | `POST /auth/signup` | public | Create account |
| Auth | `POST /auth/login` | public | Issue access+refresh JWT |
| Auth | `POST /auth/refresh` | public (refresh token) | Rotate access token |
| Auth | `POST /auth/logout` | user | Revoke refresh token |
| Catalog | `GET /products` | public | List + filter (`?category=`, `?q=`, `?tag=`, pagination) |
| Catalog | `GET /products/:id` | public | Product detail (quick-view/PDP) |
| Catalog | `GET /categories` | public | Category list |
| Cart | `GET /cart` | user | Get current cart |
| Cart | `POST /cart/items` | user | Add `{productId, size, qty}` |
| Cart | `PATCH /cart/items/:id` | user | Update qty |
| Cart | `DELETE /cart/items/:id` | user | Remove line |
| Cart | `POST /cart/merge` | user | Merge guest-cart payload on login |
| Wishlist | `GET /wishlist` | user | List saved items |
| Wishlist | `POST /wishlist/:productId` | user | Toggle save |
| Wishlist | `DELETE /wishlist/:productId` | user | Remove |
| Checkout | `POST /orders` | user | Create order from cart, returns payment intent |
| Checkout | `GET /orders/:id` | user | Order status |
| Checkout | `GET /orders` | user | Order history |
| Payment | `POST /payments/webhook` | gateway signature | Async payment confirmation |
| Reviews | `POST /products/:id/reviews` | user | Submit review |
| Newsletter | `POST /newsletter/subscribe` | public | Footer/newsletter form |
| Admin | `POST /admin/products` | admin | Create listing |
| Admin | `PATCH /admin/products/:id` | admin | Edit/archive listing |
| Admin | `POST /admin/products/:id/images` | admin | Upload images |
| Admin | `PATCH /admin/orders/:id` | admin | Update fulfillment status |

### 4.3 Critical Flow — Checkout with Unique Inventory

The one thing that must never happen: two customers both "win" the same one-of-one item. Handled with a DB transaction + row lock at order creation, **not** at add-to-cart (adding to cart never reserves stock, since carts can sit idle for days).

```mermaid
sequenceDiagram
    participant C as Client
    participant O as Order Service
    participant DB as Postgres
    participant P as Payment Gateway

    C->>O: POST /orders (cart snapshot)
    O->>DB: BEGIN TRANSACTION
    O->>DB: SELECT product FOR UPDATE (each cart line)
    alt any product.stock_quantity < qty
        O->>DB: ROLLBACK
        O-->>C: 409 Conflict — item no longer available
    else all in stock
        O->>DB: stock_quantity -= qty, status='sold' if 0
        O->>DB: INSERT order (status=pending_payment)
        O->>DB: COMMIT
        O->>P: create payment intent
        P-->>O: intent id
        O-->>C: 201 { orderId, paymentIntent }
        C->>P: complete payment (redirect/SDK)
        P-->>O: webhook: payment captured
        O->>DB: order.status = 'paid'
        O-->>C: order confirmed (via poll or push)
    end
```

- Lock scope is per-row (`SELECT ... FOR UPDATE`), held only for the duration of the transaction — sub-100ms, so contention is a non-issue at this scale.
- If payment fails/times out after the hold, a background job (BullMQ, 15 min TTL) releases stock back (`stock_quantity += qty`, `status='live'`) and cancels the order — prevents items being stuck "reserved" forever from an abandoned checkout.

### 4.4 Auth Flow

- Passwords hashed with bcrypt (cost 12).
- Access token: 15 min TTL, JWT with `{sub, role}`.
- Refresh token: 30 day TTL, stored hashed in DB (revocable on logout).
- Admin routes gated by `role === 'admin'` middleware, separate from ownership checks.

### 4.5 Non-Functional

- **Validation**: request bodies validated with `zod` at the route boundary before hitting service logic.
- **Rate limiting**: Redis-backed limiter on `/auth/*` and `/orders` to blunt credential-stuffing and checkout abuse.
- **Idempotency**: `POST /orders` accepts an `Idempotency-Key` header so a client retry (flaky network) can't create duplicate orders.
- **Observability**: structured JSON logs per request (request id, user id, latency); errors to Sentry.
- **Migration path**: cart/wishlist already exist as `localStorage` shapes in `CartContext.jsx` — on first login, client POSTs the local `lines`/`wishlist` arrays to `/cart/merge` and `/wishlist` bulk-add, then clears localStorage as source of truth in favor of the server.

## 5. Open Questions (need answers before implementation)

1. Guest checkout — allowed without an account, or login required? (Current UI has no auth at all.)
2. Returns/exchanges — footer links to "Returns & Exchanges" but no policy or workflow defined yet.
3. Shipping — flat rate, calculated, or out of scope for v1?
4. Do we need multi-currency (UPI implies India, PayPal implies international)?
