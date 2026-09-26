# Kasoundbox — Party Rental, Reservation & Inventory System

**Design spec · v1**

| | |
|---|---|
| Date | 2026-09-26 |
| Status | v1.1 — v1 approved 2026-09-26; the customer website (D18–D21) was added the same day and awaits review of the written changes |
| Owner | Marvin (DevNarvs) |
| Origin | Brainstorming sessions, 2026-09-26 |
| Companion docs | Design brief: `docs/design/kasoundbox-design-brief.md` · Process flow guide: `docs/process-flow/` |

---

## 1. Summary

Kasoundbox rents out party needs (tents, tables, chairs, videoke, and more to come) and always delivers and picks up. This system replaces Messenger-and-notebook booking with:

- a **public website** (Home, Rentals, Gallery, Testimonies, Promos, About, FAQ, Contact) with a **Reserve** button on every page;
- a **catalog** (Rentals) anyone can browse, with live prices and availability for an event's date, start time and length;
- **reservation requests** from signed-in customers, made in four guided steps, which an admin confirms once the downpayment is in;
- an **inventory engine** that guarantees confirmed bookings never need more units than exist at any moment;
- an **admin panel** where every business setting (items, prices, packages, discounts, rules, website text and photos) is editable without code;
- **testimonies** from customers whose events are done, shown only when an admin publishes them;
- **notifications** (in-app pop-ups and phone push) whenever a booking changes.

## 2. Context and goals

