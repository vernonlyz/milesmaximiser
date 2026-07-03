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

---

## 2026-06-11 — Fluid layout: remove all max-width constraints

**Decision:** Remove all `max-w-*` Tailwind constraints from Dashboard, Cards, Recommend, and Expenses. Use `2xl:` breakpoint variants (≥1536px) for grids that would stretch awkwardly on wide monitors — Dashboard milestones `sm:grid-cols-2 2xl:grid-cols-4`, Cards library `grid-cols-1 2xl:grid-cols-2`, Recommend `lg:grid-cols-[2fr_3fr]`.

**Alternatives considered:**
- Keep `max-w-7xl` — content is horizontally centred with large empty margins on 2K/4K monitors; screen real estate wasted.
- Increase max-width (e.g. `max-w-screen-2xl`) — slightly more content but still a hard boundary; all monitors wider than that still see margins.

**Why:** The app is a personal dashboard — users benefit from seeing more data at once on large monitors. Removing hard limits and letting Tailwind breakpoints control column count gives a natural, proportional layout at every width without empty gutters.

**Trade-off:** Very wide line lengths in full-width text blocks on ultra-wide monitors. Mitigated by the grid layout breaking text into columns at `2xl:`.

---

## 2026-06-11 — Cross-device onboarding guard via Supabase-backed hasActivity

**Decision:** Replace the pure-localStorage `isOnboarded` guard with a combined check: `hasActivity = cards.length > 0 || transactions.length > 0`. If `hasActivity` is true but the localStorage flag is absent (new device, new domain), `markOnboarded` is called immediately so the user is not redirected to onboarding. The redirect to `/onboarding` only fires when `!loading && !error && user && !hasActivity && !isOnboarded(user.id)`.

**Background:** `localStorage` is per-device and per-domain. An existing user logging in on a phone for the first time, or after a domain migration, had no `isOnboarded` flag in their new localStorage and was incorrectly sent to the onboarding flow. A secondary bug caused the redirect to fire before the error check — if Supabase failed to load `cards`, an empty array triggered the redirect even though the user was onboarded.

**Alternatives considered:**
- Store `isOnboarded` in Supabase (user profile table) — correct cross-device, but requires a schema migration and a database read on every login before showing the dashboard.
- Use the presence of `user_card_selections` rows as the sole signal — accurate for wallet cards but misses users who have only transactions (no wallet cards currently selected).

**Why:** `hasActivity` (cards OR transactions) is a reliable proxy for "this user has been through onboarding" and is already loaded from Supabase at login with no additional round-trip. Proactively setting the localStorage flag when `hasActivity` is true means subsequent page loads on the same device are instant (no Supabase check needed).

**Trade-off:** A brand-new user who adds their first card and then opens the app on a second device before any Supabase data has loaded (extremely unlikely) would briefly see onboarding on the second device. The `!error` guard prevents a network failure from triggering a redirect.

---

## 2026-06-11 — Group-spend split: optional collapsible section, personal_amount on transaction

**Decision:** Add an optional "÷ Split with group?" collapsible section below the Amount field in the transaction form. When expanded it shows quick-pick chips (÷2 / ÷3 / ÷4) and a custom "My share" free-entry field. The user's personal share is stored as `personal_amount NUMERIC` on the transaction (migration 025). When `personal_amount` is null the full amount belongs to the user. Miles and cashback are always computed on the full `amount` column — `personal_amount` only affects spend views.

**Alternatives considered:**
- Always-visible "My share" field — adds friction for every transaction even though group spends are the minority case; requires validation to explain why the field is sometimes needed.
- Separate "group" transaction type — would require a different flow and schema; doesn't integrate naturally with the existing card/category/amount model.
- Compute personal share at display time from a stored split ratio — less flexible than storing the actual share; can't handle custom odd splits (e.g. S$32 out of S$97).

**Why:** Collapsible section preserves zero friction for the common (solo) case. The quick-pick chips cover the most common splits (equal division); the custom field handles everything else. Storing `personal_amount` directly (not a ratio) is simpler and makes every query straightforward — no multiplication needed at read time.

**Trade-off:** Miles and cashback always computed on the full card charge. This is correct: the card earns rewards on the full amount billed. The Expenses page and Dashboard sub-line reflect personal share separately so users can see both views.

---

## 2026-06-11 — Expenses view toggle hidden until first group spend exists

