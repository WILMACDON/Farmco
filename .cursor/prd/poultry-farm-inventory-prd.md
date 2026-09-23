# Poultry Farm Inventory Management System: Product Requirements Document

**Version:** 1.0 (Draft) | **Status:** For review

---

## 1. Overview

### 1.1 Problem
Poultry farms usually track birds, eggs and feed in notebooks or spreadsheets. This leads to missed records, unexplained stock losses, no accountability for who changed what, and no clear picture of farm performance.

### 1.2 Product Summary
A web application for a single poultry farm organization to record and monitor birds, eggs and feed, manage egg orders, view statistics, and control access through role-based permissions. Every inventory addition or removal is tied to the user who made it.

### 1.3 Goals
- Give an accurate, real-time view of birds, eggs and feed.
- Make daily data entry fast enough for workers to do on a phone.
- Track every stock change to a named user and time.
- Keep the app usable without internet, so records are never lost in areas with weak or no signal.
- Give owners and managers control over order approval and staff access.
- Surface simple statistics that support decisions (feed reorder, mortality, egg output).

### 1.4 Non-Goals (v1)
- Multiple organizations or farms (one organization only).
- Payments, invoicing or accounting.
- Customer-facing storefront (orders are entered by staff).
- Native mobile apps (an installable, responsive web app is used instead).
- Full offline use of every feature (only data entry and order creation work offline; see 3.9).
- IoT or sensor integrations.

---

## 2. Users and Roles

| Role | Count per org | Description |
|---|---|---|
| **Owner** | Exactly 1 | Full control of the organization. Creates managers and workers. |
| **Manager** | Many | Runs daily operations. Creates workers. Approves orders. |
| **Worker** | Many | Records daily inventory data. Cannot approve orders or manage users. |

### 2.1 Permission Matrix

| Capability | Owner | Manager | Worker |
|---|:-:|:-:|:-:|
| Create / deactivate managers | ✅ | ❌ | ❌ |
| Create / deactivate workers | ✅ | ✅ | ❌ |
| View dashboard | ✅ | ✅ | ✅ |
| Add / remove inventory (birds, eggs, feed) | ✅ | ✅ | ✅ |
| Edit or delete a past inventory entry | ✅ | ✅ (with reason) | ❌ |
| Create an egg order | ✅ | ✅ | ✅ (created as Pending) |
| Approve orders / mark as Sold | ✅ | ✅ | ❌ |
| Cancel an order | ✅ | ✅ | ❌ |
| View statistics | ✅ | ✅ | Limited (own activity + basic totals) |
| View activity log (all users) | ✅ | ✅ | Own entries only |
| Edit organization settings | ✅ | ❌ | ❌ |

> **Decision:** Workers can create orders, but only managers and owners can mark an order as Sold or cancel it.

---

## 3. Core Features

### 3.1 Authentication and User Management
- Email or username plus password login for every user.
- Owner account is created at organization setup (sign-up flow).
- Owner creates managers and workers; managers create workers only.
- New users receive a temporary password or invite link and must set a new password on first login.
- Users can be deactivated (not deleted) so historical records keep their attribution.
- Password reset, session timeout, and logout.

**Acceptance criteria**
- A manager attempting to create a manager is blocked (UI hidden and server-side rejected).
- A deactivated user cannot log in, but their past entries remain visible with their name.

### 3.2 Bird Inventory
Tracks the flock by category.

**Categories:** Well, Sick, Laying, Non-laying, Chicks.

> **Decision:** "Well/Sick" is a health status and "Laying/Non-laying" is a production status, so a bird can be both (e.g. sick and laying). Chicks are their own group.

**Inputs (each is logged with user, timestamp, note):**
- Add birds (purchase, hatched, transfer in) with category and quantity.
- Remove birds (sold, died, culled, transfer out) with category, quantity and reason.
- Move birds between categories (e.g. chick → non-laying → laying, well → sick, sick → well).

**Display:** Current count per category, total birds, and recent movements.

**Rules**
- Counts cannot go below zero; removal is blocked with a clear message.
- Reason is required for every removal.

### 3.3 Egg Inventory
Tracks eggs in crates by size.

