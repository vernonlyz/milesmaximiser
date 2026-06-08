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

## 2026-06-08 — Client-side recommendation engine (no server-side compute)

**Decision:** The entire recommendation and miles-calculation engine runs in the browser against in-memory data loaded at login.

**Alternatives considered:**
- Server-side function (Supabase Edge Function) that takes a transaction and returns miles — moves logic to the server, enables future server-push updates, but adds round-trip latency on every recommendation request and couples the UX to network availability.
- Stored procedure in Postgres — performant for batch recalculation but very hard to test and iterate on.

**Why:** The dataset is small (14 cards, hundreds of transactions max). Client-side execution means zero latency for recommendations — the user gets instant feedback while typing an amount. The engine is pure TypeScript, easily unit-testable. There is no sensitive computation to protect on the server.

**Trade-off:** All users download the full library on login (~small JSON). Logic bugs require a re-deploy to fix rather than a server patch. Accepted at current scale.