**Decision:** The "Card spend / My spend" toggle on the Expenses page is only rendered when `hasGroupSpends` is true (`monthTxns.some(t => t.personal_amount != null && t.personal_amount !== t.amount)`). First-time and solo users see a single-view Expenses page with no toggle.

**Alternatives considered:**
- Always show the toggle — adds UI chrome that means nothing until group spends exist; "My spend" and "Card spend" would show identical numbers.
- Show the toggle greyed out with a tooltip — draws attention to a feature the user hasn't used yet; potentially confusing.
- Separate `/expenses/my` and `/expenses/card` routes — over-engineering; the toggle state doesn't need to be deep-linkable.

**Why:** Progressive disclosure keeps the UI simple for users who never use group splits. The toggle appears naturally the first time a user logs a group expense, at which point the distinction is immediately meaningful.

**Trade-off:** The toggle is per-month (`monthTxns` scope), so if a user's current month has no group spends but previous months do, the toggle is hidden this month. Acceptable — the Expenses page is month-scoped throughout.

---

## 2026-06-12 — Log Transaction shortcut on Dashboard via navigation state

**Decision:** Add a "Log Transaction" primary button to the Dashboard header. On click it calls `navigate('/transactions', { state: { openModal: true } })`. Transactions reads `location.state.openModal` in a mount-time `useEffect`, calls `openAdd()`, then clears the history state with `window.history.replaceState({}, '')` so back-navigation doesn't re-open the modal. The Refresh button is hidden on mobile (`hidden sm:inline-flex`) to keep the header uncluttered.

**Alternatives considered:**
- Lift the transaction modal into a global context rendered in Layout — correct UX (user stays on Dashboard after saving), but requires extracting the modal and all its state out of Transactions into a shared component. Significant refactor for marginal benefit at current scale.
- Duplicate a simplified modal on Dashboard — code duplication; would diverge from the full modal over time.
- Floating action button (FAB) — common mobile pattern, but inconsistent with the rest of the app's header-button style.

**Why:** Navigation state is the minimal-change solution: zero duplication, full modal functionality, and the user lands on the Transactions page after saving which is a natural post-log destination. Clearing history state prevents the modal re-opening on back-forward navigation.

**Trade-off:** User is navigated away from Dashboard after logging. Acceptable — the Transactions page shows the newly added entry immediately, and Dashboard is one tap away via the sidebar.

---

## 2026-06-12 — Excel export with both Card Spend and My Spend in one workbook

**Decision:** The Expenses "Export Excel" button always exports both Card Spend and My Spend as side-by-side columns on every sheet, computed independently of the current toggle state. A dedicated "Definitions" sheet (first tab) holds all term explanations; data sheets start on row 1 with no inline note rows. Personal Share column is always populated (`personal_amount ?? amount`) so the column can be summed without handling blanks.

**Alternatives considered:**
- Export only the currently active view mode — user must remember to toggle before exporting; two separate downloads needed to get both views.
- Separate sheets per mode (Card Spend sheet + My Spend sheet) — more sheets, harder to compare values side by side.
- Inline note rows on each sheet — clutters data; breaks pivot tables and filters that expect headers on row 1.

**Why:** Side-by-side columns in a single download gives the most analytical flexibility — the user can compare both views at a glance in Excel without re-exporting. Computing both views in the export function (not from React state) eliminates any dependency on which toggle was active at export time. The Definitions sheet keeps the workbook self-documenting without polluting data rows.

**Trade-off:** Column count on breakdown sheets is wider than a single-view export. Acceptable — the extra columns are immediately useful for users who use the group-spend split feature.

---

## 2026-06-13 — Trends tab: own Supabase fetch rather than AppContext transactions

**Decision:** `ExpensesTrends` fetches its own data directly from Supabase using a date-range query, independent of the `transactions` array in AppContext.

**Background:** AppContext loads only the current calendar year's transactions. A 12-month or custom range that spans into a prior year would silently show incomplete data if the component read from AppContext.

**Alternatives considered:**
- Extend AppContext to accept an arbitrary date range — AppContext is designed as a session-wide cache; parameterising its fetch would either require a re-fetch every time the Trends range changes or a much more complex cache.
- Load all transactions in AppContext — unbounded over time; no natural ceiling.

**Why:** A standalone query is the minimal-change solution. Trends is the only view that needs cross-year data; isolating the fetch to the component that needs it keeps AppContext simple and avoids re-fetching data that other views don't need.

