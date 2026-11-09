-- RLS and integrity tests for 0002_marketplace_core. Runs in a rolled-back transaction.
BEGIN;
CREATE FUNCTION pg_temp.act(role text, uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('SET LOCAL ROLE %I', role);
  PERFORM set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
END $$;
CREATE FUNCTION pg_temp.expect(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT ok THEN RAISE EXCEPTION 'FAILED: %', label; END IF; RAISE NOTICE 'ok - %', label; END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO anon, authenticated, service_role;

INSERT INTO auth.users(id) VALUES
 ('00000000-0000-4000-8000-00000000000a'), -- organizer
 ('00000000-0000-4000-8000-00000000000b'), -- vendor
 ('00000000-0000-4000-8000-00000000000c'); -- other organizer

INSERT INTO public.markets(id, slug, name, city, source_name) VALUES
 ('10000000-0000-4000-8000-000000000001', 'sunset-market', 'Sunset Market', 'Tucson, AZ', 'Official website');

-- Duplicate protection (case-insensitive name + city).
DO $$ BEGIN
  BEGIN INSERT INTO public.markets(slug, name, city) VALUES ('sunset-market-2', 'SUNSET market', 'tucson, az');
    RAISE EXCEPTION 'FAILED: duplicate market allowed';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'ok - duplicate market rejected'; END;
END $$;

-- Anonymous visitors can read the public directory.
SELECT pg_temp.act('anon', NULL);
SELECT pg_temp.expect((SELECT count(*) FROM public.markets) = 1, 'anon reads published markets');
RESET ROLE;

-- Vendor creates a profile; unpublished profiles are private.
SELECT pg_temp.act('authenticated', '00000000-0000-4000-8000-00000000000b');
INSERT INTO public.vendor_profiles(id, owner_id, slug, business_name) VALUES
 ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000b', 'maple-bakery', 'Maple Bakery');
SELECT pg_temp.expect((SELECT count(*) FROM public.vendor_profiles) = 1, 'vendor reads own draft profile');
-- A vendor cannot add themselves to a market directory.
DO $$ BEGIN
  BEGIN INSERT INTO public.market_appearances(market_id, vendor_id, appearance_date)
    VALUES ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '2026-12-05');
    RAISE EXCEPTION 'FAILED: vendor self-listed';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - vendor cannot self-confirm appearance'; END;
END $$;
-- A claimant cannot take control by editing the market.
UPDATE public.markets SET name = 'Hijacked' WHERE id = '10000000-0000-4000-8000-000000000001';
DO $$ BEGIN
  BEGIN UPDATE public.markets SET owner_id = auth.uid(), claim_status = 'claimed';
    RAISE EXCEPTION 'FAILED: ownership column writable';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - ownership columns not writable'; END;
END $$;
RESET ROLE;
SELECT pg_temp.expect((SELECT name FROM public.markets WHERE slug = 'sunset-market') = 'Sunset Market', 'non-owner market edit had no effect');

SELECT pg_temp.act('anon', NULL);
SELECT pg_temp.expect((SELECT count(*) FROM public.vendor_profiles) = 0, 'anon cannot read unpublished vendor');
RESET ROLE;

-- Organizer submits a claim; cannot self-approve.
SELECT pg_temp.act('authenticated', '00000000-0000-4000-8000-00000000000a');
INSERT INTO public.market_claims(id, market_id, claimant_id, full_name, role_title, work_email) VALUES
 ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'Ana Ruiz', 'Market manager', 'ana@sunset.example');
DO $$ BEGIN
  BEGIN INSERT INTO public.market_claims(market_id, claimant_id, full_name, role_title, work_email, status)
    VALUES ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'Ana', 'Mgr', 'a@x.example', 'approved');
    RAISE EXCEPTION 'FAILED: self-approved claim inserted';
  EXCEPTION WHEN insufficient_privilege OR unique_violation THEN RAISE NOTICE 'ok - cannot insert approved claim'; END;
