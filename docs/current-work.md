# Current Work

## Development timeline

The project was started on 2026-06-04 and all 18 commits landed within four days (June 4–7). The pace has been rapid, with the most recent sprint entirely focused on the dashboard.

```
2026-06-04  Initial commit → Cloudflare Pages deploy config
2026-06-07  Onboarding, Google OAuth, UOB cards, Card Library picker
2026-06-07  Effective-date versioning for rates/caps
2026-06-07  Refactor to centralised card library model (migration 004)
2026-06-07  Dashboard fixes and polish (5 commits)
2026-06-07  (HEAD) Keep existing users on dashboard after migration
```

---

## Completed

Everything listed below is in a working, deployed state:

- **Auth** — Email/password and Google OAuth, per-user RLS, protected routes
- **Card library model** — Centralised read-only `card_library` with 14 SG cards, seeded via `library_seed.sql`
- **Effective-date versioning** — `library_rates` and `library_caps` both carry `effective_from`; the engine resolves the current-date slice correctly
- **Onboarding flow** — First-run card selection grid; skip allowed; `isOnboarded` flag stored in localStorage
- **Wallet management** — Add/remove cards from `user_card_selections`; reflected immediately in all views
- **Recommendation engine** — Cap-aware MPD calculation covering monthly, quarterly, annual, and per-transaction caps; blended effective MPD for partial caps; status enum (optimal / partial / capped / base)
- **Transaction logging** — Add modal with live top-3 recommendations; miles and effective MPD computed and stored on save; delete with confirmation
- **Transactions page** — Filterable table (month, category, card); summary row totals
- **Dashboard** — Monthly stats, wallet card list with cap progress bars, monthly spend/miles per card, recent transactions sidebar
- **Empty-state handling** — Dashboard shows "Go to My Cards" CTA for users with no wallet cards (including those whose wallet was cleared by the migration 004 rollout)
- **Responsive layout** — Mobile sidebar overlay and hamburger menu

---

## Partially completed

### 1. Combined spending caps (known inaccuracy)

Some cards have a single shared cap across multiple categories (e.g. UOB Visa Signature: S$2,000/quarter across Dining, Groceries, and Petrol combined). The current model stores these as three independent per-category caps. The engine therefore treats each category as having its own S$2,000 limit, which overstates available headroom. A user who spends S$2,000 on Dining alone will still be shown Groceries and Petrol as having full caps available.

Fixing this requires a schema change (a `cap_group_id` linking related rows, or a `global` cap type) and engine updates to aggregate spend across grouped caps before comparing against the limit.

### 2. Multi-choice bonus category for some cards — **completed 2026-06-08**

Per-user bonus category selection is now implemented for UOB Lady's Card and Lady's Solitaire (migration `005_selectable_categories.sql`). Users set their chosen category in My Cards; the choice is stored with an `effective_from` date so past transactions remain accurate. The engine substitutes the chosen category into the library's bonus slot at query time — no changes to existing rate/cap data.

Remaining gap: Lady's Solitaire supports 2 chosen categories in real life. The schema (`category_ids UUID[]`) is ready for this, but the current seed models only 1 bonus slot per card. Enabling dual-choice for Solitaire requires adding a second rate + cap row to the library seed.

### 3. Error handling outside Dashboard

Dashboard has a full error state (retry button, connection hint). Cards, Recommend, and Transactions all render an empty state silently if a Supabase query fails — there is no user-visible indication that something went wrong.

### 4. Admin tooling for library updates

The card library (rates, caps, new cards) is updated via manual SQL in the Supabase dashboard. There is no admin UI. This is workable at the current library size but fragile — a typo in a rate or a missed `effective_from` date would affect all users immediately with no rollback mechanism.

---

## Likely next task

The last five commits were all dashboard iteration, ending with the post-migration empty-state fix. That work appears done. Based on the remaining gaps, the most natural next step is:

**Fix the combined spending cap model.**

It is the most significant accuracy issue in the core recommendation engine. The UOB Visa Signature and UOB Preferred Platinum cards both have combined caps that are currently modelled incorrectly. A user relying on the app to manage these cards will be shown incorrect remaining headroom, which undermines the app's core value proposition.

The fix scope:
1. Add a `cap_group_id` column (nullable UUID) to `library_caps` — rows sharing a group are treated as one combined cap.
2. Update `buildPeriodSpending` in `recommendations.ts` to aggregate spend across grouped rows before comparing against `spend_limit`.
3. Update `resolveCaps` or the cap-consumption logic in `getEffectiveForCard` to check group-level spend, not just per-category spend.
4. Update `library_seed.sql` to tag the relevant rows with matching group IDs.
5. Update the `CapUsageBar` on Dashboard and Recommend to render grouped caps as a single bar.

The second most likely candidate is **adding a unit test suite** for `recommendations.ts`, which has complex branching logic around the four cap types and the blended MPD calculation — currently entirely untested.