**Trade-off:** Two places now load from the `transactions` table (AppContext and ExpensesTrends). If a user adds a transaction during the same session, ExpensesTrends will not reflect it until the user changes the date range (triggering a re-fetch). Acceptable for an analytics view.

---

## 2026-06-13 — Statement day semantics: cycle START day, not closing day

**Decision:** `statement_day` in `user_card_selections` is defined as the day the billing cycle **starts**, not the day it closes. All UI labels are updated to say "billing cycle starts on day N" instead of "statement closes day N".

**Background:** The engine (`getPeriodStart` in `utils.ts`) already computed the period start as the month containing `statement_day`. If a user entered day 23 and the engine treated it as the start, then "your cycle starts on the 23rd" is correct. The original UI labels said "statement closes day" which implied a different value (e.g. closing on the 23rd implies a cycle start around the 24th).

**Why:** The label was wrong; the logic was right. Fixing only labels avoids any data or engine changes. A user who enters day 1 gets a cycle that starts on the 1st, which also ends on the 30th/31st of the prior month — both interpretations are consistent.

**Trade-off:** Users who previously entered their closing date (rather than start date) may now have an off-by-one-month cycle. They can correct the value on the My Cards page at any time.

---

## 2026-06-13 — Cycle-end proximity warning: 5-day threshold

**Decision:** Show an amber warning in the transaction form when the selected card is a miles or cashback card and the transaction date is within 5 days of the billing cycle end (inclusive of the end day itself). Computed via `getPeriodEnd` from `utils.ts`.

**Alternatives considered:**
- 3 days — too tight; bank posting can take 2–3 business days.
- 7 days — reasonable but produces warnings for a full week, which users may start ignoring.
- Show only on the exact cutoff day — too late to be actionable.

**Why:** 5 days gives enough notice to be useful (posting may cross the cutoff) without being noisy. The warning is informational only — it does not block saving the transaction. Debit cards are excluded because they have no cap cycle and their spend is not reward-relevant.

---

## 2026-06-13 — StatementDayPrompt: per-session dismissal, not persisted

**Decision:** The `StatementDayPrompt` modal is dismissed per-session only (local `useState`). Closing it without saving will show it again on the next page load. No localStorage or Supabase persistence for the dismissed state.

**Alternatives considered:**
- Persist dismissed state in localStorage — user sees the prompt once per device, then never again even if they still haven't set a statement day. Too easy to permanently ignore.
- Persist in Supabase (`user_card_selections.prompted_at`) — requires a schema column just for UI state.
- Show on every page transition — too aggressive; a single-session dismissal is enough to avoid interrupting a workflow mid-session.

**Why:** The prompt is gating-important information (cycle start day) that affects cap accuracy. Showing it once per session (until they save) is a good balance: non-blocking within a session, but persistent enough to eventually get the user to set the value. The "Remind me later" button is an honest label — it reminds them next session.

---

## 2026-06-13 — Mobile Trends charts: 3M default, angled labels, useIsMobile hook

**Decision:** On screens narrower than 640px, `ExpensesTrends` defaults to 3-month range, angles X-axis labels at −40°, uses compact Y-axis tick formatting (`$1k`), moves the chart legend to the top, and reduces `barCategoryGap` to `"12%"`. A `useIsMobile()` hook (`useState(() => window.innerWidth < 640)` + resize listener) drives all responsive config.

**Background:** Six months of grouped bars (18 bars per chart on mobile) were unreadably cramped on small screens. X-axis labels overlapped; Y-axis dollar values were too long.

**Alternatives considered:**
- Horizontal bar charts on mobile — avoids label crowding, but Recharts horizontal bars are less intuitive for time-series grouped data.
- Scrollable chart container — allows full 6M view but users may not discover horizontal scroll; also causes swipe conflicts on touch.
- Reduce to 2 bars per month on mobile (merge cashback+debit) — loses useful detail.

**Why:** Fewer bars (3M default) + angled labels + compact numbers is the least-invasive change that makes the chart readable without restructuring the chart type. The user can still select 6M or 12M if they want; the 3M default is just the sensible mobile starting point.

---

## 2026-06-12 — Onboarding redirect: dataLoaded guard via allCards.length

