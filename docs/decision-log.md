# Decision Log

Captures key architectural choices made during development — what was decided, what alternatives were considered, and why.

---

## 2026-06-07 — Centralised card library model (migration 004)

**Decision:** Move from per-user card data to a shared `card_library` table with `library_rates` and `library_caps`. Users hold a join table (`user_card_selections`) with no copy of rates or caps.

**Alternatives considered:**
- Keep per-user card rows — lets users customise rates, but creates drift from real bank terms and makes library updates impossible without touching every user's data.
- Hybrid (shared library + per-user overrides for everything) — too complex for the current scope.

**Why:** Rates and caps change when banks update their terms. A single source of truth means one SQL update propagates to all users immediately. Users only need to say "I have this card" — all the rate knowledge lives in the library.

**Trade-off:** Users cannot correct rates they believe are wrong (by design — accuracy is admin-managed). The migration cleared all existing per-user card data; existing users needed to re-select their cards.

---

## 2026-06-07 — Effective-date versioning on rates and caps

**Decision:** `library_rates` and `library_caps` carry an `effective_from DATE` column. The engine always resolves "latest row with `effective_from ≤ transaction_date`" per (card, category) key.

**Alternatives considered:**
- Delete and re-insert on rate change — destroys history; old transactions recalculate incorrectly.
- Store resolved rate on the transaction at save time — means the engine doesn't need historical rates, but the saved rate can't be recalculated if a bug is discovered and fixed.

**Why:** Preserves full history without duplicating data. A transaction logged in January still reflects January's rate even after a rate update in March. This matches how banks themselves handle rate changes (new terms effective from a given date).

---

## 2026-06-08 — Substitution pattern for selectable bonus categories

**Decision:** The library keeps one "bonus slot" rate row per selectable card (e.g. Dining → 4 mpd as the default). When a user has set a category override, the recommendation engine substitutes the user's chosen category into that slot at query time. No per-user rows in `library_rates` or `library_caps`.

**Alternatives considered:**
- Per-user rate rows — would require copying library rows into user-owned tables, creating the same drift problem the library model was designed to avoid.
- Store user's chosen category only on the transaction — doesn't help with recommendation (which card to use for a future transaction) or Dashboard cap tracking.
- Duplicate the entire rate/cap row set per selectable card per category — combinatorial explosion; 6 categories × 2 cards × N rates = bloated library.

**Why:** The substitution approach is transparent to 95% of the engine. `resolveRates` and `resolveCaps` return the library default; then a thin wrapper (`applySelectableOverride`) swaps the category ID on the bonus slot row before any calculations run. All downstream logic (period spending, effective MPD, cap bars) continues unchanged.

**Trade-off:** The library's "Dining default" for selectable cards is a stub that users who never set an override will see. A warning badge is shown in My Cards to prompt them to set their category.

---

## 2026-06-08 — `effective_from` on category overrides for history preservation

**Decision:** `user_category_overrides` carries `effective_from DATE` with a `UNIQUE(user_id, card_id, effective_from)` constraint. `resolveOverride` returns the most recent override with `effective_from ≤ transaction_date`.

**Alternatives considered:**
- Single row per (user, card) — simpler, but changing the category retroactively re-categorises all past transactions, breaking historical accuracy.
- Append-only log without effective_from — can't correctly resolve which category was active for a given past transaction.

**Why:** Matches the same pattern used for `library_rates` and `library_caps`. A user who changes from Dining to Fashion in March will still see Dining correctly applied to January transactions. The effective_from defaults to today, which is the correct behaviour in all normal cases.

---

## 2026-06-08 — UUID array for category_ids on overrides

**Decision:** `user_category_overrides.category_ids` is `UUID[]` (Postgres array), allowing a single override row to capture multiple chosen categories (needed for Lady's Solitaire's 2-category bonus).

**Alternatives considered:**
- One row per chosen category — requires a different UNIQUE key and more complex resolution logic.
- Separate table `user_override_categories` (normalised) — correct relationally but over-engineered for a maximum of 2 entries per row.

**Why:** Keeping it in one row with an array preserves the simple "one effective override per (user, card, date)" mental model and makes `resolveOverride` trivial to implement and reason about. Postgres arrays are idiomatic for small, fixed-semantics lists like this.

---

## 2026-06-08 — Dashboard spend breakdown: proportional bars vs. mini pie chart