- **Sizes:** Small, Medium, Large (configurable by the owner in future versions).
- **Unit:** Crate (1 crate = 30 eggs, stored as an owner-editable setting). Loose eggs are tracked as a remainder so nothing is lost in rounding.
- **Inputs:** Eggs collected (added), eggs sold or dispatched (removed, linked to an order where possible), eggs broken or spoiled (removed with reason).
- **Display:** Crates and loose eggs per size, total eggs, daily collection.

**Rules**
- Stock cannot go negative.
- Approving an order reduces egg stock (see 3.5).

### 3.4 Feed Inventory
- **Unit:** Bags (fractional bags allowed, e.g. 0.5).
- **Inputs:** Feed purchased (added), feed used (removed, with date and note).
- **Display:** Bags remaining, average daily usage, estimated days of feed left.
- **Low-stock alert:** Configurable threshold; a warning appears on the dashboard when bags remaining fall below it.

### 3.5 Orders
A page listing all egg orders.

**Order fields:** Order ID, customer name, contact (optional), items (size and quantity in crates), order date, delivery/pickup date (optional), created by, status.

**Statuses:** Pending → Approved → Sold. Also Cancelled.

- Managers and owners approve orders and mark them as sold.
- Marking an order as **Sold** deducts the ordered crates from egg stock and logs it in the activity log.
- If stock is insufficient, the approver sees a warning showing the shortfall and cannot mark the order as sold until stock is adequate.
- Filters: status, date range, customer. Search by customer or order ID.
- Workers can view orders and create new ones (always saved as Pending), but cannot mark them as Sold or cancel them.

### 3.6 Statistics
Available to owners and managers (workers see a limited view).

**Metrics and charts**
- Birds: total by category, trend over time, mortality count and rate.
- Eggs: daily/weekly/monthly production, production by size, laying rate (eggs per laying bird per day), broken/spoiled rate.
- Feed: usage over time, days of feed remaining, feed used per bird.
- Orders: orders by status, crates sold over time, fulfilment rate.
- Activity: entries per user (owner and manager only).

**Controls:** Date range filter (7 days, 30 days, custom).

### 3.7 Dashboard
Landing page after login showing today's snapshot: bird totals, egg stock by size, feed bags left, pending orders count, low-stock alerts, and quick-action buttons ("Record eggs", "Record feed", "Add bird update").

### 3.8 Activity Log (Audit Trail)
Every add, remove, edit, approval and user-management action is recorded with: user, action, item, quantity, before/after value, timestamp, and note. Entries cannot be edited or deleted by anyone. Owners and managers can filter by user, type and date. This fulfills the requirement that each login is used to track inventory additions and removals.

### 3.9 Offline Support
The app works as an installable web app (PWA) so workers can keep recording data when the connection drops, and everything syncs automatically when it returns.

**Works offline**
- Log in with a previously used device (a user must have logged in online at least once on that device).
- View the last synced dashboard, stock levels and orders (read-only, clearly marked as "last updated at...").
- Record bird, egg and feed entries (add, remove, move).
- Create new orders (saved as Pending).

**Requires internet**
- Creating or deactivating users, changing settings and passwords.
- Marking an order as Sold or cancelling it (needs a live stock check).
- Statistics beyond the last cached view.
- Editing or correcting past entries.

**Sync behavior**
- Entries made offline are stored on the device in a queue, each stamped with the time and user at the moment they were recorded (not the time they sync).
- The app syncs automatically when connectivity returns. Users can also tap "Sync now".
- A persistent status indicator shows Online, Offline, or "X entries waiting to sync".
- Queued entries are never discarded silently; they stay on the device until the server confirms them. If a user tries to log out with unsynced entries, the app warns them and asks them to sync first.

**Conflict rules**
- Entries are applied as movements (add or remove X), not overwritten totals, so two workers recording offline at the same time do not overwrite each other.
- If a synced removal would push stock below zero, the entry is saved but flagged as **Needs review**. The owner and managers are alerted on the dashboard to resolve it (accept, correct with a reason, or reject). The log keeps the original entry either way.
- Duplicate submissions from repeated sync attempts are ignored (each entry has a unique ID).
- If a user is deactivated while offline, their queued entries are still accepted and marked as recorded before deactivation, so no data is lost.