**Decision:** Add `dataLoaded = allCards.length > 0` as an additional condition on the Dashboard onboarding redirect. The redirect only fires when `!loading && dataLoaded && !error && user && !hasActivity && !isOnboarded(user.id)`.

**Background:** There is a one-frame race condition in the auth/data loading sequence:
1. On app mount, `loading = true` (useState initial).
2. AppContext `useEffect` fires with `user = null` → hits the `else` branch → `setLoading(false)`.
3. Auth resolves → `user` becomes non-null → `useEffect` fires again and calls `refresh()`.
4. But `refresh()` sets `loading = true` only in the *next* React render. In the render that sees the new `user` for the first time, `loading` is still `false` from step 2.
5. In that frame: `loading = false`, `user ≠ null`, `cards = []`, `transactions = []` → redirect fires incorrectly.

**Alternatives considered:**
- Set `loading = true` synchronously in the `useEffect` before calling `refresh()` — `setLoading` is itself async in React; the state update is still queued and doesn't prevent the render from seeing the old value.
- Store onboarded flag in Supabase — correct cross-device, but requires a DB migration and extra read on every login.
- Check `user.created_at` and only show onboarding to accounts created within the last few minutes — works but introduces a time-based heuristic that can fail at the boundary.

**Why:** `allCards` is the full card library fetched from Supabase. It is always non-empty (23+ cards) after a successful load and always empty before any data arrives. It is therefore a reliable, zero-cost "data has been fetched for this user" signal that collapses the race window to zero without any schema changes.

**Trade-off:** If the card library itself is somehow empty (e.g., library not seeded), `dataLoaded` would be permanently false and the redirect would never fire. Acceptable — an empty library is a broken deployment, not a user scenario.

---

## 2026-06-20 — Miles Balance: account model with dated snapshot + ledger (migrations 027–028)

**Decision:** Track miles via a `miles_accounts` row that owns a balance — `opening_miles` + `as_of_date` (a dated snapshot) + `expiry_date` — with cards linked through `miles_account_cards` (a card belongs to exactly one account) and a `miles_adjustments` ledger of dated redemptions (negative) and bonuses (positive). **Account total = opening + Σ(transaction miles_earned for linked cards where date > as_of_date) + Σ(adjustments where date > as_of_date).**

**Alternatives considered:**
- One row per card with `opening_miles` + a single "redeemed" field (the first cut, migration 027). Couldn't represent UOB-style pooling (several cards → one balance), lost redemption history on every edit, and double-counted: the opening balance already reflects past spending, so summing *all* transactions on top double-counts.
- Track at programme level only (e.g. one "KrisFlyer" row) — cleaner conceptually but loses per-card earned visibility.

**Why:** A card normally maps to one account (pool-of-one), but UOB pools several cards into one miles balance — the link table models both uniformly. Counting only *post-snapshot* earned + adjustments is the key correctness rule: the opening balance is a point-in-time figure that already includes earlier activity, so anything dated at/before the snapshot is "baked in." This also makes **Reconcile** correct — it folds the current total into a fresh opening as of today and resets the running count, with the ledger preserved (pre-snapshot entries shown muted).

**Trade-off:** Expiry is a single manual date per account (no per-batch rolling expiry) — accepted as the "simple + manual" scope the user chose. A default "KrisFlyer miles" account is auto-seeded per user, keyed in `localStorage` (so deleting it doesn't resurrect it) and matched by exact name (so a "UOB KrisFlyer Visa" card account doesn't suppress it).

---

## 2026-06-20 — Cap double-counting: channel caps exclude category-cap spend (display only)

**Decision:** In `buildPeriodSpending`, when a card has a payment-channel cap (`cap_payment_channel`), any transaction paid via that channel is excluded from that card's category/group cap sums — it is attributed solely to the channel cap.

**Background:** UOB Preferred Platinum has two independent S$600 caps: a contactless **channel** cap and an Online Shopping **category** cap. The dashboard summed each cap across all transactions independently, so a purchase tagged both Online Shopping *and* contactless (the card defaults the channel to contactless) appeared in both bars at the same value.

**Why:** The recommendation engine already attributes such a transaction to the channel cap (channel caps take precedence). The fix makes the dashboard display mirror the engine, so the same dollars are never counted twice. Cards without channel caps are unaffected. Complementary data fix: the transaction form defaults the Online Shopping category to the `'online'` channel, since online shopping is card-not-present and shouldn't land in a contactless cap.