**Decision:** Show per-category uncapped spend as thin proportional bars (h-1.5, `bg-indigo-200`) scaled to the card's monthly total, placed below cap bars.

**Alternatives considered:**
- Mini pie/donut chart per card — visually richer but requires a charting library; inconsistent with the bar-based cap visualisation already on the page.
- Simple text list of categories with amounts — no visual weight; harder to scan relative proportions at a glance.
- Stacked horizontal bar (all categories in one bar) — compact but hard to label; overflow clipping would hide small categories.

**Why:** Thin proportional bars reuse the same visual language as cap bars while being clearly distinct (thinner, softer colour, no limit line). Each category gets its own row with a label and amount, making it easy to scan. The proportional scaling (% of card total, not % of some cap) is honest — there is no "limit" for uncapped spend, so showing a bar relative to a cap would be misleading.

**Trade-off:** Cards with many categories can produce a long list. Mitigated by showing only categories with actual spend (plus pinned chosen categories for selectable cards at $0).

---

## 2026-06-08 — Manual MPD override: store both computed and manual values

**Decision:** When a user overrides the engine-computed MPD on a transaction, store `computed_mpd` (engine output), `manual_mpd` (user input), and `override_note` (reason) as separate columns. `effective_mpd = COALESCE(manual_mpd, computed_mpd)` is the value used for miles calculation.

**Alternatives considered:**
- Overwrite `effective_mpd` directly — simpler schema, but the original engine value is permanently lost. No way to audit what the engine calculated vs what the user entered, and no "Reset to computed" UX.
- Store override as a flag + delta — unusual pattern; harder to query.

**Why:** The dual-column approach enables auditability, the "↺ Reset" button that restores the engine value, and future analytics (how often do users override, and by how much). Backward-compatible — old rows have NULL in both new columns; `COALESCE` still works correctly.

---

## 2026-06-08 — Client-side recommendation engine (no server-side compute)

**Decision:** The entire recommendation and miles-calculation engine runs in the browser against in-memory data loaded at login.

**Alternatives considered:**
- Server-side function (Supabase Edge Function) that takes a transaction and returns miles — moves logic to the server, enables future server-push updates, but adds round-trip latency on every recommendation request and couples the UX to network availability.
- Stored procedure in Postgres — performant for batch recalculation but very hard to test and iterate on.

**Why:** The dataset is small (23 cards, hundreds of transactions max). Client-side execution means zero latency for recommendations — the user gets instant feedback while typing an amount. The engine is pure TypeScript, easily unit-testable. There is no sensitive computation to protect on the server.

**Trade-off:** All users download the full library on login (~small JSON). Logic bugs require a re-deploy to fix rather than a server patch. Accepted at current scale.

---

## 2026-06-09 — Combined cap modelling via cap_group TEXT column

**Decision:** Add a `cap_group TEXT` column to `library_caps`. Rows on the same card with the same `cap_group` share a single spending limit. The engine sums spending across all group category IDs to determine remaining headroom. The Dashboard collapses grouped cap rows into a single bar; My Cards shows a single chip listing all category names.

**Alternatives considered:**
- Separate `combined_caps` junction table linking multiple cap rows — normalised but over-engineered; adds a join for every engine calculation.
- `cap_group_id UUID` referencing a new `cap_groups` table — adds a table and requires a join; TEXT group names are simpler and self-documenting (`'bonus'` is clear).
- Model combined caps as a single row with `category_id = NULL` (global card cap) — would prevent per-category breakdown; the current model correctly identifies which categories count toward the pool.

**Why:** A TEXT label (`'bonus'`) on each participating row is the minimal change that enables correct group-level spend aggregation. The engine key is `card_id:group:bonus` rather than `card_id:category_id`; all downstream logic (blended MPD, remaining headroom, cap status) is unchanged.

**Trade-off:** Combined cap still modelled per-category in the library — each row has the full shared `spend_limit`. This is redundant but necessary for the engine to know the limit without a separate lookup. Adding a category to a group requires inserting/updating all participating rows.

---

## 2026-06-09 — Fashion and Beauty categories at IDs 011 and 012

**Decision:** Add Fashion (011) and Beauty (012) as new category IDs rather than reusing 009 and 010.

