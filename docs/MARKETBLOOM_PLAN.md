# MarketBloom — Phase 0 audit & implementation plan

_Last updated: 2026-11-09 · branch `feature/marketbloom-phase-1`_

## 1. Repository

| Item | Finding |
| --- | --- |
| Repo | `Sharbi4/screenshot-to-spark-8746`, Lovable project **Marketbloom** (`dabd7db3…`). HEAD `d0010f6` matched Lovable's latest commit at audit time. |
| Sync | Lovable syncs the `main` branch both ways. Work happens on feature branches. Merging to `main` puts it in the Lovable editor. Publishing stays a manual step in Lovable. |
| Framework | TanStack Start 1.168 (React 19, file-based routes in `src/routes`, server functions via `createServerFn`), Vite 8, Tailwind v4, shadcn/ui primitives, framer-motion, lucide icons. Deploy target is Cloudflare (nitro). |
| Data/auth | Lovable Cloud (Supabase). Supabase Auth with email/password, Google and Lovable OAuth. RLS on every table. Server functions use `requireSupabaseAuth`, which runs a user-scoped client so RLS applies. A service-role client exists (`client.server.ts`) for trusted server work. |
| Migrations | Plain SQL in `drizzle/migrations/NNNN_*.sql` plus `meta/_journal.json`. `0000` and `0001` are applied in the live DB. `src/integrations/supabase/types.ts` is generated from the DB. |
| AI | `@lovable.dev/ai-gateway` (`generateResponse`) is already used server-side for booking summaries. |
| Commands | `bun install`, `bun run dev`, `bun run build`, `bun run test` (vitest, 12 passing), `npx tsc --noEmit` (clean). `bun run lint` already reports about 649 Prettier formatting errors in untouched files, and we deliberately leave those alone. |

## 2. What exists today

| Area | Status |
| --- | --- |
| Home (`/`) | Hero, oversized display type, glass search, three horizontal card rails. **Uses static demo data** (`src/lib/markets.ts`): 7 fictional Phoenix-area markets with made-up ratings, footfall and stall counts. |
| Market detail (`/listing/$id`) | Gallery, amenities, stat tiles, floating price and "Book Space" bar. Static demo data. |
| Map (`/map`) | Stylised SVG map with price pins and a bottom sheet. Static demo data, not a real geo map. |
| Studio (`/bookings`) | Signed-in only. Lists the user's saved booking requests (all `Pending`) with an AI summary. |
| Profile (`/profile`) | **Hard-coded demo persona** ("Maya Chen", "48 markets", "•••• 4021"). Not connected to data. |
| Partner workspace (`/partner`) | Real. Business profile onboarding (vendor/organizer/both). Organizers create private `partner_markets` and `partner_stalls` (size, daily price, availability, amenities). |
| Stall detail (`/stalls/$id`) | Real, public read of stall fields, with a booking request. |
| Booking requests | Real. Idempotent (`request_key`), server-resolved price snapshot, owner-scoped. A DB constraint allows status `Pending` only. No organizer review, no inventory, no payments. |
| Branding | The UI wordmark and page titles say **"vendibook"**. The project and repo are named Marketbloom. **Not changed**; this needs your decision (§6). |

**Missing (relative to the brief):** public market profiles by slug, public vendor profiles, a market directory with sources, claiming/verification, Spots, applications and the AI Application Studio, booth inventory and recurring dates, organizer review and approvals, booking statuses beyond Pending, Square, follows/saves, and real Studio metrics.

## 3. Design conventions to preserve

The tokens live in `src/styles.css`. **New work adds no new colours, fonts or global CSS.**

- Colours: `background` warm off-white, `primary` charcoal, `honey` amber accent, `sage` secondary accent, `glass` and `glass-border`, `scrim` and `on-scrim`, plus the `map-*` palette.
- Type: Inter Tight. The `display` utility is used for oversized headings and `eyebrow` for uppercase labels.
- Shape and depth: `rounded-3xl` cards, `rounded-full` pills, `shadow-soft` and `shadow-float`, the `tap` press scale, `bg-card-scrim` on photography.
- Components reused as-is: `Page` (motion page shell), `Gallery`, `Amenities`, `MarketCard`, `BottomNav` (floating glass pill), `BookingRequest`, and the shadcn `Button`, `Input`, `Textarea`, `Dialog`.
- Layout: mobile-first, safe-area padding, `max-w-*` centred columns, fixed glass bottom bars.

**How we protect the design**
1. No edits to `styles.css`, `BottomNav`, `MarketCard`, Home, Map, or the Studio visual shell, except additive and tightly scoped changes listed per task.
2. New screens are composed only from the classes and components above.
3. Each task is a separate commit so any visual change can be reviewed or reverted on its own.
4. Before a push, every new route is checked at phone width (390px) and desktop width.

## 4. Architecture for the new domains

All new tables live in the same Supabase project, with RLS on and the same server-function pattern.

```
markets ─────────────┐ (public directory; may be unclaimed; provenance columns)
  │ owner_id (verified organizer only, set by approval)
  ├─ market_claims    (claimant → pending → approved/rejected, by admin/service role)
  ├─ market_appearances ── vendor_profiles (public /v/slug)
  │     confirmed participation only, written by the market owner
  │     (later: written automatically when a booking reaches Confirmed)
  └─ partner_markets (existing organizer workspace; linked via markets.partner_market_id)

host_organizations ─ properties (Spots, /s/slug) ─ vendor_areas ─ recurring opportunities   [Phase 1b]
booth_types ─ event_dates ─ inventory ─ bookings(status machine) ─ payments(Square)          [Phase 2–3]
applications(form versions) ─ submissions(snapshot)                                        [Phase 2]
square_connections(org, encrypted tokens) ─ payment records ─ webhook_events(idempotency)  [Phase 3]
```