**Acceptance criteria**
- A worker with no signal can record egg collection, and the entry appears in the dashboard and activity log after reconnecting, with the original time.
- Closing the browser or restarting the phone while offline does not lose queued entries.
- Two workers recording feed usage offline at the same time both see their entries applied correctly after sync.

---

## 4. User Flows (Key)

1. **Worker records daily egg collection:** Login → Dashboard → "Record eggs" → choose size, enter crates/eggs → Save → stock updates and log entry is created.
2. **Manager approves an order:** Orders → open pending order → review stock check → Approve → Mark as Sold → egg stock is deducted.
3. **Owner adds a manager:** Users → Add user → choose role Manager → enter details → user receives credentials.
4. **Worker records eggs with no signal:** Open app (installed) → "Record eggs" → save → entry shows "Waiting to sync" → connection returns → entry syncs automatically and status changes to "Synced".
5. **Bird mortality:** Birds → Remove → choose category, quantity, reason "Died" → Save → mortality stat updates.

---

## 5. Data Model (High Level)

- **Organization:** id, name, settings (eggs per crate, low-feed threshold).
- **User:** id, organization_id, name, email/username, password hash, role (owner/manager/worker), status (active/inactive), created_by.
- **BirdRecord (movement):** id, category, quantity, direction (add/remove/move), reason, note, user_id, timestamp.
- **BirdStock (current):** category, count.
- **EggRecord:** id, size, quantity_eggs, direction, reason, order_id (optional), user_id, timestamp.
- **FeedRecord:** id, bags, direction, note, user_id, timestamp.
- **Order:** id, customer_name, contact, status, created_by, approved_by, order_date, delivery_date, sold_at.
- **OrderItem:** order_id, size, crates.
- **ActivityLog:** id, user_id, action, entity, before, after, timestamp.

Current stock values are derived from (or reconciled against) the movement records so totals can always be explained.

---

## 6. Non-Functional Requirements

- **Access control:** Permissions enforced on the server, not only in the UI.
- **Security:** Hashed passwords, HTTPS, session expiry, rate limiting on login.
- **Responsive:** Fully usable on phones; data entry screens designed for one-handed use.
- **Offline-first data entry:** Installable web app with local storage for the entry queue and cached read-only data; encrypted or otherwise protected on the device, and cleared on logout.
- **Performance:** Pages load in under 3 seconds on average mobile connections; important for farm locations with weak networks.
- **Reliability:** Daily automated backups of data.
- **Data integrity:** No negative stock; all changes transactional.
- **Usability:** Simple language, large inputs, confirmations for destructive actions.

---

## 7. Success Metrics

- 90% or more of active workers submit at least one record per day.
- Stock counts in the app match physical counts within 2% at monthly stock checks.
- Order approval time under 24 hours.
- Zero unauthorized actions (e.g. a worker approving an order) in the audit log.

---

## 8. Release Plan

| Phase | Scope |
|---|---|
| **MVP** | Auth and roles, user management, birds, eggs, feed inventory with inputs, activity log, basic dashboard, offline data entry with sync |
| **v1.0** | Orders (create, approve, sold, stock deduction, offline order creation), statistics page, low-stock alerts, "Needs review" conflict handling |
| **v1.1** | Data export (CSV/PDF), configurable egg sizes and crate size, notifications (email/SMS/WhatsApp) |
| **Future** | Order pricing and revenue tracking, expenses, vaccination and medication schedules, multi-farm support |

---

## 9. Decisions Made

1. **Bird categories:** Two dimensions (health: well/sick; production: laying/non-laying), with chicks separate.
2. **Crate size:** 1 crate = 30 eggs (owner-editable setting).
3. **Orders:** Workers, managers and owners can create orders; only managers and owners can mark them as Sold or cancel them.
4. **Price and revenue:** Not in v1.
5. **Offline support:** Included. Data entry and order creation work offline and sync automatically; approvals, user management and corrections need internet.
6. **Corrections:** Owners and managers can correct entries with a required reason; the log keeps the original and the correction.
7. **Notifications:** On-screen alerts only in v1; email/SMS/WhatsApp later.
8. **Currency and units:** Nigerian Naira (NGN) for any future money values; feed tracked in bags.