**Background:** The initial `seed.sql` inserted "Utilities & Bills" at ID 009 and "Others" at ID 010. Migration 005 later tried to insert Fashion at 009 and Beauty at 010 with `ON CONFLICT (id) DO NOTHING`. On any database where the seed had been applied first, this silently no-oped — Fashion and Beauty were never actually added. All downstream references (Lady's Card/Solitaire selectable categories, Citi Rewards fashion rate) pointed to "Utilities & Bills" and "Others" respectively.

**Alternatives considered:**
- `UPDATE categories SET name = 'Fashion', icon = '👗' WHERE id = '...009'` — would rename "Utilities & Bills" to "Fashion", corrupting any existing transactions tagged as Utilities.
- Delete 009/010 and re-insert — foreign key constraints prevent deletion if any transaction references them.

**Why:** New IDs (011, 012) are a non-destructive, backward-compatible fix. Existing transactions tagged as "Utilities & Bills" (009) or "Others" (010) are untouched. Migration 011 adds the new categories, fixes all `library_selectable_categories` references for Lady's Card and Solitaire, and corrects Citi Rewards' fashion rate from 009 to 011.

**Trade-off:** Any `user_category_overrides` rows that a user may have set for Lady's Card/Solitaire pointing to 009 or 010 become stale. The user needs to reset their selectable category choice after running migration 011.

---

## 2026-06-09 — Wildcard rate pattern for channel-based bonuses

**Decision:** Model channel-restricted bonus rates as `category_id = NULL, payment_channel = 'contactless'|'online'` in `library_rates`. The engine (`getEffectiveForCard`) detects this wildcard when the transaction's payment channel matches and applies it over any per-category rate.

**Alternatives considered:**
- Duplicate the bonus rate row for every eligible category — every new category added to the app would require adding rows for every wildcard card; high maintenance burden.
- Store a flag on the card ("earns bonus on all categories when contactless") — requires special-casing throughout the engine rather than having the rate table drive behaviour uniformly.

**Why:** The wildcard row is transparent to all engine logic after `getEffectiveForCard` resolves it. No downstream code changes are needed — it just sees a rate with a category. Adding a new spending category automatically benefits from all existing wildcard rates.

**Cards using this pattern:** UOB Visa Signature (contactless), UOB Preferred Platinum Visa (contactless), DBS Woman's World (online), Citi Rewards Mastercard (online).

---

## 2026-06-09 — Channel cap: null-category cap tracks all channel spend

**Decision:** Channel caps use `category_id = NULL, cap_payment_channel = 'contactless'|'online'` in `library_caps`. The engine key is `card_id:channel:payment_channel:period`. All transactions on that card using that channel accumulate against this single cap regardless of spending category.

**Alternatives considered:**
- Duplicate the cap row for every eligible category — same maintenance problem as duplicating rates; and the limit would then be per-category rather than shared across all spend.
- Store the channel limit on the card itself — simpler schema, but breaks the effective-date versioning and period-type flexibility that `library_caps` provides.

**Why:** Mirrors the wildcard rate pattern so both rate and cap resolution follow the same null-category convention. The `cap_payment_channel` column already existed for restricting which transactions count toward a cap; using it on a null-category cap naturally produces a channel-wide spending pool.

---

## 2026-06-09 — Removing Citi Rewards fashion category cap when adding online channel cap

**Decision:** When converting Citi Rewards to a wildcard online rate, remove the existing fashion `category_id` cap entirely from `library_caps`. The fashion *rate* (4 mpd in-store fashion) is retained, but no cap bar appears for it on the Dashboard.

**Background:** Citi Rewards' actual cap is S$1,000/month combined across all bonus spend (online + in-store fashion). The engine cannot merge a channel cap and a category cap into a single shared limit — they are tracked on different keys. Keeping both would show two S$1,000 bars on the Dashboard, implying S$2,000 of headroom when the real limit is S$1,000.

**Alternatives considered:**
- Keep the fashion cap and show both bars — misleading; overstates available headroom.
- Build a cap-merging mechanism in the engine — significant complexity for an edge case on one card.
- Remove the fashion rate too — would break in-store fashion earning for Citi Rewards, which is valid and real.

**Why:** One honest bar (the online channel cap) is better than two misleading bars. In-store fashion spend that exceeds the online cap is tracked at base rate implicitly.

---

## 2026-06-09 — UOB Visa Signature: contactless wildcard model replaces petrol+transport

**Decision:** Remove UOB Visa Signature's petrol rate and petrol cap entirely. Model the card's 4 mpd benefit as a contactless wildcard (`category_id = NULL, payment_channel = 'contactless'`) with a S$1,000/month channel cap.

**Background:** UOB Visa Signature's bonus is "4 mpd on contactless spend up to S$1,000/month." The previous model approximated this as petrol (S$600 cap) + transport (S$600 cap), which was both inaccurate and required a `cap_group` workaround for the combined limit.

**Alternatives considered:**
- `cap_group` linking petrol + transport caps — would produce the correct combined limit, but still only covered two categories; any other contactless spend (e.g. dining tapped at a terminal) would earn base rate incorrectly.
- Keep the approximation — safe (never overstates headroom) but increasingly misleading as users add more transaction types.

**Why:** The contactless wildcard is the accurate model of the card's actual terms and is simpler to maintain. One rate row, one cap row. Any contactless transaction on any category earns 4 mpd (subject to the monthly cap).

---

## 2026-06-09 — Statement cycle support: per-card cycle type + per-user statement day

**Decision:** Add `cap_cycle TEXT` (`'calendar'` | `'statement'`) to `card_library` and `statement_day INTEGER` to `user_card_selections`. The engine uses the user's statement day to compute the start of the current cap period when `cap_cycle = 'statement'`.

**Alternatives considered:**
- Always use calendar month — simple, but incorrect for statement-cycle cards.
- Store a statement date per transaction — accurate but requires the user to input a date they may not know; and the statement day is a property of the card relationship, not the transaction.

**Why:** Most SG credit card caps reset on the statement date. Defaulting to calendar month silently overstates available headroom for users near their statement cutoff. All current cards default to calendar month for simplicity; switching a card to statement-cycle is a one-field update.

---

## 2026-06-09 — Block rounding via earn_increment on card_library

**Decision:** Add `earn_increment INTEGER` to `card_library` (5 for most SG banks, 1 for HSBC and Citibank). Miles earned = `floor(spend / increment) * increment * mpd`. Applied consistently across the engine, transaction save, MPD preview, and My Cards display.

**Alternatives considered:**
- Round the total miles at display time only — the stored `miles_earned` would be inflated; the displayed value would differ from the stored value.
- Store the rounding rule per rate row — too granular; the rounding block is a property of the bank's processing system, not of individual spend categories.
- Always round to S$1 — incorrect for most SG banks; overstates miles for small transactions.

**Why:** Banks in Singapore award miles in discrete blocks — a S$14.99 spend at a 4 mpd card with S$5 blocks earns 40 miles (S$10 × 4), not 59.96 miles. Not modelling this makes the recommender look more precise than reality and creates discrepancies between what users see in the app and what appears on their statements.

---

## 2026-06-10 — Smart effective_from default for first-time selectable category setup

**Decision:** In `Cards.tsx openEditModal`, detect whether the user has any existing category overrides for the card. If none exist, or if all existing overrides were set today, default `effective_from` to `'2000-01-01'` so the choice applies to all past transactions. If a prior override exists, default to today to preserve the category history.

**Background:** `effective_from` on `user_category_overrides` uses `isoDate()` which returns today's date. If a user sets up their Lady's Solitaire categories today and then logs a past transaction from last month, `resolveOverride` correctly rejects the override (because `effective_from > transactionDate`). This is the right behaviour when *changing* a category — old transactions should keep their old category. But it is wrong for *first-time* setup, where the user's intent is "this is the category I've always used."

**Alternatives considered:**
- Always default to `'2000-01-01'` — changes to category choice would retroactively re-categorise all past transactions, breaking historical accuracy.
- Always default to today — means first-time setup breaks for any past transactions (the bug reported).
- Prompt the user to choose the date explicitly — adds friction to a flow that most users won't understand.

**Why:** The heuristic (no overrides, or all overrides from today = first-time setup) is correct for the common case. A user who genuinely changed their category today and wants to preserve history can manually adjust the date field.

---

## 2026-06-10 — Feedback badge update via custom browser event (not Supabase realtime)

**Decision:** After the admin toggles a feedback item's status in `Admin.tsx`, dispatch a custom `'feedback-status-changed'` browser event. `Layout.tsx` listens for this event and re-fetches the open-item count to update the sidebar badge.

**Background:** The initial approach used Supabase realtime (`postgres_changes`) to listen for changes to the `feedback` table. The badge never updated because the `feedback` table was not included in the Supabase realtime publication (only tables explicitly added to the publication receive change events).

**Alternatives considered:**
- Add `feedback` to the Supabase realtime publication — requires a Supabase dashboard config change; also subscribes all users to all feedback changes, which is unnecessary.
- Poll on a timer — wastes requests; badge would lag by up to the poll interval.
- Re-fetch on every navigation — works but feels sluggish and adds unnecessary Supabase calls.

**Why:** Since the admin page and the layout sidebar are always co-rendered in the same browser tab, a custom event is instantaneous, zero-cost, and requires no external infrastructure. The event fires only after a confirmed Supabase write, so there is no risk of stale state.

---

## 2026-06-10 — Expense tracking via card_type discriminator (no separate schema)

**Decision:** Add a `card_type TEXT ('miles' | 'cashback' | 'debit')` column to `card_library` and gate all miles-specific engine logic on `card_type === 'miles'`. Cashback cards get a `cashback_rate NUMERIC` column; cashback earned is stored in a new `cashback_earned` column on `transactions`. A separate `library_cashback_rates` table holds per-category rate overrides (e.g. Citi's 8% dining/groceries).

**Alternatives considered:**
- Separate `cashback_cards` table — keeps schemas clean but duplicates the card management logic (wallet selection, transaction linking, card library display) for a new table type.
- Boolean `is_cashback` flag — doesn't accommodate a third type (debit/cash). A TEXT discriminator is extensible.
- Compute cashback at query time only, never store it — no persistent record of cashback earned; can't show historical cashback totals.

**Why:** A discriminator column on the existing `card_library` table means all existing wallet, transaction, and display logic works unchanged for the new card types. The miles engine is called inside a `card_type === 'miles'` guard, so cashback/debit transactions never touch miles-specific code paths. `cashback_earned` stored on the transaction provides the same queryable history as `miles_earned`.

**Trade-off:** `cashback_rate` and `cashback_earned` are NULL for miles cards; `miles_earned` and `effective_mpd` are NULL for cashback/debit cards. This is correct — the columns are type-specific — but it means any aggregate across all transactions must handle NULLs carefully.

---

## 2026-06-10 — Cash/Debit as a system-level virtual card (never in the user's wallet)

**Decision:** The Cash / Debit card (`card_type = 'debit'`) lives in `card_library` but is never added to `user_card_selections`. Instead, `AppContext` exposes an `allCards` array (wallet cards + all debit cards from the library) that is used wherever Cash/Debit must appear: the transaction form card dropdown, the transaction list card lookup, and the Dashboard recent transactions lookup. The Cards library page filters out debit cards (`card_type !== 'debit'`).

**Alternatives considered:**
- Add Cash/Debit to every user's wallet automatically during onboarding — requires a migration to back-fill existing users; also pollutes the wallet with a non-bank card.
- Let users add Cash/Debit to their wallet like any other card — works, but it is conceptually wrong (Cash/Debit is not a credit card product) and creates an empty-wallet edge case if a user removes it.
- Store cash transactions without a `card_id` — breaks all the card-based filtering and display logic; "No card" would appear everywhere.

**Why:** Injecting debit cards via `allCards` (a separate in-memory collection) keeps the wallet semantics clean while ensuring Cash/Debit is always available with zero user setup. Debit cards are hidden from the Cards page and the wallet filter chips by default; they only surface in the transaction form, the transaction list filter, and the Dashboard wallet section when debit spend exists.

---

## 2026-06-10 — Dedicated Expenses page vs. expanding the Dashboard

**Decision:** Move the full expense breakdown (spend by card type, by category, by card with rewards) to a dedicated `/expenses` route. Keep the Dashboard focused on three headline stats, spend milestones, wallet cap bars, and recent transactions.

**Alternatives considered:**
- Collapsible sections on the Dashboard — hides content without removing the rendering cost; the Dashboard was already crowded.
- Tabs on the Dashboard (Miles / Expenses) — improves discovery but the Dashboard component grows very large; hard to deep-link.
- Keep everything on the Dashboard — was the original approach; the page became cluttered when expense tracking added a full spend-by-category breakdown on top of cap bars and milestones.

**Why:** A dedicated page keeps each route's scope clear: Dashboard = "how am I tracking this month?"; Expenses = "where did my money go?" The split also allows the Expenses page to evolve independently (e.g. date-range filters, CSV export) without touching the Dashboard.

**Trade-off:** One extra navigation step to see full spending detail. Mitigated by the Expenses link in the sidebar nav.