Key rules built into the schema:
- **Directory vs control.** A `markets` row can be public before anyone claims it. Only an approved claim sets `owner_id` and `claim_status = 'claimed'`. That approval runs through a `SECURITY DEFINER` function that only the service role can execute. A claimant can never self-approve.
- **Confirmed participation only.** `market_appearances` can be written by the verified market owner only. Vendors cannot add themselves. A vendor appears publicly only when the appearance is `confirmed` **and** the vendor profile is published.
- **Duplicate protection.** Unique slug, plus a unique `(lower(name), lower(city))` index on markets.
- **Provenance.** `source_name`, `source_url` and `verified_at` are stored for seeded markets. No fabricated ratings or availability are stored.
- **Demo content.** The existing static demo markets keep rendering exactly as today. Where they appear on new public profile pages, they are labelled **"Example listing"**.
- **Spots.** These reuse the same patterns (owner-scoped org, public profile, recurring availability) rather than a separate app. There are three transaction types: `vendor_pays`, `free`, `host_pays`. School properties default to private / invite-only.
- **Square (Phase 3).** Organizer OAuth (code flow, server-side). Tokens are stored only in a server-only table that browser roles cannot read. Payments use `app_fee_money` for the disclosed platform fee, with the organizer as seller of record. Webhooks verify the `x-square-hmacsha256-signature`. Payment creation and webhook processing use idempotency keys. Sandbox first; production only on your approval.

## 5. Phased file-level plan

### Phase 1: core marketplace (this branch)
| Task | Files |
| --- | --- |
| 1. Audit & plan | `docs/MARKETBLOOM_PLAN.md` |
| 2. Core schema | `drizzle/migrations/0002_marketplace_core.sql`, `meta/_journal.json`, `src/integrations/supabase/types.ts` (tables added), `src/lib/marketplace-schema.ts`, tests |
| 3. Public market profile `/m/$slug` | `src/routes/m.$slug.tsx`, `src/lib/directory.functions.ts`, `src/lib/supabase-public.server.ts`, `src/components/ManageMarketInvite.tsx`, `src/components/VendorDirectory.tsx`. Additive one-line link in `listing.$id.tsx` |
| 4. Public vendor profile `/v/$slug` | `src/routes/v.$slug.tsx`, vendor-profile server functions, "Public profile" section in `/partner` |
| 5. Organizer claiming & onboarding | `src/routes/manage.$slug.tsx` (steps 1–3 functional, 4–10 shown as a checklist that unlocks after verification), `market_claims` server functions |
| 6. Organizer: confirm vendor appearances | `/partner` section for claimed markets, so the vendor directory and calendar fill from confirmed participation |

### Phase 1b: Spots
`0003_spots.sql` (`host_organizations`, `properties`, `vendor_areas`, `spot_opportunities` with `transaction_type`, `recurrence`, `visibility`), `/spots`, `/s/$slug`, multi-property management in `/partner`.

### Phase 2: organizer operations
Booth types and dated inventory, with an exclusion constraint so a booth can't be double-booked on a date. A booking status machine: `draft → submitted → pending_review → approved → payment_required → confirmed → completed`, plus `cancelled` and `waitlisted`. Recurring and seasonal schedules. Application Studio: upload a file → AI extracts the questions; describe in plain language → AI drafts the form; or build manually. Forms are versioned, and submissions snapshot the form version. Every AI draft must be edited and approved by the organizer, and the AI must not invent legal requirements. Applicant review and an organizer dashboard (consolidated across locations).

### Phase 3: Square
`square_connections`, `/api/square/oauth/*` server routes, checkout, `app_fee_money`, a webhook route with signature verification, refunds, status sync, a connection-status UI, and disconnected/restricted-account handling. Sandbox testing.

### Phase 4–5
Expanded Vendor Studio (calendar, documents, optional vendor Square catalog import), real-geo maps, follows and saves, then the AI communications assistant, preorders and pickup.

## 6. Decisions & blockers needing your input

1. **Brand name in the UI.** The wordmark and titles say "vendibook". Should the visible brand become **MarketBloom**? This is a text-only change, and we won't make it without your approval.
2. **DB migrations.** Migrations are committed as SQL files. Please confirm they get applied when the branch lands in Lovable (Lovable applies the `drizzle/migrations` folder), or approve applying them another way. Until then, the new pages degrade gracefully: demo markets still render and directory sections show empty states.
3. **Claim verification.** Who reviews claims? An internal admin role/UI is needed. For now, claims are stored as `pending`, and approval is a service-role-only DB function.
4. **Square.** We need a Square Developer application: sandbox Application ID and secret, the OAuth redirect URL, and a webhook signature key, all stored as Lovable Cloud secrets (never in git). We also need the platform-fee percentage you want disclosed.
5. **Images.** Phase 1 accepts image URLs, and you must have the rights to any image used. Upload support (a Supabase Storage bucket and policies) arrives with the Studio work.
6. **Map.** The current map is a stylised SVG. Real geocoded maps need a provider decision (Mapbox, MapLibre with a tile host, or Google).
7. **Email.** Resend is the planned provider. Nothing is sent until you approve. It needs a verified sending domain.
