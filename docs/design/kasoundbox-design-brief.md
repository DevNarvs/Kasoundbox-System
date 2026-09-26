# Kasoundbox — Design Brief

**For designing every screen in Claude Design before the build.**
Version 1.1 · 2026-09-26 · Owner: Marvin (DevNarvs)

The rules of the system live in the spec: `docs/superpowers/specs/2026-09-26-kasoundbox-rental-reservation-design.md`. This brief restates everything a designer needs. If the two ever disagree, the spec wins; tell Marvin so one of them gets fixed.

---

## 0. How to use this brief

1. Pick a look in §2 (A, B or C) and write it into the starter prompt below.
2. In Claude Design, attach this file and paste the starter prompt.
3. Ask for the screens in the batches of §12, one batch per prompt. Review each batch before asking for the next.
4. When a batch is right, note any change to rules or wording here, so the build follows the design.

### Starter prompt (copy and paste)

> Design the UI for **Kasoundbox**, a family-run party-needs rental business in the Philippines (tents, tables, chairs, videoke). The attached brief describes the business, the people using it, the rules and every screen.
>
> - Use visual direction **[A · Fiesta / B · Calm Pro / C · Videoke Night]** from §2 of the brief.
> - Customer screens are phone-first: design each at 390 wide (taller than 844 when the page scrolls; don't clip). Website pages (Home, Rentals, Gallery, Testimonies, Promos, About, FAQ, Contact) also get a 1440-wide desktop version.
> - Admin screens are desktop-first at 1440 wide. Dashboard, Booking detail, Dispatch and Check-in also get phone versions.
> - Follow the global rules in §3 of the brief: accessibility, peso and time formats, and the six states every screen must show.
> - Use only the sample data in §11. Where a real fact is missing, show a visible placeholder like [YOUR SERVICE AREAS]. Don't invent prices, reviews, services or claims.
> - Don't draw fake phone status bars or keyboards.
> - Start with a one-page style guide (colors, type, buttons, inputs, status chips, cards), then the customer Home page on phone and desktop.

---

## 1. The business and the people using it

Kasoundbox rents out party needs: tents, tables, chairs and videoke sets, with more kinds of items to come. Customers rent them for birthdays, weddings, christenings, fiestas and company events. **Kasoundbox always delivers and picks up.** Today, bookings happen over Facebook Messenger and in a notebook. This system gives the business:

- a **website** where anyone can see what's for rent, prices, photos, testimonies and answers, with a **Reserve** button everywhere;
- **online reservation requests** that an admin confirms once the downpayment is paid;
- an **inventory** that never lets two confirmed bookings need the same chair at the same time;
- an **admin panel** where every item, price, rule and piece of website text or photo can be changed without a developer.

**Where and how:** the Philippines. Prices in pesos (₱). All times are Manila time.

| Who | Where they are | What they need |
|---|---|---|
| **Customers** | Mostly on phones, arriving from Facebook. Many are not tech-savvy. | What can I rent, how much, is it free on my date, how do I book, how do I pay. |
| **Admins** (two people: Marvin, the owner, and his dad) | A laptop at home; phones on delivery days | Today's deliveries and pickups, requests to review, stock problems, prices and settings. **The dad must be able to use every admin screen without training:** plain words, big targets, no jargon. |
| **Delivery crew** (the admins themselves) | At the venue, on a phone, often outdoors in daylight | Load the right items, record what went out and what came back, collect the balance. |

**Success looks like:** no overbooking; the admins see exactly what goes out and comes back each day; customers find prices, availability, photos and answers without messaging; everything changes without code.

---

## 2. Visual direction (pick one)

Three directions are drawn side by side on a design canvas: https://claude.ai/artifact/582rftLHLfmGRc3AkdKCP6 (private until shared from its Share menu). Each shows the same two screens: the phone catalog and the admin dashboard.

### A · Fiesta (recommended)

- **Feel:** warm, festive, friendly. A Filipino party business. Its signature is a thin *banderitas* (bunting) strip of small triangles across the top of the website header, used sparingly.
- **Type:** **Bricolage Grotesque** for headings (weights 600–800) and **Figtree** for text, prices and controls (400–700). Prices use tabular numbers.
- **Colors:**

| Name | Hex | Use |
|---|---|---|
| Paper | `#FAF6F0` | page background |
| White | `#FFFFFF` | cards, inputs |
| Sand | `#F3EDE4` | subtle fills, photo placeholders |
| Line | `#E6DDD0` | borders |
| Ink | `#1F1B16` | main text |
| Ink 2 | `#5C5348` | secondary text |
| **Fiesta** | `#C8401F` | primary buttons and links (white text on it passes AA) |
| Mango | `#F2B233` | highlights and badges (dark text on it) |
| Night | `#25224A` | admin sidebar |
| Teal | `#1E8A7E` | one of the bunting colors |

- **Shape:** cards 16–20 px radius, buttons 12 px, chips fully rounded; soft shadows.
- **Admin:** Night sidebar with white text; Paper content area.

### B · Calm Pro

- **Feel:** cool, precise, data-first. Looks like serious booking software.
- **Type:** **IBM Plex Sans** for all text; **IBM Plex Mono** for booking codes, prices and times.
- **Colors:** Mist `#F5F7F8` (page), White `#FFFFFF`, Line `#DDE3E6`, input border `#C9D2D8`, Ink `#12202A`, Slate `#4A5A66` (secondary), **Teal** `#0F6B63` (primary, white text), soft teal `#DDF0EE`.
- **Shape:** 8–10 px radius, crisp 1 px borders, underline tabs, table-style lists.
- **Admin:** white sidebar with a tinted active item.

### C · Videoke Night

- **Feel:** a dark "stage" with a neon accent and bold, wide headings. The most party-like.
- **Type:** **Unbounded** for headings and **Albert Sans** for text.
- **Colors:** Stage `#13111F` (page), Panel `#1D1A2E` (cards), Raised `#26223A`, Line `#332E4A`, Light `#F4F1FA` (text), Muted `#BDB6D0`, **Neon** `#FF4F8B` (primary; use dark text `#13111F` on it), Go `#7FE3B5` (available).
- **Shape:** 20–22 px radius; a soft glow around selected cards.
- **Watch out:** dispatch and check-in happen outdoors, so this direction needs a light mode for daylight.

### For every direction

- **Logo:** none yet. Use the wordmark "Kasoundbox" and a [LOGO] placeholder where a mark would sit. If a logo arrives, take the colors from it.
- **Status colors** keep the same meaning in every direction and always come with words, never color alone:

| Status (admin word) | Customer word | Meaning | Chip background / text (A and B) |
|---|---|---|---|
| Requested | Waiting for review | Sent; an admin hasn't confirmed it yet | `#FDF0D2` / `#6E4400` |
| Confirmed | Confirmed | Downpayment paid; the items are reserved | `#DCEBFB` / `#0B4A8B` |
| Out | Delivered | The items are with the customer | `#ECE6FB` / `#4B2FA0` |
| Returned | Picked up | Back and checked; balance may still be due | `#D8F1EC` / `#0D5C52` |
| Completed | Completed | Back and fully paid | `#DDF3E0` / `#1D6B2F` |
| Declined · Cancelled · Expired | same words | Ended without a rental | `#ECE8E3` / `#5C5348` |

- **Admin alert colors:** Overdue red (`#FCE3DE` / `#8F2410`), Short orange (`#FFE7CF` / `#7A3300`), Waiting amber (`#FDF0D2` / `#6E4400`). Direction C uses dark-tinted versions of the same hues.

---

## 3. Global rules for every screen

### Layout and sizes

- Phone-first. Phone 390 wide, tablet 768, desktop 1280–1440.
- Touch targets at least 44 × 44 px. Main buttons on phones are 48 px tall.
- One main action per customer screen (Reserve, Continue, Send request…).

### Accessibility (WCAG 2.2 AA)

- Text contrast at least 4.5:1 (3:1 for text 24 px and larger). Watch caption greys and white text on colored buttons.
- Real controls: buttons, links, and inputs with visible labels. Icon-only buttons get a label for screen readers.
- Colors that must be told apart also differ in lightness. Statuses always show words.
- Everything works with a keyboard, with a visible focus ring.
- Every screen works in dark mode (directions A and B need a dark palette too).

### The six states: every screen shows what happens when…

1. **Loading:** skeleton placeholders in the shape of the content.
2. **Empty:** one line saying what will appear here and the single action to take ("No reservations yet." + Reserve).
3. **Error:** a plain message and **Try again**. Forms keep what was typed; field errors sit under each field.
4. **Success:** a short pop-up (toast), e.g. "Request sent." / "Saved."
5. **Partial:** e.g. a photo fails to load (placeholder with the item name), or the phone is offline (banner: "You're offline. We'll retry when you're back.").
6. **Not allowed:** signed-out visitors see "Sign in to …"; a customer opening the admin panel sees "This area is for Kasoundbox admins."

### Formats

- **Money:** `₱1,234`; centavos only when not zero: `₱1,234.50`. A negative balance reads "Refund due ₱300".
- **Item prices:** "₱1,500 first day · ₱1,000 each extra day". When the extra day costs the same: "₱1,200 per day".
- **Dates and times (Manila):** "Sat, Oct 10 · 8:00 AM"; add the year when it isn't this year. Ranges: "Sat, Oct 10 · 8:00 AM → Sun, Oct 11 · 6:00 AM".
- **Booking codes:** `KSB-7Q4M2P` (KSB- plus 6 characters, never 0, O, 1, I or L). Show them in a monospace or tabular style so they're easy to read over the phone.
- **Mobile numbers:** "0917 555 0101", tap to call.

### Words and content

- Plain, friendly English in short sentences. Every admin label must make sense to the dad. No emoji; line icons only.
- Text the admins type (policies, payment instructions, FAQ, About) and customers' testimonies are shown as plain text with line breaks. No bold or links inside them.
- Photos come from uploads. In mockups, use neutral placeholders that name the subject ("Photo: 20×20 ft tent").
- Don't claim services the business hasn't confirmed. Say "We deliver and pick up", never "we set up", until confirmed: [CONFIRM: do you set up tents?].

---

## 4. Rules the screens must explain

### The 22-hour day

- A booking = **start date + start time + number of days**.
- Each day = **22 hours with the customer + 2 hours** for the crew to pick up, check and test before the next customer.
- **Pickup = start + days × 24 hours − 2 hours.** Start Sat Oct 10 at 8:00 AM for 1 day → pickup Sun Oct 11 at 6:00 AM. Start at 5:00 PM for 3 days → pickup on day 3 at 3:00 PM.
- Customers choose a start **on the hour from 8:00 AM to 5:00 PM**, at least **24 hours ahead**, up to **365 days ahead**, for **1 to 30 days**. All of these are adjustable in Settings. Admins can set any time.
- Wherever a customer picks a time, show **both the delivery and the pickup time**.

### Requests, confirmation and payment

- A **request holds no stock**. It becomes a **confirmed booking** only when recorded payments cover the **downpayment**: by default **50% of the total, rounded up to the peso** (or a fixed amount, set in Settings).
- Customers pay outside the app (cash, GCash or bank transfer) using the payment instructions from Settings. An admin records the payment. **No online checkout in version 1.**
- A request **expires** by itself if its start time passes before it is confirmed.
- Customers can **cancel while Requested**. After confirmation, only admins change a booking; the customer messages or calls.
- A customer can have at most **3 requests waiting** at once.

### Availability

- Shown for the chosen date, time and days: "Up to 12 available". Before a date is chosen: "Pick a date to see availability".
- A package is available when all its parts are.
- When stock is tight: "Only 10 available for your time"; the quantity picker stops at that number.

### Prices

- **Line total = quantity × (first-day price + extra-day price × (days − 1)).**
- **One promo code** per booking: a percent (with an optional maximum) or a fixed amount, sometimes with a minimum order. Admins can also give a **manual discount**.
- An admin adds the **delivery charge**, and at check-in any **damage, loss and late** charges. Discounts never reduce charges.
- The total, the downpayment and the balance are always visible. An overpayment shows "Refund due".

### Daily operations (admin)

- **Run list** for today and tomorrow: **deliveries** (confirmed bookings starting that day) and **pickups** (bookings out, with pickup that day).
- **Alerts:**
  - **Overdue:** pickup time plus the 60-minute grace has passed, and the booking isn't checked in.
  - **Short:** future confirmed bookings need more of an item than is in service, e.g. after chairs go to repair.
  - **Waiting:** requests to review, oldest first, flagged when they start within 48 hours.
- **Dispatch:** everything goes out at once. Tracked items (videoke) need their unit codes (VK-02). Inclusions get ticked (microphones, song book). The balance can be collected.
- **Check-in:** each item is counted good, damaged or missing. Suggested charges:
  - missing = replacement cost × quantity;
  - damaged = an amount the admin types;
  - late = extra-day price × quantity × each started 24 hours late.

### Notifications

- An in-app bell with an unread count, pop-ups while the site is open, and phone push. On iPhone, push works only after "Add to Home Screen".
- The ten events (each switchable in Settings):
  - request submitted (admins);
  - request cancelled by the customer (admins);
  - booking confirmed (customer);
  - request declined (customer);
  - booking cancelled by an admin (customer);
  - request expired (customer);
  - payment recorded (customer);
  - out for delivery (customer);
  - testimony submitted (admins);
  - testimony published (customer).

### Testimonies

- Only a signed-in customer can write one, for **their own booking that reached Picked up (Returned) or Completed**. One per booking, with a required consent tick.
- Admins **publish, hide or feature** them (at most 6 on Home) and **never edit the words**.
- The public sees the display name ("Maria S."), an optional event line, the month and year, the text and a **Verified booking** mark. Never the booking code, full name, mobile or address.
- Customers can edit while it's waiting and remove it at any time.

---

## 5. Sitemap and navigation

### Customer website

| Page | Route |
|---|---|
| Home | `/` |
| Rentals (catalog and prices) | `/rentals` |
| Item · Package | `/items/[slug]` · `/packages/[slug]` |
| Reserve (4 steps) | `/reserve` |
| Request sent | `/reserve/sent/[code]` |
| Gallery · Album | `/gallery` · `/gallery/[album]` |
| Testimonies | `/testimonies` |
| Promos | `/promos` |
| About · FAQ · Contact | `/about` · `/faq` · `/contact` |
| Terms · Privacy | `/terms` · `/privacy` |
| Sign in · Forgot password · Welcome | `/sign-in` · `/forgot-password` · `/welcome` |
| My account · My reservations · Reservation | `/account` · `/account/reservations` · `/account/reservations/[code]` |
| Notifications | bell + `/notifications` |

- **Header (desktop):** wordmark · Home · Rentals · Gallery · Testimonies · Promos · About · FAQ · Contact · bell · account · **Reserve** button.
- **Header (phone):** wordmark · bell · account · menu button (the menu holds the page links). **Reserve is pinned to the bottom of the screen** on every page.
- The Reserve button shows the cart count when there's something in it: "Reserve (3)".
- **Testimonies and Promos** disappear from the menu and from Home while they have nothing to show.
- **Footer:** business name, service areas, phones, Facebook, Terms, Privacy.

### Admin panel

- **Sidebar, in order:** Dashboard · Bookings · Calendar · Catalog · Inventory · Promo codes · Customers · Reports · **Website** (Pages · FAQ · Gallery · Testimonies) · Settings · Activity.
- **Count badges:** Bookings (requests waiting) and Testimonies (waiting).
- **Top bar:** page title · search (bookings by code, name or mobile) · **New booking** · bell · account.
- **Phone:** a menu button opens the sidebar as a sheet. Dashboard, Booking detail, Dispatch and Check-in are designed for one hand.

---

## 6. Customer screens

Each screen: route · what it's for · blocks in order · actions · states. Design phone first; website pages also get desktop.

### 6.1 Home — `/`

For: first-time visitors from Facebook. Shows what Kasoundbox is and gets them to Reserve.

1. **Announcement banner** (only when switched on): one line and an optional link, e.g. "Fiesta season: 10% off with FIESTA10 → See promos". It can be closed.
2. **Header.**
3. **Hero:** a big photo; the headline (default "Party needs, delivered."); the subheadline (default "Tents, tables, chairs and videoke for your event. We deliver and pick up."); **Reserve** (main) and "See rentals and prices" (secondary). The headline, subheadline and photo are edited by the admin.
4. **What we rent:** category tiles (Tents · Tables & chairs · Videoke · Packages), each with a photo and "from ₱10".
5. **Featured packages** (up to 3): what's inside, the first-day price, "See package".
6. **How it works** (fixed text, 4 numbered steps with icons):
   1. Pick your date and items.
   2. Send your request: no payment yet.
   3. Pay the downpayment to confirm.
   4. We deliver, then pick up after your event.
7. **Gallery preview:** 6–8 featured photos → "See the gallery".
8. **Testimonies** (only when any are featured): 3 cards → "Read more".
9. **Where we deliver:** service areas as chips, phones (tap to call), Messenger button, hours.
10. **Top questions:** 3–5 FAQs as an accordion → "All questions".
11. **Closing band:** "Planning an event? Check your date." + **Reserve**.
12. **Footer.**

States: skeletons per section; a section with no content is left out entirely (e.g. no gallery photos yet).

### 6.2 Rentals — `/rentals`

For: browsing everything with prices; checking availability.

1. Title "Rentals and prices".
2. **Event bar:** "When is your event?" with Date · Start · Days, and below it "Delivery Sat, Oct 10 · 8:00 AM · Pickup Sun, Oct 11 · 6:00 AM". On phones it collapses into a summary chip when scrolling ("Sat, Oct 10 · 8 AM · 1 day · Change").
3. **Category tabs:** All · Packages · Tents · Tables & chairs · Videoke. Categories come from the catalog; new ones appear by themselves.
4. **Cards** (a list on phones; a 3-column grid on desktop): photo, name, one-line description, price line, availability line (or "Pick a date to see availability"), and **Add** or a quantity stepper once added.
5. **Not available for your time:** the card is dimmed, says "Not available for your time" and offers "Try another date".
6. **Reserve** (bottom on phones) shows the count and total: "Reserve (2) · ₱1,900".

States: empty category "Nothing here yet."; loading skeleton cards.

### 6.3 Item — `/items/[slug]`

- Photo gallery (swipe; dots), name, price line.
- Availability for the chosen time, or "Pick a date to see availability" with the event bar.
- Description.
- **Included:** list, e.g. "2 microphones · song book · extension cord".
- Quantity + **Add**.
- Tracked items (videoke) count individual units; the design looks the same.

### 6.4 Package — `/packages/[slug]`

- Same as Item, plus **What's inside** with quantities: "1 × Party tent 20×20 ft · 5 × Round table · 50 × Monobloc chair".
- If a part is short for the chosen time: "Not available for your time: only 3 round tables are free."

### 6.5 Reserve — `/reserve` (4 steps)

A **step bar** at the top: **1 When · 2 What · 3 Where · 4 Review**, with Back. The step lives in the address (`?step=when|what|where|review`). If a customer arrives from Rentals with items already added, they land on the first unfinished step.

**Step 1 · When**
- **Date:** a month calendar. Days less than 24 hours away and more than 365 days away are disabled.
- **Start time:** chips from 8:00 AM to 5:00 PM (10 choices).
- **Days:** a stepper from 1 to 30 ("1 day", "2 days").
- **Summary card:** "Delivery Sat, Oct 10 · 8:00 AM / Pickup Sun, Oct 11 · 6:00 AM" plus a short note: "Each day is 22 hours with you. We pick up 2 hours before the next day starts, to check and test everything."
- **Continue** (disabled until a date is picked).

**Step 2 · What**
- The same cards as Rentals, showing only what's free for that time, with quantity steppers (the maximum = available).
- A collapsed section, "Not available for your time (3)", lists the rest.
- A bottom bar: "3 items · ₱5,900 · Continue".

**Step 3 · Where**
- **Venue address** (required, several lines).
- **Landmark** (optional, e.g. "near the chapel").
- **Notes for our crew** (optional: gate, parking, floor).
- Hint: "We deliver to [YOUR SERVICE AREAS]. Somewhere else? Send your request and we'll tell you the delivery fee."
- **Continue.**

**Step 4 · Review & send**
- Event summary with **Edit** links back to each step.
- Items: name × quantity and each line's total.
- **Promo code:** a field and **Apply**. Success: "FIESTA10 · −₱300". Errors: "This code has ended." / "This code needs a minimum order of ₱3,000." / "You've already used this code."
- **Price breakdown:** Items ₱5,900 · Promo −₱300 · **Total ₱5,600** · **Downpayment to confirm (50%) ₱2,800** · "Delivery fee: we'll confirm it with you."
- **Your details:** name and mobile from the profile, with Edit.
- "By sending, you agree to our Terms and Cancellation policy." (links)
- **Send request** (main).
  - **Signed out:** the button reads "Sign in to send" → Sign in → back here; the cart is kept.
  - **Profile unfinished:** the Welcome form first → back here.
- **Errors at send:**
  - "Sorry, only 10 chairs are left for your time." + "Change quantity" (another booking took them);
  - "You already have 3 requests waiting. Wait for our reply or cancel one.";
  - "Too many tries. Please wait a few minutes.";
  - "Your start time must be at least 24 hours from now."

### 6.6 Request sent — `/reserve/sent/[code]`

- A big check mark, "Request sent", and the code **KSB-8MWQ3Z** with a copy button.
- **What happens next:**
  1. We check your items and date.
  2. Pay the downpayment (₱2,800). How to pay: [PAYMENT INSTRUCTIONS from Settings].
  3. We confirm and notify you.
- **Get notified** card: "Allow notifications". On iPhone: "First add Kasoundbox to your Home Screen: tap Share, then Add to Home Screen."
- Buttons: **View my reservation** · Back to Home.

### 6.7 Sign in — `/sign-in`

- A card: "Sign in to Kasoundbox" with a reason line ("Sign in to send your request").
- **Continue with Google** · "or" · Email · Password (with "Forgot password?") · **Sign in** · "New here? **Create an account**".
- **Create account** mode: the same fields, a **Create account** button, and the hint "At least 8 characters".
- **Code step** (new accounts): "We emailed an 8-digit code to juan@example.com. It expires in 15 minutes." A numeric code field, **Confirm email**, "Send a new code", "Use a different email".
- **Errors** never say which of email or password was wrong: "Couldn't sign you in. Check your email and password."

### 6.8 Forgot password — `/forgot-password`

- **Step 1:** email → **Send reset code**. It always moves on, with the neutral message "If this email has an account, we sent it a code."
- **Step 2:** code + new password → **Set new password** → signed in.

### 6.9 Welcome — `/welcome`

- "Welcome to Kasoundbox" / "Tell us who to contact about your reservations. You only do this once."
- **Full name**; **Mobile number** (placeholder "0917 123 4567", hint "We call or text this number about deliveries."); checkbox "I agree to the **privacy policy**" (link); **Save and continue**.
- All errors show at once, under each field.

### 6.10 My account — `/account`

- Signed in as (email). **Full name** and **Mobile** with **Save changes**.
- **Notifications on this phone:** a switch, with iPhone instructions when needed.
- **Sign out.**

### 6.11 My reservations — `/account/reservations`

- Tabs: **Upcoming · Past**.
- Each row or card: code · status chip (customer word) · "Sat, Oct 10 · 8:00 AM · 1 day" · items summary · total and balance.
- Empty: "No reservations yet." + Reserve.

### 6.12 Reservation — `/account/reservations/[code]`

- **Header:** code, status chip, and a one-line meaning ("Waiting for review: we'll message you about the downpayment").
- **Timeline:** Requested → Confirmed → Delivered → Picked up → Completed, with times.
- **When:** delivery and pickup times. **Where:** the venue.
- **Items** (packages expanded).
- **Money:** items, promo, discount, charges (delivery, damage…), total, paid, balance (or Refund due), and the payments (date · method · amount).
- **How to pay** (while a balance is due): payment instructions from Settings.
- **Actions by status:**
  - Requested → **Cancel request** (with a confirm dialog);
  - Confirmed or Delivered → "Need a change? Message us" (Messenger and phone);
  - Picked up or Completed → the **Share a testimony** card (below);
  - Declined → the reason;
  - Expired → "The start time passed before this was confirmed." + Reserve again.
- **Testimony card:**
  - before writing: "How was your event? Share a testimony" → the form;
  - after: its status: **Waiting** (Edit · Remove) · **On our website** (View · Remove) · **Not shown on the website** (Remove).

### 6.13 Testimony form (a sheet on phones)

- **Your words** (20–600 characters, with a counter).
- **Display name** (prefilled "Maria S.").
- **Event** (optional, placeholder "Birthday party in Antipolo").
- A required checkbox: "Kasoundbox may show this on its website with my display name."
- **Send.** Then: "Thank you! We'll let you know when it's on our website."

### 6.14 Notifications

- **Bell:** unread count; a dropdown with the latest 5 and "See all".
- **Page:** all notifications, unread first, with "Mark all as read".
- **Pop-up** while the site is open: "Booking KSB-7Q4M2P confirmed. Tap to view."

### 6.15 Gallery — `/gallery`, `/gallery/[album]`

- **Albums:** cover photo, name, photo count.
- **Album:** a photo grid; tap a photo → a full-screen viewer with its caption, swipe, close.
- Albums with no visible photos don't appear.

### 6.16 Testimonies — `/testimonies`

- Title "What customers say".
- **Cards:** the quote, display name, event line, month and year, and a **Verified booking** mark. Newest first; "Show more".
- **Share yours** button, shown only to signed-in customers who have a booking that qualifies.

### 6.17 Promos — `/promos`

- The announcement at the top, when on.
- **Promo cards:** the code in large type with a copy button; what it gives ("10% off, up to ₱300"); "Minimum order ₱3,000"; "Until Dec 31"; the public note. Line: "Enter the code when you review your reservation."
- Nothing current → the page leaves the menu. A direct visit says "No promos right now."

### 6.18 About — `/about`

- A photo, the story text (plain), and a closing Reserve band.

### 6.19 FAQ — `/faq`

- Questions in an accordion.
- "Still have a question? Message us" (Messenger) and the phones.

### 6.20 Contact — `/contact`

- Phones (tap to call), **Message us on Messenger**, Facebook page, email.
- Service areas as chips; hours.
- "Open in Google Maps" link. No embedded map in version 1.
- A Reserve band.

### 6.21 Terms and Privacy — `/terms`, `/privacy`

- Title and the plain text from Settings. While empty: "This page hasn't been published yet."

### 6.22 Not found and error

- "Page not found" with links to Home and Rentals.
- "Something went wrong" with **Try again**.

### 6.23 Add to Home Screen helper (iPhone)

- A sheet with 3 illustrated steps: tap Share → Add to Home Screen → open Kasoundbox from the Home Screen.
- The reason: "so we can send you notifications on iPhone".

---

## 7. Admin screens

Desktop first (1440 wide). Phone versions for Dashboard, Booking detail, Dispatch and Check-in.

### 7.1 Admin shell

- **Desktop:** sidebar (wordmark, navigation with count badges) + top bar (title, search, **New booking**, bell, account). Content up to about 1200 wide.
- **Phone:** top bar with a menu button (the navigation opens as a sheet), title and bell.
- **Not allowed:** "This area is for Kasoundbox admins" + "Go to the home page".

### 7.2 Dashboard — `/admin`

- A **Today / Tomorrow** switch.
- **Alerts row:** Overdue · Short · Waiting cards, each with a count and its top item ("KSB-5TRN8C · pickup was 3:00 PM yesterday"). Tap → the list.
- **Run list**, in time order. Each stop shows:
  - time and a Delivery or Pickup badge;
  - code and customer, with the mobile (tap to call);
  - address and landmark;
  - items to load (packages expanded) and unit codes;
  - the balance to collect and the status chip;
  - an action: **Dispatch** / **Check in** / **Open**.
- **Quick availability checker:** date, start time, days, item or package → "Up to 12 available". When short, it shows the tightest time.
- Empty: "No deliveries or pickups today."

### 7.3 Bookings — `/admin/bookings`

- **Status tabs with counts:** All · Requested · Confirmed · Out · Returned · Completed · Ended (Declined, Cancelled, Expired).
- **Filters:** date range; search by code, name or mobile.
- **Table:** Code · Customer · Event (start → pickup) · Days · Status · Total · Balance · Source (Online / Admin). 25 per page.
- Phone: cards instead of the table.

### 7.4 New booking — `/admin/bookings/new`

For walk-in, phone and Messenger customers (no account needed).

- **Customer:** name, mobile (search existing by mobile), email (optional).
- **Event:** date, **any** start time (to the minute), days.
- **Items:** add an item or package with live availability; quantities.
- **Venue:** address, landmark, notes.
- **Promo code, manual discount** (₱ or %, with a reason), **delivery charge**.
- **Totals panel** (stays in view): items, discounts, charges, total, downpayment required.
- **Actions:** **Save as request** · **Record downpayment and confirm**.

### 7.5 Booking detail — `/admin/bookings/[code]`

- **Header:** code, status chip, source; the customer (name, tap to call, account link); event times; venue.
- **Items** with live availability ("Fits" / "Short: need 20, 10 free").
- **Money panel:**
  - items subtotal, promo, manual discount (Add or Edit, with a reason);
  - charges: list + **Add charge** (delivery, damage, loss, late, other);
  - total; payments (list + **Record payment** / **Record refund**);
  - paid, balance or refund due, downpayment required.
- **Timeline:** "Requested online by Maria Santos · Oct 2, 9:14 PM", "Confirmed by Marvin · Oct 3, 10:02 AM", …
- **Actions by status:**
  - **Requested:** **Confirm** (see 7.6) · Edit · Refresh prices · Decline (reason) · Cancel (reason).
  - **Confirmed:** Record payment · **Dispatch** (from the start date) · Edit (stock re-checked) · Cancel (reason; any refund is recorded separately).
  - **Out:** **Extend** (7.8) · **Check in** (7.9) · Record payment.
  - **Returned:** Record payment or refund. It becomes Completed when the balance reaches ₱0.
  - **Completed, Declined, Cancelled, Expired:** read-only · **Print slip**.

### 7.6 Confirm with downpayment (a side panel on desktop, a sheet on phones)

- **Payment:** amount (prefilled with the downpayment due, e.g. ₱2,800), method (Cash / GCash / Bank transfer), reference (optional), received at.
- **Stock check:** "All items fit" ✓, or per item "Monobloc chair: need 20, only 10 free (tightest Sat, Oct 10 · 2:00 PM → Sun, Oct 11 · 8:00 AM)".
- **Errors, with their fix:**
  - "Payments don't cover the downpayment yet."
  - Not enough stock: edit the booking, or decline.
  - The promo code has reached its limit: **Remove code** (the new price is shown) or **Give a manual discount instead**.
- **Confirm booking** → the customer is notified.

### 7.7 Dispatch (phone) — from the booking or the run list

- Header "Dispatch KSB-7Q4M2P" with the customer and address.
- **Checklist per line** (packages expanded): the quantity to load, with a tick.
- **Tracked items:** pick unit codes from chips of eligible units (VK-02, VK-03). Units in repair or already out don't appear.
- **Inclusions:** ticks ("2 microphones", "Song book").
- **Balance to collect ₱2,800:** "Collected now?" (amount, method).
- **Confirm dispatch** (enabled when everything is ticked) → Out; the customer gets "Out for delivery".

### 7.8 Extend (a sheet)

- The current pickup; add days (stepper); the new pickup; the availability result; the price change; **Confirm**.

### 7.9 Check-in (phone)

- **Per item:** good / damaged / missing steppers (all good by default). They must add up to the quantity that went out.
- **Per unit** (videoke): Good / Damaged / Missing.
- **Inclusions checklist.**
- **Suggested charges**, all editable:
  - missing: "1 chair × ₱350 replacement = ₱350";
  - damaged: an amount to type (replacement cost shown);
  - late: "Late by 1 day: videoke ₱1,200 × 1".
- **Summary:** the new balance. **Finish check-in** → Returned, or Completed when the balance is ₱0.

### 7.10 Print slip — `/admin/bookings/[code]/print` (A4 and receipt width)

- Kasoundbox header, code, customer, venue, delivery and pickup times.
- Items (packages expanded), unit codes, inclusions.
- Amounts: total, paid, balance.
- Signature lines: Delivered by · Received by · Returned by / Checked by.
- Footer: "Delivery receipt · Not a BIR official receipt".

### 7.11 Calendar — `/admin/calendar`

- **Month and week views.** Each booking is a bar from start to pickup, colored by status.
- Filter by item. Click a bar → the booking.

### 7.12 Catalog — `/admin/catalog`

- **Tabs:** Items · Packages · Categories.
- **Items list:** photo, name, category, prices, stock in service, tracking (Count or Units), active switch. **Add item.**
- **Item editor:**
  - name, category, description, inclusions (a list);
  - **photos** (upload several, reorder, remove);
  - **first-day price**, **extra-day price** ("blank = same as first day"), **replacement cost**;
  - **tracking:** "Count" (e.g. chairs) or "Individual units" (e.g. videoke). It locks once the item has stock or bookings, with a note saying why;
  - **stock:** the count (count items) or the units list (unit items); active.
- **Units** (tracked items): code (VK-01), serial number, status (In service / In repair / Retired, with a reason), notes. **Add unit.**
- **Package editor:** name, description, photos, prices, **what's inside** (item + quantity per package, each item once), **show on Home**, active; an availability preview.
- **Categories:** name, order, active.

### 7.13 Inventory — `/admin/inventory`, `/admin/inventory/[itemId]`

- **List:** per item, in service · in repair · out now · a next-7-days mini chart (held vs. capacity), and a Short warning.
- **Item page:**
  - the counts and a next-7-days chart;
  - **actions** as dialogs: Add stock · Send to repair · Back from repair · Write off (reason) · Count correction (reason);
  - **movement history:** date, action, change, reason, by;
  - the units table (tracked items).
- An action that makes future bookings short still saves, and shows the Short alert at once.

### 7.14 Promo codes — `/admin/promos`

- **List:** code, percent or amount, cap, minimum, dates, uses (x of max), on/off, **on website**.
- **Editor:** code, type, value, maximum discount, minimum order, valid from and to, maximum uses, maximum uses per customer, on/off, **show on website**, **public note**.
- **Redemptions:** booking, customer, date.

### 7.15 Customers — `/admin/customers`

- **Search all bookings by name or mobile**, walk-ins included.
- **Accounts list:** name, mobile, email, bookings, last booking.
- **Customer page:** profile and booking history.

### 7.16 Reports — `/admin/reports`

- A month or date-range picker.
- **Collected per month:** payments minus refunds.
- **Unpaid balances:** a list of bookings with money due.
- **Top items:** quantity × days.
- **Utilization** per item (%).
- **Discounts given:** promo and manual, per month; redemptions per code.

### 7.17 Settings — `/admin/settings`

A card per group, each with its own **Save** and an "Unsaved changes" note:

- **Business:** name, phones, email, address, Facebook page.
- **Booking rules:** earliest and latest start time, buffer hours, minimum notice, book up to (days ahead), maximum days, maximum open requests per customer, late grace (minutes). Each has a one-line explanation in plain words.
- **Payments:** downpayment (percent or fixed amount), payment methods (a list), payment instructions, cancellation and refund policy.
- **Notifications:** the ten switches, each with a recipient label (Admins / Customer).
- **Legal:** terms, privacy.

Also: "Last changed Oct 10, 2026, 8:00 AM"; field errors inline.

### 7.18 Activity — `/admin/activity`

- Newest first: who, what, when, and the field changes in plain words ("Buffer before the next booking (hours): 2 → 3"; "Downpayment: 50% → ₱1,500").
- "Show older changes."

### 7.19 Website · Pages — `/admin/website`

Cards, each with its own Save and a "View on site" link:

- **Home:** headline, subheadline, photo (with a preview of the hero).
- **About:** text, photo.
- **Contact:** hours, Messenger link, service areas (a list).
- **Announcement:** text, link, on/off, start and end dates.

### 7.20 Website · FAQ — `/admin/website/faq`

- **List:** question · show on Home · published; Move up / Move down buttons (keyboard-friendly reordering).
- **Add FAQ** dialog: question (up to 200), answer (up to 2,000). Edit; hide.

### 7.21 Website · Gallery — `/admin/website/gallery`

- **Albums** (a side list or tabs): add, rename, reorder, hide.
- **Photo grid** with multi-select: move to album · show on Home · hide · delete (with a confirm).
- **Upload photos:** several at once, with progress. Inline caption editing. Reorder.

### 7.22 Website · Testimonies — `/admin/website/testimonies`

- **Tabs:** Waiting (count) · Published · Hidden.
- **Card:** the text, display name, event line, month, the booking code (link), submitted date.
- **Actions:** **Publish** · **Hide** · **Show on Home**. When 6 are already on Home, it's disabled with the note "6 are already on Home".
- No edit button, by design.
- Empty: "No testimonies waiting."

---

## 8. Flows to prototype (link the screens)

| # | Flow | Screens |
|---|---|---|
| F1 | A customer reserves | Home → Reserve: When → What → Where → Review → Sign in (code) → Welcome → Send → Request sent |
| F2 | An admin confirms | Dashboard (Waiting) → Booking detail (Requested) → Confirm panel (GCash ₱2,800) → Confirmed → the customer's pop-up |
| F3 | Delivery day | Dashboard run list → Dispatch (phone) → Out |
| F4 | Pickup | Run list → Check-in (phone) → charges → Returned → Record payment → Completed |
| F5 | Testimony | My reservation (Completed) → Share a testimony → Waiting → Admin Testimonies → Publish → Home and Testimonies |
| F6 | A stock problem | Inventory: send 10 chairs to repair → Short alert on the Dashboard → the affected bookings |

---

## 9. Components to design once and reuse

- **Buttons:** main, secondary, quiet, destructive, link; icon buttons with labels. Sizes 44 and 48 px.
- **Inputs:** text, textarea with a counter, money (₱), select, search, checkbox, radio, switch, photo upload with progress.
- **Event bar:** date, start, days, plus the delivery/pickup line; its collapsed chip.
- **Date and time:** month calendar with disabled days; start-time chips; days stepper.
- **Step bar** (4 steps).
- **Item card** (list and grid), **package card**, quantity stepper, availability line, **Reserve button with count**, cart bar.
- **Price breakdown**, payment row, **timeline**, **status chip**, **alert card**, **run-list stop card**.
- **Table** with header, sort and pagination; tabs; filter chips.
- **Empty state**, **skeletons**, **toast**, dialog, **sheet** (bottom on phones), dropdown menu.
- **Notification bell and list**, **announcement banner**, **photo viewer**, **testimony card** with the Verified booking mark, **promo card** with copy, **FAQ accordion**.
- **Good / damaged / missing counter**, **unit-code chips**.

---

## 10. Questions for the owner

Open facts, shown as placeholders until answered:

- [CONFIRM] Do you set up tents and tables, or only deliver and pick up?
- [YOUR SERVICE AREAS] Which cities and barangays do you deliver to?
- [YOUR HOURS] Office hours for calls and messages.
- [PAYMENT INSTRUCTIONS] GCash number and name, bank details.
- [YOUR CANCELLATION POLICY]
- [REAL PRICES AND REPLACEMENT COSTS] for every item and package.
- [LOGO] and [PHOTOS] of your equipment and past events.

---

## 11. Sample data (for mockups only)

**Sample only: never publish these as real.** Real items, prices, customers and testimonies come from the admin panel.

### Business

- Name: Kasoundbox · Phones: 0917 123 4567, (02) 8123 4567 [SAMPLE] · Facebook: facebook.com/kasoundbox [SAMPLE]
- Service areas (layout only): Antipolo · Cainta · Taytay · Marikina · Pasig [SAMPLE]
- Hours: 7:00 AM – 7:00 PM daily [SAMPLE]

### Catalog

| Item | Category | First day | Extra day | Stock |
|---|---|---|---|---|
| Party tent 10×10 ft | Tents | ₱1,500 | ₱1,000 | 4 |
| Party tent 20×20 ft | Tents | ₱3,500 | ₱2,500 | 3 |
| Monobloc chair (white) | Tables & chairs | ₱10 | ₱5 | 200 in service, 6 in repair |
| Round table, 8 seats | Tables & chairs | ₱150 | ₱100 | 20 |
| Long table, 6 ft | Tables & chairs | ₱120 | ₱80 | 15 |
| Videoke set (2 microphones, song book) | Videoke | ₱1,200 | same | units VK-01, VK-02, VK-03 (VK-04 in repair) |
| **Party package for 50** (1 tent 20×20 ft, 5 round tables, 50 chairs) | Packages | ₱4,500 | ₱3,000 | from its parts |

Replacement cost example: Monobloc chair ₱350.

### Price example (a request)

Sat, Oct 10 · 8:00 AM, 1 day → pickup Sun, Oct 11 · 6:00 AM.

| Line | Amount |
|---|---|
| Party package for 50 × 1 | ₱4,500 |
| Videoke set × 1 | ₱1,200 |
| Monobloc chair × 20 (extra) | ₱200 |
| **Items** | **₱5,900** |
| Promo FIESTA10 (10%, up to ₱300) | −₱300 |
| **Total** | **₱5,600** |
| **Downpayment (50%)** | **₱2,800** |

### Customers and bookings

| Code | Customer | Event | Status |
|---|---|---|---|
| KSB-7Q4M2P | Maria Santos · 0917 555 0101 · 12 Sampaguita St, San Isidro, Antipolo (near the chapel) | Sat, Oct 10 · 8:00 AM · 1 day | Confirmed · paid ₱2,800 by GCash · collect ₱2,800 |
| KSB-2XK7ME | Jun Villanueva · 0918 222 3344 · Blk 4 Lot 9, Concepcion Uno, Marikina | Fri, Oct 9 · 3:00 PM · 1 day (pickup Sat 1:00 PM) · Videoke VK-01, 30 chairs · ₱1,500 | Out · paid |
| KSB-5TRN8C | Ana Reyes · 0919 888 1234 · Cainta | Thu, Oct 8 · 5:00 PM · 1 day (pickup Fri 3:00 PM) · Videoke VK-03 | Out · **Overdue** |
| KSB-8MWQ3Z | Carlo Mendoza · 0917 444 9090 · Taytay | Mon, Oct 12 · 10:00 AM · 2 days | Requested |
| KSB-4HD9RV | Maria Santos | Sat, Oct 3 · 9:00 AM · 1 day | Completed (can write a testimony) |

**Short alert example:** Monobloc chair over by 5 on Sat, Oct 17 · 8:00 AM → Sun, Oct 18 · 8:00 AM (bookings KSB-9D4RWT and KSB-6JPC3A), after 10 chairs went to repair.

### Promo

FIESTA10: 10% off, up to ₱300, minimum order ₱3,000, until Dec 31, 2026, shown on the website with the note "10% off for fiesta season".

### Testimonies [SAMPLE: replace with real ones, never publish]

- "Everything arrived before 8 AM and the videoke worked all night. Booking online was easy." — Maria S. · Birthday party in Antipolo · Oct 2026 · Verified booking
- "The tent kept everyone dry when it rained, and pickup was right on time." — Jun V. · Family reunion in Marikina · Sep 2026 · Verified booking
- "Clear prices and quick replies. We'll rent again for our next fiesta." — Ana R. · Barangay fiesta in Cainta · Aug 2026 · Verified booking

### FAQ (drafts built from the real rules; the owner edits them)

- **How long is one rental day?** Each day is 22 hours with you, from the start time you pick. We pick up 2 hours before the next day starts, so we can check and test everything.
- **When can delivery start?** On the hour, from 8:00 AM to 5:00 PM. Book at least 24 hours ahead.
- **How do I confirm my reservation?** Send a request, then pay the downpayment (half of the total). We confirm once we receive it, and you'll get a notification.
- **How can I pay?** Cash, GCash or bank transfer. [PAYMENT INSTRUCTIONS]
- **Can I cancel?** While your request is waiting for review, cancel it in My Reservations. After it's confirmed, message us. [YOUR CANCELLATION POLICY]
- **Where do you deliver?** [YOUR SERVICE AREAS]
- **What if something gets damaged or lost?** We check everything at pickup. Damaged or missing items are charged as described in our terms.

### Gallery albums [SAMPLE]

Weddings · Birthdays · Christenings · Corporate events. Captions like "20×20 ft tent with round tables, Antipolo".

### About [PLACEHOLDER]

[YOUR STORY: how Kasoundbox started, how long you've been renting, the family behind it.]

---

## 12. Prompt batches for Claude Design (in order)

1. **Style guide** + **Home** (phone and desktop).
2. **Rentals**, **Item**, **Package** (phone and desktop).
3. **Reserve steps 1–4** + **Request sent** (phone), including the error states of step 4.
4. **Sign in** (and code step), **Forgot password**, **Welcome**, **My account**.
5. **My reservations** + **Reservation** in every status + **Testimony form**.
6. **Gallery**, **Testimonies**, **Promos**, **About**, **FAQ**, **Contact** (phone and desktop) + **Notifications**.
7. **Admin shell** + **Dashboard** (desktop and phone).
8. **Bookings list**, **Booking detail** (Requested with the Confirm panel; Confirmed; Out; Returned), **New booking**.
9. **Dispatch**, **Check-in** (phone), **Extend**, **Print slip**.
10. **Catalog** (items, item editor, units, package editor, categories) + **Inventory** (list, item page, action dialogs).
11. **Promo codes**, **Customers**, **Reports**, **Calendar**.
12. **Settings**, **Activity**, **Website › Pages, FAQ, Gallery, Testimonies**.
13. A pass over **empty, loading, error and not-allowed** states, and a **dark mode** pass.

Tip: one batch per conversation turn. Ask Claude Design to keep option and screen names stable between turns.

---

## 13. Not in version 1 (don't design)

- Online payment checkout (payments are recorded by admins).
- SMS or email notifications (email is used only for sign-in codes); Facebook login.
- Security deposits; delivery zones and automatic delivery fees; sale prices and automatic discount rules.
- Several branches or warehouses; partial returns.
- Customers editing a request (they cancel and send a new one); self-service account deletion.
- BIR official receipts or invoices (the print slip is a delivery receipt only).
- Star ratings, photos in testimonies, replies to testimonies; loyalty points; a blog; live chat; Tagalog translation.

---

## 14. Build order (for context)

Design comes first; then the build goes milestone by milestone, each ending in something usable and tested:

1. **Foundation:** repo, database, sign-in (customers and admins), settings, activity log.
2. **Catalog:** categories, items, units, packages, photo uploads; the public Rentals pages.
3. **Website:** Home, About, FAQ, Contact, Gallery, the announcement banner and their admin screens; Facebook and Google previews.
4. **Reservation engine:** the time, availability and price rules, written test-first.
5. **Booking flow:** the 4-step Reserve flow, admin review, record the downpayment and confirm, My Reservations.
6. **Operations:** run list, dispatch, check-in, inventory actions, alerts.
7. **Notifications:** in-app, phone push, installable web app.
8. **Testimonies:** customer submit, admin select, Verified booking.
9. **Business tools:** promo screens and the Promos page, manual discounts, calendar, reports, print slip.
10. **Hardening and launch:** end-to-end tests, security review, real content, go live.
