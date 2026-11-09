# Database changes: applying through Lovable

Pushing to Git does **not** change the live Lovable Cloud database. Each schema change goes through the same steps:

1. It is written as SQL in `drizzle/migrations/NNNN_name.sql` and reviewed in a PR.
2. It is tested locally with `db-tests/run.sh`, which uses a throwaway Postgres with Supabase role shims and checks RLS. It never touches the live database.
3. **You apply it in Lovable** with the prompt below, after the branch is merged to `main`.

The app keeps working before a migration is applied: new pages fall back to demo content or empty states.

| Migration | Status | What it adds |
| --- | --- | --- |
| `0000_marketpartner_onboarding` | Applied | profiles, partner markets, stalls |
| `0001_persist_booking_requests` | Applied | booking requests |
| `0002_marketplace_core` | **Pending: apply in Lovable** | `markets` directory, `vendor_profiles`, `market_claims`, `market_appearances`, `approve_market_claim()` |

## Prompt to paste into Lovable for 0002

> Apply the SQL migration in `drizzle/migrations/0002_marketplace_core.sql` to the Cloud database exactly as written. Do not change any UI, styling, or other files. Afterwards, regenerate `src/integrations/supabase/types.ts` from the database.

## Approving an organizer's claim (until an admin screen exists)

Run in the Lovable Cloud SQL editor, as the service role:

```sql
select public.approve_market_claim('<claim id>', 'How authority was verified');
```

Pending claims: `select * from public.market_claims where status = 'pending' order by created_at;`