END $$;
DO $$ BEGIN
  BEGIN UPDATE public.market_claims SET status = 'approved';
    RAISE EXCEPTION 'FAILED: claimant approved own claim';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN RAISE NOTICE 'ok - claimant cannot approve own claim'; END;
END $$;
DO $$ BEGIN
  BEGIN PERFORM public.approve_market_claim('30000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'FAILED: authenticated executed approval';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - approval function is service-role only'; END;
END $$;
RESET ROLE;

-- Competing claim from another organizer.
SELECT pg_temp.act('authenticated', '00000000-0000-4000-8000-00000000000c');
INSERT INTO public.market_claims(id, market_id, claimant_id, full_name, role_title, work_email) VALUES
 ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000c', 'Ben', 'Volunteer', 'ben@x.example');
SELECT pg_temp.expect((SELECT count(*) FROM public.market_claims) = 1, 'claimants only see their own claims');
RESET ROLE;

-- Service role approves the first claim.
SELECT pg_temp.act('service_role', NULL);
SELECT public.approve_market_claim('30000000-0000-4000-8000-000000000001', 'Verified via official site');
RESET ROLE;
SELECT pg_temp.expect((SELECT owner_id FROM public.markets WHERE slug = 'sunset-market') = '00000000-0000-4000-8000-00000000000a', 'approved claimant owns market');
SELECT pg_temp.expect((SELECT status FROM public.market_claims WHERE id = '30000000-0000-4000-8000-000000000002') = 'rejected', 'competing claim auto-rejected');
DO $$ BEGIN
  BEGIN PERFORM public.approve_market_claim('30000000-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'FAILED: second approval succeeded';
  EXCEPTION WHEN raise_exception THEN RAISE NOTICE 'ok - claimed market cannot be re-approved'; END;
END $$;

-- Verified owner edits presentation and confirms the vendor.
SELECT pg_temp.act('authenticated', '00000000-0000-4000-8000-00000000000a');
UPDATE public.markets SET description = 'Sunset vendors every Saturday.' WHERE slug = 'sunset-market';
INSERT INTO public.market_appearances(market_id, vendor_id, appearance_date, booth_label)
 VALUES ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '2026-12-05', 'B-4');
DO $$ BEGIN
  BEGIN INSERT INTO public.market_appearances(market_id, vendor_id, appearance_date)
    VALUES ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '2026-12-05');
    RAISE EXCEPTION 'FAILED: duplicate appearance';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'ok - duplicate appearance rejected'; END;
END $$;
RESET ROLE;

-- Other organizer cannot manage someone else's market appearances.
SELECT pg_temp.act('authenticated', '00000000-0000-4000-8000-00000000000c');
DELETE FROM public.market_appearances;
RESET ROLE;
SELECT pg_temp.expect((SELECT count(*) FROM public.market_appearances) = 1, 'non-owner cannot delete appearances');

-- Appearance is hidden publicly until the vendor publishes.
SELECT pg_temp.act('anon', NULL);
SELECT pg_temp.expect((SELECT count(*) FROM public.market_appearances) = 0, 'unpublished vendor appearance hidden');
RESET ROLE;
UPDATE public.vendor_profiles SET published = true;
SELECT pg_temp.act('anon', NULL);
SELECT pg_temp.expect((SELECT count(*) FROM public.market_appearances) = 1, 'published vendor appearance visible');
RESET ROLE;
UPDATE public.market_appearances SET status = 'cancelled';
SELECT pg_temp.act('anon', NULL);
SELECT pg_temp.expect((SELECT count(*) FROM public.market_appearances) = 0, 'cancelled appearance hidden');
RESET ROLE;

-- Vendor still sees own appearances (calendar), including cancelled.
SELECT pg_temp.act('authenticated', '00000000-0000-4000-8000-00000000000b');
SELECT pg_temp.expect((SELECT count(*) FROM public.market_appearances) = 1, 'vendor sees own appearances');
RESET ROLE;

ROLLBACK;