---

## 2026-06-20 — PWA: autoUpdate service worker with cache cleanup

**Decision:** Configure `vite-plugin-pwa` with `registerType: 'autoUpdate'` and workbox `cleanupOutdatedCaches: true` + `skipWaiting: true` + `clientsClaim: true`. `UpdatePrompt` reloads once on `controlling` when `event.isUpdate` is true.

**Background:** Rapid deploys change the hashed JS filenames. Mobile devices (which evict cache aggressively) were left with a service worker serving a stale precached `index.html` pointing at chunks that no longer existed → blank white screen. Desktop, with an intact cache, was unaffected.

**Why:** `cleanupOutdatedCaches` purges precaches from previous deploys; `skipWaiting` + `clientsClaim` make the newest SW take control immediately instead of lingering on the stale one. The app ships as a single bundle (no route-level code-splitting *of the SW precache concern*), so `skipWaiting` is safe. The `isUpdate` guard prevents a reload loop on first install.

**Trade-off:** An auto-reload can interrupt a mid-session form on the rare deploy; acceptable versus the blank-screen failure. Note both `vite.config.js` and `vite.config.ts` exist — Vite resolves the `.js` first, so both must be kept in sync.

---

## 2026-06-21 — Favourites prefill the form; they do not auto-post

**Decision:** "Favourite" transactions are saved templates that prefill the Add Transaction form on today's date for the user to confirm and save. They store only reusable inputs (card, category, vendor, MCC, channel, optional amount, notes) — never computed miles/cashback. No auto-posting on a schedule.

**Alternatives considered:**
- One-tap instant log (no confirmation) — fast but easy to misfire and needs a fixed amount.
- Auto-post every month — true "recurring", but risky when amounts vary or a charge doesn't happen, and would post stale rates.

**Why:** Amounts and dates vary, and rates/caps change — recomputing on save (the normal path) keeps miles accurate and avoids wrong auto-entries. Amount is optional so steady bills can store a fixed value while variable ones are typed each time.

---

## 2026-06-22 — My Cards: uniform tile grid + details modal (vs masonry / table)

**Decision:** Render the card library as one continuous responsive grid of uniform compact tiles (sorted by bank), with full rates/caps/remarks/statement in a per-card **Details modal**. Replaced an earlier per-bank masonry layout.

**Alternatives considered:**
- Per-bank sub-grids (what existed) — each bank with 1–2 cards left columns half-filled, producing a patchwork of differently-filled mini-grids; collapsible inline bodies made heights ragged.
- CSS-columns masonry — packs varying heights tightly but orders column-major and still mixes heights.
- Dense list/table on desktop — most information-dense, but loses the card aesthetic.

**Why:** The mess came from rendering full, variable-length detail inside every grid item. Moving detail into a modal makes every tile the same compact height, so a single grid stays aligned regardless of how much each card carries. Actions are pinned to the tile bottom (`flex` + `mt-auto`) so rows line up. The bank/type/wallet filter chips replace the need for per-bank section grouping.

**Trade-off:** Full details now require a click (modal) rather than being inline; accepted for the large gain in scannability and alignment.

---

## 2026-06-21 — Code-split route pages; merge Miles into one tabbed section

**Decision:** Lazy-load all route page components with `React.lazy` + `Suspense` (a boundary around the Layout `Outlet` keeps the shell mounted). Collapse the two Miles pages into one "Miles" sidebar entry with Balance / Earned tabs.

**Why:** The build warned the bundle was ~1.2 MB in a single chunk; everything loaded upfront. Code-splitting drops the initial load to ~425 KB and defers recharts (~358 KB) to chart pages only — the biggest perceived-speed win on mobile. Tabs trim an 8-item sidebar and group the closely-related Miles views. (Core app *data* is still loaded upfront via AppContext — only the JS is split.)

**Trade-off:** A failed lazy-chunk load on a flaky network now needs an error boundary (still outstanding). On the Earned tab the sidebar "Miles" item doesn't highlight (route is `/earnings`), but the tab bar conveys location.

---

## 2026-06-22 — Miles goal: one cumulative target in user_settings (not per-account)

**Decision:** Track a single miles goal per user — a target against the **cumulative total across all accounts** — stored in a new `user_settings` singleton table (`miles_goal` + `miles_goal_label`). This replaced an initial per-account `goal_miles` column (migration 030 → 031 drops it).