**Business.** Family-run. Two people (Marvin and Marvin's dad) run everything and are the only admins. Philippines: prices in ₱, time in Asia/Manila. Most customers arrive from Facebook, on phones.

**Success criteria**

1. **No overbooking.** Confirmed bookings never need more units of an item than are in service at any moment.
2. **Clear daily operations.** For any day, the admins can see what goes out, what comes back, what is overdue and what is in repair.
3. **Self-service information.** Customers can check prices and availability for their event, see photos of past events, read testimonies and find answers to common questions without messaging.
4. **No-code changes.** Adding a new kind of item (e.g., "LED Party Lights") or changing any price, discount, rule, or website text or photo needs no code change.

Non-goals are listed in §15.

## 3. Decisions log (locked during brainstorming)

| # | Topic | Decision |
|---|---|---|
| D1 | Who books | Customers submit reservation **requests** online; an admin confirms. Admins can also enter bookings for walk-in, phone and Messenger customers (no account needed). |
| D2 | Browsing | Public, no login. **Reserving requires a customer account.** |
| D3 | Customer sign-in | Google, or email + password (email verified with a one-time code). Same approach as Decssy. |
| D4 | Roles | `customer` and `admin` only. Two admins. Admin is granted only from the Convex dashboard. |
| D5 | Stock model | Bulk items are counts. Items flagged "track units" (e.g., videoke) have individually coded units. |
| D6 | Time model | Booking = start date + start time + number of days. Each day = 22 h with the customer + 2 h for pickup, checking and testing, so stock is blocked for days × 24 h from the start time. |
| D7 | Start times | Customers choose on-the-hour start times from 8:00 AM to 5:00 PM (adjustable). Admins may set any time. |
| D8 | Pricing | Each item and package has a 1st-day price and an optional extra-day price (blank = same as the 1st day). |
| D9 | Packages | Admin-built from items, with their own prices. Availability comes from the component items. |
| D10 | Confirmation | A booking is confirmed only when recorded payments cover the downpayment (% or fixed, adjustable). Requests hold no stock. |
| D11 | Extra charges | Damage, loss and late charges at check-in (suggested, editable). Delivery charge is entered manually. No security deposit. |
| D12 | Fulfillment | The business always delivers and picks up. Every booking has a venue address. |
| D13 | Discounts | Manual discount per booking + promo codes (at most one per booking). |
| D14 | Notifications | In-app (bell + pop-up) and web push, for customers and admins. Each event can be switched on or off. |
| D15 | Images | Cloudinary (existing account), signed uploads. |
| D16 | Stack | Next.js 16 + Convex + Convex Auth + Tailwind v4 + shadcn/ui (the Decssy stack). See §14. |
| D17 | Configurability | Everything the business decides is editable in the admin panel. Exceptions: secrets, admin grants, timezone, currency. |
| D18 | Customer website | A public website: Home, Rentals, Reserve, Gallery, Testimonies, Promos, About, FAQ, Contact. A **Reserve** button is always in reach (in the header on computers, pinned to the bottom on phones). Pages with nothing to show (Testimonies, Promos) leave the menu and Home. |
| D19 | Reserve flow | Four guided steps: When (date, start time, days) → What (only what is free then) → Where (venue) → Review & send. Sign-in happens at the last step; the cart is kept. "Add" on Rentals feeds the same cart. |
| D20 | Testimonies | Written only by customers, for their own booking that reached Returned or Completed, one per booking, with consent. Admins publish, hide or feature them and never edit the words. Customers edit while waiting and can remove theirs at any time. |
| D21 | Website content | Home headline and photo, About, Contact details, announcement, FAQ, gallery, and which promos and packages are featured: all edited in the admin panel. "How it works" stays fixed because it describes how the system behaves. Service area moves from Business settings to the website's Contact details. |

## 4. Architecture

### 4.1 Stack

- Next.js 16.2.x (App Router), React 19.2, TypeScript 5, Tailwind CSS v4, shadcn/ui, lucide-react, sonner (toasts). Versions match Decssy.
- Convex ^1.37 (database, server functions, scheduler, crons), `@convex-dev/auth` (Google + Password), `@convex-dev/rate-limiter`.
- Cloudinary (images), Resend (sign-in emails only), `web-push` (push notifications, in Node actions).
- Tests: Vitest + `convex-test`; Playwright for end-to-end flows.
- Carry Decssy's `AGENTS.md` rule into this repo: Next 16 has breaking changes, so read the bundled docs in `node_modules/next/dist/docs/` before writing Next.js code.

### 4.2 Routes

**Public website:** `/` (Home), `/rentals`, `/items/[slug]`, `/packages/[slug]`, `/reserve` (four steps: `?step=when|what|where|review`), `/reserve/sent/[code]`, `/gallery`, `/gallery/[album]`, `/testimonies`, `/promos`, `/about`, `/faq`, `/contact`, `/terms`, `/privacy`.

**Customer account:** `/account`, `/account/reservations`, `/account/reservations/[code]`, `/notifications`, `/sign-in`, `/forgot-password`, `/welcome`.

**Admin** (role `admin` required): `/admin`, `/admin/bookings`, `/admin/bookings/new`, `/admin/bookings/[code]`, `/admin/bookings/[code]/print`, `/admin/calendar`, `/admin/catalog`, `/admin/inventory`, `/admin/inventory/[itemId]`, `/admin/promos`, `/admin/customers`, `/admin/reports`, `/admin/website`, `/admin/website/faq`, `/admin/website/gallery`, `/admin/website/testimonies`, `/admin/settings`, `/admin/activity`.

- The event's date, start time and days live in the URL (`?date=2026-10-10&time=08:00&days=1`) on Rentals and Reserve, so links are shareable and survive a refresh.
- The cart lives in `localStorage`, so it survives sign-in.
- Route guards in Next.js are for user experience only. The real gate is the role check inside every Convex function (§11).
- Public website pages render on the server with their own title, description and share image, so links pasted into Facebook show a preview. `sitemap.xml` and `robots.txt` list them for search engines. They read public queries only.

### 4.3 Backend layout (`convex/`)

```
schema.ts
auth.ts · auth.config.ts · http.ts    Convex Auth (Google + Password, Resend codes)
lib/              pure business rules: no ctx, no db, fully unit-tested
  time.ts           Manila time, start-window checks, block and pickup math
  money.ts          centavo helpers, peso rounding, formatting
  availability.ts   capacity, interval sweep, cart and package needs
  pricing.ts        line totals, promo + manual discount, charges, downpayment, balance
  lifecycle.ts      allowed status transitions
  validation.ts     mobile numbers, text limits, settings validation
  content.ts        website settings validation, testimony eligibility and text rules
model/            database helpers shared by functions
  auth.ts           requireUser / requireCustomer / requireAdmin
  holds.ts          load holds for an item and window; replace a booking's holds
  totals.ts         recomputeTotals(): called by every money-changing write
  audit.ts          logBookingEvent, logChange
  notify.ts         insert notifications + schedule push
catalog.ts        categories, items, packages (public reads, admin writes)
inventory.ts      units, stock actions, movements
availability.ts   public and admin availability queries
bookings.ts       submit/cancel (customer); create/edit/confirm/decline/cancel (admin)
operations.ts     dispatch, extend, check-in, run list, alerts
payments.ts       record payment or refund (idempotent)
promos.ts         promo code management and validation
reports.ts        report queries
settings.ts       public subset read; admin update
website.ts        website pages content and FAQ (public reads, admin writes)
gallery.ts        gallery albums and photos (public reads, admin writes)
testimonials.ts   customer submit, edit and remove; admin publish, hide and feature
users.ts          profile, consent; internal makeAdmin / revokeAdmin
notifications.ts  bell, list, mark read
push.ts           ("use node") web push sender
media.ts          ("use node") Cloudinary signing and deletion
crons.ts          request expiry
```

### 4.4 Auth and roles

- Convex Auth with Google and Password providers. Password sign-up verifies the email with a one-time code. Password reset also uses a code (Resend; reuse Decssy's `ResendOTPPasswordReset`).
- `users.role` is `"customer" | "admin"`. A missing role means customer (fail closed).
- Admin is granted or revoked only by the internal functions `users.makeAdmin` / `users.revokeAdmin`, run from the Convex dashboard. No website path can change a role.
- Customers complete a one-time profile (full name, mobile `09XXXXXXXXX`) and accept the privacy notice before they can submit a request.
- Recommendation: admins sign in with Google, so their accounts inherit Google's 2-step verification.

### 4.5 Images (Cloudinary)

- Secrets (`CLOUDINARY_API_SECRET`, API key, cloud name) live in Convex environment variables.
- **Upload:** admin picks a file → `media.signUpload` (Node action, admin-only) returns a signature and timestamp for the `kasoundbox/` folder, restricted to jpg, png and webp → the browser uploads straight to Cloudinary → `catalog.addPhoto` stores `{ publicId, width, height }`.
- **Display:** URLs are built from `publicId` with `f_auto,q_auto` and a width that fits the context (card thumbnail vs. gallery), through `next/image` with a Cloudinary loader.
- **Removal:** removing a photo schedules `media.deleteImage` (Node action) to delete it from Cloudinary.

### 4.6 Notifications

- `notify(ctx, recipients, event)` inserts `notifications` rows inside the same mutation as the change, so they commit or roll back together, and schedules `push.send` to run after the commit.
- `push.send` (Node action, `web-push`, VAPID keys in env) sends to each of the recipient's `pushSubscriptions`. A 404 or 410 response deletes the dead subscription.
- Payloads carry no personal details, for example: "Booking KSB-7Q4M confirmed. Tap to view."
- Client: bell with unread count (reactive query), a toast for each notification that arrives while the page is open, and a notifications page. A service worker shows pushes and opens the link on tap. The site ships a web app manifest and icons so iPhone users can add it to the Home Screen, which iOS requires for web push.
- Permission is requested right after a customer's first request (admins: from Settings), never on page load.

| Event | Recipient | Default |
|---|---|---|
| Request submitted | Admins | On |
| Request cancelled by the customer | Admins | On |
| Booking confirmed | Customer | On |
| Request declined | Customer | On |
| Booking cancelled by an admin | Customer | On |
| Request expired | Customer | On |
| Payment recorded | Customer | On |
| Out for delivery | Customer | On |
| Testimony submitted | Admins | On |
| Testimony published | Customer | On |

### 4.7 Scheduled jobs

- Every 15 minutes: requests whose start time has passed become `expired`, and the customer is notified.
- Overdue and Short alerts are computed live in queries. No job is needed.

### 4.8 Conventions

- **Money:** integer centavos everywhere (`15000` = ₱150.00). Displayed as `₱1,234`; centavos appear only when non-zero.
- **Time:** instants are stored as epoch milliseconds. Manila is UTC+8 with no daylight saving, so wall-clock ↔ instant conversion is a fixed offset, done only in `lib/time.ts`.
- **Errors:** one format, `ConvexError({ code, message, details? })`. Codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `INVALID_TRANSITION`, `INSUFFICIENT_STOCK` (details: per item needed, available, and the tightest time), `DOWNPAYMENT_REQUIRED`, `PROMO_INVALID`, `RATE_LIMITED`.
- **Lists:** every admin list is paginated (cursor-based, 25 per page).
- **Idempotency:** request submission and payment recording carry a client-generated `requestId`. A repeat with the same id returns the original result instead of writing twice. Status changes are idempotent through their preconditions.
- **Booking codes:** `KSB-` + 6 characters from an unambiguous alphabet (no 0/O/1/I/L), unique by index.

### 4.9 Environments and hosting

- Convex: a dev deployment and a production deployment.
- Next.js: Vercel **Pro** (the Hobby plan is non-commercial), or another host whose plan allows commercial use. Chosen at launch (§16).
- Convex env: `SITE_URL`, Convex Auth keys, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- Next.js env: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
- Backups: scheduled Convex exports (confirm what the chosen plan provides).

## 5. Data model

All money fields are centavos. All instants are epoch milliseconds. "Soft" means the record is never deleted, only deactivated or retired.

### 5.1 Catalog

**`categories`** — name, slug, sortOrder, isActive. Indexes: `by_slug`, `by_sort`.

**`items`** (soft) — name, slug, categoryId, description, photos `{ publicId, width, height }[]`, inclusions `string[]`, priceFirstDay, priceExtraDay?, replacementCost, tracking `"count" | "unit"`, inService, inRepair, isActive, sortOrder. Indexes: `by_slug`, `by_category_sort`.
- `inService` and `inRepair` are used by count items only. For unit items, capacity comes from `itemUnits` and both fields stay 0.
- `tracking` cannot change once the item has stock or bookings.

**`itemUnits`** (soft) — itemId, code (unique per item, e.g., `VK-01`), serialNumber?, status `"in_service" | "in_repair" | "retired"`, retiredReason? `"lost" | "broken" | "sold" | "other"`, notes?. Indexes: `by_item_status`, `by_item_code`.

**`packages`** (soft) — name, slug, description, photos, priceFirstDay, priceExtraDay?, components `{ itemId, qty }[]` (each item listed at most once, qty ≥ 1), onHome (featured on Home), isActive, sortOrder. Index: `by_slug`.

### 5.2 Bookings

**`bookings`**
- code, status `"requested" | "confirmed" | "out" | "returned" | "completed" | "declined" | "cancelled" | "expired"`, source `"online" | "admin"`, requestId
- customerUserId?, customer `{ name, mobile, email? }` (snapshot), venue `{ address, landmark?, notes? }`
- startAt, days, bufferHours (snapshot), blockEndAt (= startAt + days × 24 h), pickupAt (= blockEndAt − bufferHours)
- promo? `{ promoId, code, kind, value, maxDiscount?, minOrder? }` (snapshot of the code's terms)
- manualDiscount? `{ kind: "amount" | "percent", value, reason, by, at }`
- totals `{ itemsSubtotal, promoDiscount, manualDiscount, charges, total, paid, balance, downpaymentRequired }` — a cache rewritten by `recomputeTotals` inside every money-changing mutation
- reason? (decline or cancel), confirmedAt?, dispatchedAt?, returnedAt?, completedAt?, cancelledAt?, createdBy
- Indexes: `by_code`, `by_requestId`, `by_status_start` (status, startAt), `by_status_pickup` (status, pickupAt), `by_customer` (customerUserId, startAt), `by_mobile` (customer.mobile, startAt)

**`bookingLines`** — bookingId, kind `"item" | "package"`, itemId? / packageId?, name (snapshot), qty, priceFirstDay, priceExtraDay (snapshot, already resolved), components? `{ itemId, name, qty }[]` (package contents per one package, snapshot), lineTotal. Index: `by_booking`.

**`holds`** — bookingId, itemId, qty, startAt, endAt, phase `"reserved" | "out"`. One row per item per confirmed or out booking (package components included). Indexes: `by_item_end` (itemId, endAt), `by_item_phase` (itemId, phase), `by_booking`.

**`unitAssignments`** — bookingId, itemId, unitId, dispatchedAt, returnedAt?, condition? `"good" | "damaged" | "missing"`. Indexes: `by_booking`, `by_unit_open` (unitId, returnedAt).

**`charges`** — bookingId, kind `"delivery" | "damage" | "loss" | "late" | "other"`, description, amount (> 0), itemId?, qty?, createdBy, createdAt. Admins can edit or remove charges; every change is logged. Index: `by_booking`.

**`payments`** — bookingId, kind `"payment" | "refund"`, amount (> 0), method (from Settings), reference?, receivedAt, recordedBy, note?, requestId. Indexes: `by_booking`, `by_requestId`, `by_received`.

**`bookingEvents`** — bookingId, type, by? (absent = system), at, note?, data?. Index: `by_booking` (bookingId, at).

### 5.3 Promotions

**`promoCodes`** — code (uppercase, unique), kind `"percent" | "amount"`, value, maxDiscount?, minOrder?, validFrom?, validTo?, maxUses?, maxUsesPerCustomer (default 1), isActive, showOnWebsite, publicNote? (up to 200 characters). Index: `by_code`.

**`promoRedemptions`** — promoId, bookingId, customerKey (user id, or mobile for walk-ins), at. Created on confirmation; deleted if that booking is later cancelled. Indexes: `by_promo`, `by_promo_customer`, `by_booking`.

### 5.4 Inventory ledger

**`stockMovements`** — itemId, unitId?, kind `"acquire" | "write_off" | "to_repair" | "from_repair" | "correction"`, inServiceDelta, inRepairDelta, bookingId?, reason, by, at. Index: `by_item` (itemId, at).

### 5.5 People, notifications, settings, audit

**`users`** — Convex Auth fields + role, fullName?, mobile?, consentAt?, profileCompletedAt?. Indexes: Convex Auth's `email`, `by_role`, `by_mobile`.

**`notifications`** — userId, type, title, body, link, bookingId?, readAt?, createdAt. Indexes: `by_user` (userId, createdAt), `by_user_unread` (userId, readAt).

**`pushSubscriptions`** — userId, endpoint, p256dh, auth, userAgent?, createdAt. Indexes: `by_user`, `by_endpoint`.

**`settings`** — a single document; fields in §10.

**`auditLog`** — entity, entityId, action, changes `{ field, from, to }[]`, by, at. Indexes: `by_entity` (entity, entityId, at), `by_at`.

### 5.6 Website content

**`faqs`** — question (up to 200 characters), answer (up to 2,000), sortOrder, onHome, isPublished. Index: `by_sort`.

**`galleryAlbums`** — name (up to 60), slug, sortOrder, isPublished. Indexes: `by_slug`, `by_sort`.

**`galleryPhotos`** — albumId, publicId, width, height, caption? (up to 200), onHome, sortOrder, isPublished, createdBy, createdAt. Indexes: `by_album_sort` (albumId, sortOrder), `by_home` (onHome, sortOrder).

**`testimonials`** — bookingId (one per booking), customerUserId, displayName (2–40 characters), eventLine? (up to 80), text (20–600), eventMonth (from the booking's start in Manila time, e.g. `2026-10`), consentAt, status `"waiting" | "published" | "hidden"`, onHome, submittedAt, updatedAt, decidedBy?, decidedAt?. Indexes: `by_booking`, `by_status_submitted` (status, submittedAt), `by_customer`, `by_home` (onHome, decidedAt).

The Home headline and photo, About, Contact details and the announcement are the `website` group of `settings` (§10).

## 6. Core rules

### 6.1 Time

- `blockEndAt = startAt + days × 24 h` and `pickupAt = blockEndAt − bufferHours`.
- **Customer bookings:** the start is on the hour between `startHourFrom` and `startHourTo` (default 8:00 AM to 5:00 PM); `startAt ≥ now + minNoticeHours`; `startAt ≤ now + maxAdvanceDays`; `1 ≤ days ≤ maxDays`.
- **Admin bookings:** any minute, no notice or advance limits; still `1 ≤ days ≤ maxDays`.
- `bufferHours` is copied onto the booking when it is created. Later setting changes never move existing bookings.

| Start | Days | Pickup | Stock free again |
|---|---|---|---|
| Oct 10, 8:00 AM | 1 | Oct 11, 6:00 AM | Oct 11, 8:00 AM |
| Oct 10, 5:00 PM | 3 | Oct 13, 3:00 PM | Oct 13, 5:00 PM |

With the default window, customer pickups always fall between 6:00 AM and 3:00 PM.

### 6.2 Availability

- **Capacity** of an item = `inService` (count items) or the number of units `in_service` (unit items). Stock in repair never counts. Capacity is today's number and is applied to every future window (conservative).
- A **hold** occupies the half-open interval `[startAt, endAt)`. If a hold is `out` and its `endAt` has passed without check-in, it occupies `[startAt, ∞)` until it is checked in.
- **Usage** of an item over a window `[s, e)` = the highest total held quantity at any instant in the window, computed by an interval sweep. At equal instants, ends are processed before starts, so back-to-back bookings do not overlap.
- **Available** = capacity − usage.
- **Needs** of a cart or booking = per item, the sum of direct lines plus package qty × component qty.
- A cart **fits** when every item's need ≤ its availability over the booking window.
- A **package's** displayed availability = the minimum over its components of ⌊available ÷ qty per package⌋.
- Holds are read by index (`by_item_end` with endAt > s, filtered to startAt < e) plus the item's overdue `out` holds (`by_item_phase`). When an existing booking is edited, its own holds are excluded from the check.

### 6.3 When stock is blocked

Requests never hold stock. Submission re-checks availability against existing holds and rejects requests that already cannot fit (`INSUFFICIENT_STOCK`).

`confirm` is a single mutation. Any failure rolls everything back:

1. Require an admin; the booking must be `requested`.
2. Record the downpayment payment, if provided (idempotent by `requestId`).
3. Recompute totals. `paid ≥ downpaymentRequired`, or fail with `DOWNPAYMENT_REQUIRED`.
4. Re-check promo usage limits, or fail with `PROMO_INVALID`.
5. Check that every needed item fits, or fail with `INSUFFICIENT_STOCK` and details.
6. Insert holds and the promo redemption, set status `confirmed`, log the event, notify the customer.

Convex runs mutations with serializable isolation (optimistic concurrency with automatic retry on conflict), so two confirmations competing for the same units cannot both pass step 5.

### 6.4 Pricing and totals

```
extra               = priceExtraDay ?? priceFirstDay
lineTotal           = qty × (priceFirstDay + extra × (days − 1))
itemsSubtotal       = Σ lineTotal
promoDiscount       = 0 if itemsSubtotal < minOrder, otherwise
                      percent: floorPeso(itemsSubtotal × pct / 100), capped at maxDiscount
                      amount:  min(value, itemsSubtotal)
manualDiscount      = percent: floorPeso((itemsSubtotal − promoDiscount) × pct / 100)
                      amount:  min(value, itemsSubtotal − promoDiscount)
charges             = Σ charges (delivery, damage, loss, late, other)
total               = itemsSubtotal − promoDiscount − manualDiscount + charges
downpaymentRequired = percent: ceilPeso(total × pct / 100)
                      amount:  min(value, total)
paid                = Σ payments − Σ refunds
balance             = total − paid        (negative = refund due)
```

- `floorPeso` and `ceilPeso` round to whole pesos.
- Discounts never reduce `charges`. Waiving a charge means editing or removing that charge.

### 6.5 Promo codes

- **Checked when applied** (by a customer at request time, or by an admin): the code exists (case-insensitive), is active, now is within `validFrom..validTo`, `itemsSubtotal ≥ minOrder`, total redemptions < `maxUses`, and this customer's redemptions < `maxUsesPerCustomer`.
- **Counted on confirmation only** (`promoRedemptions`). The use is released if the confirmed booking is cancelled.
- **At confirmation** only the usage limits are re-checked (the customer applied the code while it was valid). If a limit has been reached, confirmation fails and the admin chooses: remove the code (the new price is shown) or give a manual discount instead.
- An admin edit that drops the subtotal below `minOrder` is refused until the promo is removed. Prices never change silently.
- Promo attempts are rate-limited per account.

### 6.6 Request limits

- Per customer: at most `maxOpenRequestsPerCustomer` bookings in `requested`.
- Submissions are rate-limited to 5 per hour per account.
- Quantities are whole numbers ≥ 1 and ≤ the available amount.

### 6.7 Testimonies

- **Who can write one:** the signed-in customer who owns the booking, once its status is `returned` or `completed`. One testimony per booking. Anyone else asking about the booking gets `NOT_FOUND`; an owner whose booking has not reached Returned gets `VALIDATION`.
- **What they enter:** text (20–600 characters), a display name (2–40; defaults to the first name and last initial from the profile, e.g. "Maria S."), an optional event line (up to 80, e.g. "Birthday party in Antipolo"), and a consent tick: "Kasoundbox may show this on its website with my display name." `eventMonth` comes from the booking.
- **Status:** `waiting` on submit and after any edit by the customer. Only an admin sets `published` or `hidden`. Customers edit only while `waiting` (otherwise `INVALID_TRANSITION`). They can remove their testimony at any status, which deletes it at once; the audit log records the removal, not the text.
- **Admins select, never edit:** no admin function changes the text, display name or event line.
- **Featured:** only `published` testimonies can be on Home, at most 6 at a time. Featuring a seventh is refused (`VALIDATION`) until one is taken off.
- **Public view:** display name, event line, event month and year, text and a "Verified booking" mark. Never the booking code, full name, mobile, email or venue.
- **Limits:** at most 3 submissions per hour per account (`RATE_LIMITED`).

## 7. Booking lifecycle

```
Requested ──▶ Confirmed ──▶ Out ──▶ Returned ──▶ Completed
   │              └─▶ Cancelled  (admin; any refund recorded per policy)
   ├─▶ Declined   (admin)
   ├─▶ Cancelled  (customer or admin)
   └─▶ Expired    (start time passed, never confirmed; automatic)
```

| Transition | Who | Preconditions | Effects |
|---|---|---|---|
| submit → requested | customer (online) or admin | Profile complete (customer); time rules (§6.1); limits (§6.6); cart fits now; promo valid | Booking, lines and totals created; event logged; admins notified (online requests) |
| edit a requested booking | admin | Same validations as submit | Lines, time, venue, promo, discount, charges or "Refresh prices" updated; totals; event |
| requested → confirmed | admin | §6.3 | Holds and promo redemption created; event; customer notified |
| requested → declined | admin | Reason given | Event; customer notified |
| requested → cancelled | customer (own) or admin | — | Event; the other side notified |
| requested → expired | system | now ≥ startAt | Event; customer notified |
| edit a confirmed booking | admin | New needs and window fit (own holds excluded) | Holds replaced; totals; event |
| confirmed → cancelled | admin | Reason given | Holds and promo redemption removed; event; customer notified; any refund recorded separately |
| confirmed → out (dispatch) | admin | On or after the start date (Manila). Tracked items: exactly the booked quantity of units, each `in_service` and not already out | Holds → `out`; unit assignments; optional payment; inclusions ticks logged; customer notified |
| extend (while out) | admin | Total days ≤ maxDays; the added time fits | days, blockEndAt, pickupAt, holds and line totals updated; event |
| out → returned (check-in) | admin | Per item good + damaged + missing = quantity out; every unit has a condition | Holds deleted; assignments closed; damaged → repair and missing → written off (stock movements); suggested charges; totals; event; becomes completed if balance ≤ 0 |
| returned → completed | system or admin | balance ≤ 0 | Event |

Customers cannot edit a request; they cancel and resubmit. After confirmation, only admins change a booking. Once a booking reaches Returned or Completed, its customer can write a testimony (§6.7).

## 8. Operations

### 8.1 Daily run list (dashboard)

- Covers today and tomorrow, in time order.
- **Deliveries:** `confirmed` bookings starting that day. **Pickups:** `out` bookings whose `pickupAt` is that day.
- Each stop shows: time, Delivery or Pickup, code, customer, tap-to-call mobile, address and landmark, items to load (packages expanded), unit codes, and the balance to collect.

### 8.2 Alerts

- **Overdue:** status `out` and `pickupAt + lateGraceMinutes` has passed.
- **Short:** for each item, a sweep over future holds against today's capacity. Any interval where held > capacity lists the item, the time range, the shortfall and the bookings involved.
- **Waiting:** `requested` bookings, oldest first, flagged when they start within 48 hours.

### 8.3 Dispatch (built for phones)

Everything on the booking goes out in one dispatch. Per line (packages expanded): confirm quantities, pick unit codes (only eligible units are offered), tick inclusions, optionally record the balance payment, then confirm.

### 8.4 Check-in (built for phones; the "check and test" step)

- Per item: good / damaged / missing (default: all good). Per unit: condition. Inclusions checklist.
- Suggested charges are shown and editable:
  - **Missing:** replacement cost × quantity.
  - **Damaged:** the admin enters the amount (replacement cost shown for reference).
  - **Late:** if checked in after `pickupAt + lateGraceMinutes`: extra-day price × quantity × started 24-hour periods late.

### 8.5 Inventory actions

Every action writes a `stockMovements` row. A reason is required for write-offs and corrections.

| Action | Count item | Unit item |
|---|---|---|
| Add stock | inService += n | New unit(s) with codes |
| Send to repair | inService −= n, inRepair += n | Unit → `in_repair` |
| Back from repair | inRepair −= n, inService += n | Unit → `in_service` |
| Write off | inService −= n (or inRepair −= n) | Unit → `retired` with reason (not while out) |
| Count correction | inService set to the counted value | — |

An action that leaves confirmed bookings short is still saved (it already happened in real life) and immediately raises the Short alert.

## 9. Screens

Every screen handles loading (skeleton), empty, error, success, partial/degraded and unauthorized states; is keyboard navigable; meets WCAG AA contrast; is responsive; and is dark-mode compatible. The visual style and every screen are designed before the build, from the design brief (`docs/design/kasoundbox-design-brief.md`).

### 9.1 Public website (phone-first)

| Screen | Route | Contents |
|---|---|---|
| Home | `/` | Announcement banner (when on); hero photo, headline and Reserve; what we rent (categories with "from ₱…" prices); featured packages; how it works (fixed: pick date and items → send request → pay the downpayment → we deliver and pick up); gallery preview; featured testimonies; service areas and contact; top FAQs |
| Rentals | `/rentals` | "When is your event?" bar (date, start time 8 AM–5 PM, days); category tabs; item and package cards with photo, prices, "Up to N available" and Add |
| Item / package | `/items/[slug]`, `/packages/[slug]` | Photo gallery, description, inclusions, prices, availability for the chosen time, Add. Packages list their contents. |
| Reserve | `/reserve` | Four steps. **When:** date, start time, days; delivery and pickup times shown. **What:** only what is free then, with quantities (the cart). **Where:** venue address, landmark, notes. **Review & send:** lines, promo code, price breakdown with the downpayment due, name and mobile from the profile; sign-in here if needed (cart kept). |
| Request sent | `/reserve/sent/[code]` | Booking code; next steps (review → pay the downpayment → you'll be notified); "Allow notifications" prompt with iPhone Home Screen instructions |
| Gallery | `/gallery`, `/gallery/[album]` | Albums; photo grid; tap a photo to enlarge it with its caption |
| Testimonies | `/testimonies` | Published testimonies, newest first, each with a Verified booking mark; "Share yours" for signed-in customers who qualify |
| Promos | `/promos` | Promos marked "show on website" that are on and in date (code, what it gives, minimum, valid until, note) and the announcement |
| About · FAQ · Contact | `/about`, `/faq`, `/contact` | Story and photo; questions and answers; tap-to-call phones, Facebook and Messenger links, service areas, hours |
| My Reservations | `/account/reservations`, `/account/reservations/[code]` | List with status labels. Detail: timeline, items, times, payments, balance, payment instructions; Cancel while Requested; on Returned or Completed bookings, "Share a testimony" (edit while waiting, remove any time). |
| Notifications | Header bell, `/notifications` | Unread count, list, and a pop-up for each new notification |
| Account | `/account` | Name, mobile, notifications on or off per device |
| Sign-in & welcome | `/sign-in`, `/forgot-password`, `/welcome` | Google or email + password, email code, reset by code, one-time profile and privacy consent |
| Legal | `/terms`, `/privacy` | Text from Settings |

**Navigation.** The header carries the logo, Home · Rentals · Gallery · Testimonies · Promos · About · FAQ · Contact (a menu on phones), the bell and the account menu. **Reserve** sits in the header on computers and is pinned to the bottom of the screen on phones, with the cart count ("Reserve (3)"). Testimonies and Promos leave the menu and Home while they have nothing to show. The footer carries the business name, service areas, phones, Facebook, Terms and Privacy.

### 9.2 Admin panel (desktop and phone)

| Screen | Route | Contents |
|---|---|---|
| Dashboard | `/admin` | Run list (today and tomorrow); Overdue, Short and Waiting alerts; quick availability checker |
| Bookings | `/admin/bookings`, `/admin/bookings/new` | Filter by status and dates; search by code, name or mobile; New booking for walk-in, phone and Messenger customers |
| Booking detail | `/admin/bookings/[code]` | Lines with live availability, charges, promo, manual discount, payments, balance, timeline. Actions by status: Confirm, Record payment, Dispatch, Extend, Check-in, Cancel, Decline, Refresh prices. |
| Print slip | `/admin/bookings/[code]/print` | Delivery receipt: items (packages expanded), unit codes, inclusions, times, amounts and signature lines. Not a BIR official receipt. |
| Calendar | `/admin/calendar` | Month and week views from start to pickup, colored by status, filterable by item |
| Catalog | `/admin/catalog` | Categories; items (form, Cloudinary upload, units); packages (components and quantities, show on Home) |
| Inventory | `/admin/inventory`, `/admin/inventory/[itemId]` | Per item: in service, in repair, out now, next 7 days; actions; movement history; unit history |
| Promo codes | `/admin/promos` | Create, edit, switch on or off, show on website with a public note, see redemptions |
| Customers | `/admin/customers` | Accounts with booking history; search all bookings by mobile or name (for walk-ins) |
| Reports | `/admin/reports` | See §9.3 |
| Website | `/admin/website`, `/admin/website/faq`, `/admin/website/gallery`, `/admin/website/testimonies` | **Pages:** Home headline, subheadline and photo; About text and photo; Contact hours, Messenger link and service areas; announcement (text, link, on or off, dates). **FAQ:** add, edit, reorder, hide, show on Home. **Gallery:** albums; upload several photos at once; captions; move between albums; reorder; show on Home; hide or delete. **Testimonies:** Waiting, Published and Hidden tabs; publish, hide, show on Home (up to 6); link to the booking. |
| Settings | `/admin/settings`, `/admin/activity` | Everything in §10; the activity log |

### 9.3 Reports

- **Collected per month:** payments − refunds by `receivedAt` (Manila month).
- **Unpaid balances:** bookings with balance > 0 (confirmed, out or returned).
- **Top items:** Σ qty × days per item (packages expanded) for bookings starting in the range.
- **Utilization:** held unit-hours ÷ (current capacity × hours in the range), per item.
- **Discounts given:** promo + manual discounts per month; redemptions per promo code.

## 10. Settings (all editable in the admin panel)

| Group | Setting | Default | Validation |
|---|---|---|---|
| Business | Name, phone numbers, email, address, Facebook page | — | Name and at least one phone required |
| Booking | Customer start window | 8:00 AM – 5:00 PM | Whole hours; from < to |
| | Buffer (pickup → next start) | 2 hours | 0–12 hours |
| | Minimum notice | 24 hours | 0–168 hours |
| | Book up to | 365 days ahead | 1–730 days |
| | Maximum days per booking | 30 | 1–90 |
| | Maximum open requests per customer | 3 | 1–10 |
| | Late grace | 60 minutes | 0–240 minutes |
| Payments | Downpayment | 50% | Percent 0–100, or a fixed amount ≥ 0 |
| | Payment methods | Cash, GCash, Bank transfer | At least one |
| | Payment instructions (shown to customers) | — | Up to 2,000 characters |
| | Cancellation & refund policy | — | Up to 5,000 characters |
| Notifications | On or off per event (§4.6, ten events) | All on | — |
| Legal | Terms, privacy policy | — | Up to 20,000 characters each |
| Website (edited on Website › Pages) | Home headline and subheadline | "Party needs, delivered." · "Tents, tables, chairs and videoke for your event. We deliver and pick up." | Headline 1–80 characters; subheadline up to 160 |
| | Home photo, About photo | None | A photo uploaded through Cloudinary (jpg, png or webp) |
| | About text | — | Up to 5,000 characters |
| | Contact: hours, Messenger link, service areas | — | Hours up to 200 characters; Messenger link starts with `https://m.me/`; up to 30 areas of up to 60 characters |
| | Announcement | Off | Text up to 200 characters; link is a site path (e.g. `/promos`) or an `https://` link; optional start and end dates |

- Catalog data (categories, items, units, packages, prices), promo codes, manual discounts, FAQ, gallery and testimonies are managed on their own screens.
- Every change is written to `auditLog` (who, when, old → new).
- Changes apply to new bookings. Existing bookings keep their snapshots (prices, buffer, promo terms) unless an admin uses "Refresh prices" on a pending request.
- **Not editable in the panel:** API keys and secrets (Convex env), who is an admin (Convex dashboard), timezone (Asia/Manila), currency (₱).

## 11. Security and privacy

- **Authorize every call.** `requireAdmin` or `requireCustomer` runs at the top of every function; the absence of a role is never a grant. Customers can only read or cancel their own bookings. Public queries return catalog data and availability numbers only.
- **Validate at the boundary.** Convex argument validators plus `lib/validation.ts` (time rules, quantities, mobile format, text limits) on every function.
- **Rate limits.** Request submission (5 per hour per account), promo attempts (10 per minute per account), sign-in attempts (Convex Auth limits; verify during the build).
- **Secrets** live only in Convex and hosting environment variables — never in code, logs or the database. No personal data in logs or push payloads.
- **Plain-text rendering.** Admin-entered text (policies, instructions, descriptions) is rendered as plain text, never HTML, so it cannot inject scripts.
- **Uploads.** Cloudinary uploads are signed per request and only for admins.
- **Data Privacy Act (RA 10173).** Consent captured at profile completion (`consentAt`), a privacy policy page, and minimal data (name, mobile, email, venue). Account deletion is handled manually on request in v1.
- **Audit trail.** `bookingEvents`, `stockMovements`, `auditLog`, and `payments.recordedBy`.
- **No existence leaks.** A customer asking for someone else's booking gets `NOT_FOUND`, not `FORBIDDEN`.
- **Testimonies.** Only the booking's owner can write, edit or remove its testimony, and only once the booking reached Returned or Completed (checked on the server). Text is shown as plain text. Consent is recorded; removal deletes it at once. Submissions are rate-limited (3 per hour per account).
- **Public website data.** Public queries return only published FAQs, visible gallery photos, published testimonies (public fields only), promos marked for the website, and the website settings. Announcement links must be a site path or `https://`.

## 12. Edge cases

1. **Race for the last units.** Two confirmations compete; one wins, the other fails with `INSUFFICIENT_STOCK` and saves nothing (including its payment).
2. **Stock gone between request and confirmation.** Confirmation is blocked with per-item details; the admin edits (quantity, time, item) or declines.
3. **Impossible request at submission.** Rejected immediately with details.
4. **Capacity drops after confirmation** (repair, loss, late return). The Short alert lists the affected bookings. The system never cancels on its own.
5. **Price, package or promo edits after a request.** Bookings keep their snapshots; "Refresh prices" is explicit.
6. **Back-to-back bookings.** A ends at Oct 11 8:00 AM and B starts at Oct 11 8:00 AM: allowed (half-open intervals).
7. **Unit rules.** A unit in repair or already out cannot be dispatched; a unit cannot be retired while out; unit codes are unique per item.
8. **Hiding an item.** New requests stop, and packages containing it are hidden. Existing bookings are unaffected. Nothing is deleted.
9. **Tracking mode** is fixed once an item has stock or bookings.
10. **Late pickup.** Stock stays blocked until check-in; Overdue and Short alerts appear.
11. **Rounding.** Percentage discounts round down to the peso; percentage downpayments round up.
12. **Overpayment.** Shown as "Refund due ₱X".
13. **Double-click or double-submit.** `requestId` idempotency prevents duplicate bookings and payments.
14. **Setting changes.** Apply to new bookings only.
15. **Promo minimum broken by an edit.** The edit is refused until the promo is removed.
16. **Deactivated item in a pending request.** The admin may still confirm (the stock exists); customers cannot add it anew.
17. **Start time passes while still requested.** Expired by the 15-minute job.
18. **Check-in counts must add up.** good + damaged + missing = quantity out.
19. **Timezone.** All wall-clock handling is Manila time (no daylight saving).
20. **Testimony before the event.** Refused: only Returned or Completed bookings qualify.
21. **A featured testimony is removed** (by its customer, or hidden by an admin). It leaves Home and Testimonies at once.
22. **A featured gallery photo is deleted.** It leaves Home at once, and its Cloudinary file is deleted.
23. **Announcement dates.** Outside its start and end dates the announcement doesn't show; nobody has to switch it off.
24. **Nothing to show.** Testimonies and Promos leave the menu and Home; gallery albums without visible photos are hidden.
25. **Account deletion** (manual, on request) removes the customer's testimonies too.

## 13. Testing

### 13.1 Strategy

- **Business rules (`convex/lib/`) with Vitest, written before the code.** Availability, pricing, money, time and lifecycle rules are guarded paths: failing test first, security review and an independent review before merge.
- **Server functions with `convex-test`.** Confirm (all-or-nothing), permissions (visitor, customer, other customer, admin), check-in effects, sequential races for the last unit.
- **End-to-end with Playwright** (a few flows): request → confirm → dispatch → check-in → completed, including the notification; one conflict flow; testimony submit → publish → shown on the website.
- **Definition of done for the reservation engine:** every scenario in §13.2 passes.

### 13.2 Acceptance scenarios

**Time** (buffer 2 h, window 8–17)

| # | Case | Expected |
|---|---|---|
| T1 | Start Oct 10 8:00 AM, 1 day | Pickup Oct 11 6:00 AM; block ends Oct 11 8:00 AM |
| T2 | Start Oct 10 5:00 PM, 3 days | Pickup Oct 13 3:00 PM; block ends Oct 13 5:00 PM |
| T3 | Customer picks 7:00 AM | `VALIDATION` (outside the window) |
| T4 | Customer picks 8:30 AM | `VALIDATION` (not on the hour) |
| T5 | Admin sets 6:30 AM | Allowed; pickup next day 4:30 AM |
| T6 | Customer starts less than 24 h from now | `VALIDATION` |
| T7 | Buffer changed from 2 h to 3 h after a booking exists | That booking's pickup is unchanged |
| T8 | Manila "2026-10-10 08:00" | Stored as `2026-10-10T00:00:00Z` |

**Availability — unit item** (1 videoke; existing A = Oct 10 8:00 AM, 1 day, blocked until Oct 11 8:00 AM)

| # | Request or event | Expected |
|---|---|---|
| A1 | Oct 11 8:00 AM, 1 day | Available (back-to-back) |
| A2 | Oct 10 2:00 PM, 1 day | Unavailable |
| A3 | Oct 9 9:00 AM, 1 day (blocks until Oct 10 9:00 AM) | Unavailable (overlaps 8:00–9:00) |
| A4 | Oct 9 8:00 AM, 1 day (blocks until Oct 10 8:00 AM) | Available (ends exactly when A starts) |
| A5 | A is out; now Oct 11 9:00 AM (block ended 8:00 AM); not checked in; request Oct 12 8:00 AM | Unavailable until A is checked in |
| A6 | A checked in Oct 11 6:30 AM; request Oct 11 8:00 AM | Available |
| A7 | The only unit goes to repair | Capacity 0; everything unavailable; confirmed future bookings raise Short |

**Availability — count item** (chairs, capacity 100)

| # | Existing holds | Request or event | Expected |
|---|---|---|---|
| C1 | A: 60 chairs Oct 10 8:00 AM, 1 day; B: 30 chairs Oct 10 2:00 PM, 1 day | 20 chairs Oct 10 12:00 PM, 1 day | `INSUFFICIENT_STOCK`: need 20, available 10 (tightest Oct 10 2:00 PM – Oct 11 8:00 AM) |
| C2 | Same as C1 | 40 chairs Oct 11 8:00 AM, 1 day | Fits (only B remains until 2:00 PM; available 70) |
| C3 | 60 chairs held over the window | Package P (1 tent + 5 tables + 50 chairs) + 20 extra chairs | `INSUFFICIENT_STOCK` for chairs: need 70, available 40 |
| C4 | 95 chairs confirmed on Oct 10 | Admin sends 10 chairs to repair (capacity 90) | Action saved; Short alert: chairs over by 5 on Oct 10, bookings listed |
| C5 | 10 chairs free | Confirm X (10 chairs), then confirm Y (10 chairs) | X confirmed; Y fails `INSUFFICIENT_STOCK`; nothing from Y saved, including its payment |

**Pricing** (downpayment 50% unless stated)

| # | Case | Expected |
|---|---|---|
| P1 | 50 chairs at ₱10 1st day / ₱5 extra, 3 days | ₱1,000 |
| P2 | Videoke ₱1,200 1st day, extra blank, 2 days | ₱2,400 |
| P3 | Subtotal ₱3,400; promo 10% (max ₱300); manual ₱100; delivery ₱200 | Promo ₱300; items ₱3,000; total ₱3,200; downpayment ₱1,600 |
| P4 | Subtotal ₱1,995; promo 15% | Promo ₱299 (₱299.25 rounded down) |
| P5 | Total ₱3,201 | Downpayment ₱1,601 (₱1,600.50 rounded up) |
| P6 | Promo minimum ₱3,000; subtotal ₱2,999 | `PROMO_INVALID` |
| P7 | Items ₱3,000; manual discount ₱5,000; delivery ₱200 | Manual capped at ₱3,000; total ₱200 |
| P8 | Subtotal ₱2,000; promo ₱200 (amount); manual 10% | Manual ₱180; total ₱1,620 |

**Lifecycle and permissions**

- Every allowed transition in §7 succeeds. Forbidden ones (e.g., requested → out, out → confirmed, anything from completed, a customer confirming, a customer cancelling a confirmed booking) fail with `INVALID_TRANSITION` or `FORBIDDEN`.
- For every function group: a visitor gets `UNAUTHENTICATED` (except public reads); a customer gets `FORBIDDEN` on admin functions; customer B asking for customer A's booking gets `NOT_FOUND`; an admin succeeds.

**Testimonies** (booking K is Maria's and Completed)

| # | Case | Expected |
|---|---|---|
| W1 | Maria writes a testimony for K | Saved as Waiting; admins notified |
| W2 | Maria writes one for a booking that is still Confirmed | `VALIDATION` |
| W3 | Maria writes a second one for K | `VALIDATION` (one per booking) |
| W4 | Customer B writes one for K | `NOT_FOUND` |
| W5 | An admin publishes it | Shows on Testimonies with "Maria S.", the event line and "Oct 2026"; never the code, full name or mobile; Maria notified |
| W6 | Maria edits it after it is published | `INVALID_TRANSITION` (edit only while Waiting) |
| W7 | Maria removes it while it is featured | Gone from Home and Testimonies at once |
| W8 | A 4th submission within an hour | `RATE_LIMITED` |
| W9 | An admin features a 7th testimony | `VALIDATION` (at most 6 on Home) |

## 14. Decision engine

### 14.1 Stack

Scores are 1–5 (higher is better).

| Criterion | A. Next.js + Convex | B. Next.js + Supabase | C. Next.js + Prisma + Postgres |
|---|---|---|---|
| Security | 4 — explicit role checks in every function, testable; no SQL surface | 3 — row-level security is powerful but easy to misconfigure; stock logic in SQL functions | 4 — server-only database access; standard libraries |
| Maintainability | 4 — TypeScript end to end, one platform | 3 — split between TypeScript and SQL functions | 4 — familiar and portable |
| Performance | 4 — reactive queries; small data | 4 | 4 |
| Scalability | 4 — far beyond this business's needs | 4 | 4 |
| Developer experience | 5 — reuses Decssy patterns; realtime, scheduler and storage built in | 3 | 3 — more wiring |
| Operational complexity | 5 — fully managed, no database operations | 4 — managed; free tier pauses idle projects | 3 — database host, auth, uploads and cron to wire and run |
| Long-term cost | 4 — low tier likely sufficient (verify) | 3 — paid tier recommended | 3 — depends on the chosen hosts |
| **Total** | **30** | **24** | **25** |

**Recommendation: A (Next.js + Convex).** Its serializable mutations make the no-overbooking guarantee the default rather than something to hand-build, and it reuses the Decssy stack.

**Evidence that would change the pick (switch to C):**
- the business needs direct SQL access for an accountant or BI tool;
- Convex pricing or limits at expected volume exceed the budget;
- a future maintainer without Convex experience must take over;
- real traffic shows persistent optimistic-concurrency retry storms (not expected with two admins).

### 14.2 Reservation engine

| Option | Verdict |
|---|---|
| **Interval holds + sweep (chosen)** | Exact to the minute; one code path for count and unit items; no counters to keep in sync. |
| Per-hour usage counters per item | Rounds times to slots and needs many counter rows per day kept in sync with every change — a second source of truth. |
| Assign specific units at booking time for every item | Forces unit records for bulk items (200 chairs = 200 rows) and complicates swaps. |

Evidence that would change it: thousands of overlapping holds per item per window (not expected). Then add materialized counters as a cache, checked against the sweep.

### 14.3 Website

| Option | Verdict |
|---|---|
| **Built into the app, managed in the admin panel (chosen)** | One login and one look; pages read the same data as bookings (prices, packages, promos); follows D17 |
| A separate site builder (Wix, Framer) linking to the app | Fast to start, but two places to update, two bills and two looks; prices on the site drift from the real ones |
| Pages written into the code | Cheapest to build, but every text or photo change needs a developer, which breaks D17 |

Evidence that would change it: the owners want to redesign page layouts themselves, not just text and photos. Then use a site builder for the marketing pages only, linking to Rentals and Reserve.

## 15. Out of scope for v1

- Online payments (a payment gateway); admins record payments manually.
- SMS and email notifications (email is used only for sign-in codes).
- Facebook login.
- Security deposits; delivery zones and automatic delivery fees.
- Sale prices and automatic discount rules.
- Multiple branches or warehouses.
- Partial returns (everything comes back in one check-in; items found later are re-added with a count correction).
- Customers editing a request (they cancel and resubmit).
- Self-service account deletion (handled manually on request).
- BIR official receipts or invoices (the print slip is a delivery receipt only).
- Star ratings, photos in testimonies, replies to testimonies; loyalty points; a blog; live chat; Tagalog translation.

## 16. Launch inputs (supplied by the business; defaults exist)

- **Catalog:** items, photos, prices, replacement costs, stock counts, unit codes and packages, entered through the admin panel.
- **Texts:** payment instructions (GCash number, bank details), cancellation and refund policy, terms and privacy policy.
- **Website:** home headline and photo, About text and photo, FAQ answers, gallery albums and photos, service areas, hours, Messenger link.
- **Accounts and hosting:** domain name; Next.js host (Vercel Pro or an alternative that allows commercial use); Convex plan (check current free-tier limits against expected use); Resend sender domain; Cloudinary folder.
- **Defaults to review:** everything in §10, especially the 50% downpayment.

## 17. Build order

One system, built in milestones so each one ends in something usable and tested. The implementation plan expands these.

1. **Foundation.** Repo from the Decssy baseline, Convex, auth (customer and admin), settings, audit log.
2. **Catalog.** Categories, items, units, packages (with "show on Home"), Cloudinary uploads; the public Rentals pages.
3. **Website.** Home, About, FAQ, Contact, Gallery and the announcement banner; the admin Website screens (Pages, FAQ, Gallery); page titles, share images, sitemap. Until milestone 5, Reserve opens Rentals.
4. **Reservation engine.** `lib/` rules, test-first: time, availability, pricing (promo math included).
5. **Booking flow.** The four-step Reserve flow, submit, admin review, record payment and confirm, My Reservations.
6. **Operations.** Run list, dispatch, check-in, inventory actions, alerts. Bookings first reach Returned and Completed here.
7. **Notifications.** In-app, web push, installable web app, including the two testimony events.
8. **Testimonies.** Customer submit, edit and remove; admin Waiting, Published and Hidden; Verified booking mark; Home and the Testimonies page.
9. **Business tools.** Promo code screens (with "show on website") and the Promos page, manual discounts, calendar, reports, print slip.
10. **Hardening and launch.** End-to-end tests, security review, launch inputs (§16, website content included), deploy.