**Background:** The goal was first built per `miles_accounts` row, but a redemption target ("100k KrisFlyer for SQ Suites to JFK") is naturally about *all* your miles, not one card/pool. The user asked for one tracker against the grand total.

**Why:** A per-user singleton matches the concept (one goal), syncs across devices (unlike localStorage), and renders once in the "Total miles" card instead of cluttering every account. `user_settings` is a generic per-user table that can hold future preferences. The progress bar carries an airplane marker (positioned at the current %) and an optional free-text title, making the goal read as a concrete trip.

**Trade-off:** Only one goal at a time (no multiple simultaneous targets). Acceptable for the single-user scope; multiple goals would need a separate table.

---

## 2026-06-24 — Recurring charges: due→confirm via favourites, no backend scheduler

**Decision:** Model recurring charges as favourites with an optional monthly schedule (`recurrence`/`recur_day`/`next_due_date`; migration 033). Occurrences are generated lazily when the user opens the app and surfaced on the Dashboard as "due to log"; **Confirm** opens the log form prefilled and dated to the due date (miles computed on save) and advances `next_due_date` one month; **Skip** advances without logging. One pending occurrence per rule at a time.

**Alternatives considered:**
- Auto-post on app open (back-dated) — hands-off but risky for variable amounts/missed charges, posts stale rates, and needs duplicate-guarding.
- A true scheduler (Supabase scheduled Edge Function) — posts while the app is closed, but a bigger lift and still wouldn't let the user vet variable amounts.
- A separate `recurring_charges` table — duplicates the favourite template fields; a favourite already stores card/category/vendor/amount.

**Why:** There is no backend cron in this client + Supabase app, so nothing can post while closed — "generate on open, user confirms" is the honest, safe model. Confirming recomputes miles against current rates/caps and lets the user adjust variable amounts. Advancing `next_due` only on confirm/skip means exactly one pending per rule, so no duplicates even after a long absence.

**Trade-off:** It's a smart reminder, not automation — a charge due on the 1st only appears when the app is next opened. Monthly-only in v1.

---

## 2026-06-24 — Partial cap: floor each rate tier to the earn block independently

**Decision:** When a transaction partially exceeds a cap, compute miles as `floor(min(amount, capRemaining)/inc)·bonusMpd + floor(max(0, amount−capRemaining)/inc)·baseMpd` — each tier floored to the card's earn block (`inc`) on its own. Applied in the engine (`getEffectiveForCard`, saved miles) and the `PartialBonusNote` display (Recommend cards + log preview).

**Background:** The earlier logic floored the whole amount once then split at the raw cap remaining, which didn't match how blocks straddling the cap boundary actually earn. Example ($23 cap left, $200 spend, $5 block): bonus on $20 (80 mi) + base on $175 (70 mi); the $3 and $2 partial blocks don't earn.

**Why:** Miles are awarded per whole block within a rate tier; a block split across the cap boundary or the end of spend shouldn't earn. Flooring each tier independently reflects that, and showing the split (instead of only the blended effective rate) makes the bonus visible to the user.

**Trade-off:** A few dollars near the boundary earn nothing — intentional and accurate to block-based earning, but slightly less than the naive single-floor.

---

## 2026-06-30 — All date-boundary math is local (SGT), string-compared

**Decision:** `isoDate()` formats the **local** calendar date (never `toISOString()`), and every period-boundary check compares `transaction_date` (`YYYY-MM-DD` string) against `isoDate(periodStart)`/`isoDate(periodEnd)` rather than comparing `Date` objects.

**Background:** `new Date('2026-06-30')` parses as UTC midnight = 08:00 SGT, while period bounds were built with local `Date` constructors (00:00 SGT), and month bounds used `toISOString().slice(0,10)` (shifts ~8h back). In SGT this excluded **last-day-of-month** transactions from the Dashboard month total, per-card spend/category breakdown, and cap usage — for all cards. Reported as a DBS Woman's World "travel doesn't count" bug on the 30th.

**Why:** Transaction dates are date-only strings; the only robust comparison is local `YYYY-MM-DD` strings on both sides, with no UTC conversion anywhere. Fixing the shared `isoDate()` helper plus the boundary comparisons (engine `buildPeriodSpending` + resolvers, Dashboard, AppContext year start, Miles `today()`) closes the whole class.

**Trade-off:** None functionally; `isoDate()` is now slightly more code than a one-liner. New date logic must avoid `toISOString()` for calendar dates and must not mix `new Date(str)` with local `Date` bounds.

---

## 2026-07-01 — Vitest for the engine; test the pure functions, not the UI

**Decision:** Add Vitest and unit-test `recommendations.ts` directly (resolvers, `buildPeriodSpending`, `calcMiles`, `recommendCards`) with small fixture factories. Tests run in the `node` environment (no DOM); a separate `vitest.config.ts` keeps the PWA Vite plugin out of the test run; `*.test.ts` is excluded from the production `tsc -b` build via `tsconfig.app.json`.

**Alternatives considered:**
- No tests (status quo) — every engine change risked a silent regression; the recent partial-cap rewrite and SGT timezone bug showed how easily correctness drifts.
- Component/integration tests (Testing Library + jsdom) — higher setup cost and slower, and the real risk lives in the engine math, not the rendering.
- E2E (Playwright) — valuable later, but heavy and doesn't pin down per-branch arithmetic.

**Why:** The engine is pure, deterministic, and the highest-value/highest-risk code (cap types, blended/partial MPD, wildcard + channel caps, min-spend, block rounding, date boundaries). Pure-function tests are fast, fixture-driven, and read as executable spec — the partial-cap and end-of-month-boundary cases now lock in exactly the behaviour we hand-derived. Excluding test files from the build keeps deploys unaffected.

**Trade-off:** UI/data-loading paths remain untested; a broken page render is caught by the error boundary at runtime, not by CI. Acceptable — the engine is where wrong numbers would silently cost miles.

---

## 2026-07-01 — Error boundary: reload-first, keyed per route

**Decision:** A single `ErrorBoundary` class component wraps both the Layout `Outlet` (keyed by `location.pathname`) and the app root. Its fallback offers **Try again** (reset state) and **Reload**; when the caught error looks like a failed dynamic import (`Loading chunk` / `Failed to fetch`), it hides "Try again" and steers straight to a full reload.

**Alternatives considered:**
- No boundary (status quo) — a failed lazy-chunk load or a render crash showed a blank white screen, the worst possible failure mode on mobile.
- Boundary only at the root — would catch the error but lose the app shell and not auto-clear on navigation.
- A library (react-error-boundary) — fine, but a ~60-line class with the exact reload/reset UX we want avoids a dependency.

**Why:** Routes are code-split, so the realistic failure is a stale chunk after a deploy — a reload (fetching the fresh manifest) fixes it, hence reload-first for chunk errors. Keying the Layout boundary on the route means navigating away automatically clears a page-level error without a manual reset. The root boundary is the catch-all for Login/Onboarding.

**Trade-off:** Non-throwing failures (e.g. a Supabase query that returns an error but renders an empty state) aren't caught — those still need per-page error UI.

---

## 2026-07-03 — Pin Vitest to the project's Vite major (v5), not the latest

**Decision:** Pin `vitest` to `^2` (Vite 5 compatible) instead of the latest `vitest@4`. The Cloudflare Pages build failed at install with `npm ci` → "Missing: esbuild@0.28.1 from lock file".

**Root cause:** Vitest 4 bundles Vite 6/7, which pulls a **second** esbuild (0.28.1) alongside the app's Vite 5 esbuild (0.21.5). npm 11 (local) and npm 10.9.2 (Cloudflare) dedupe that dual-esbuild tree differently, so a `package-lock.json` generated locally was incomplete for Cloudflare's `npm ci` (which requires an exact lock ↔ package.json match).

**Alternatives considered:**
- Regenerate the lockfile and re-push — same npm-version dedup ambiguity would likely recur.
- Pin the Cloudflare build to npm 11 / node 24 (match local) — fragile; couples CI to a local toolchain version and still carries two esbuild trees.
- Keep vitest 4 and add an `overrides`/resolution to force one esbuild — brittle and fights the tool.

**Why:** Aligning the test runner with the project's existing Vite major means a **single** esbuild version in the tree, so the lockfile is unambiguous across npm versions and `npm ci` is stable everywhere. Vitest 2's `describe/it/expect` API is identical for our tests — zero test changes, still 18/18 passing.

**Trade-off:** We're a major behind on Vitest. Revisit only when the app itself upgrades to Vite 6/7 — at which point vitest and the app share the newer esbuild again and the constraint dissolves.
