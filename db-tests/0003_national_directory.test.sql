-- Tests for 0003_national_directory. Runs in a rolled-back transaction.
BEGIN;
CREATE FUNCTION pg_temp.act(role text, uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE format('SET LOCAL ROLE %I', role); PERFORM set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true); END $$;
CREATE FUNCTION pg_temp.expect(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT ok THEN RAISE EXCEPTION 'FAILED: %', label; END IF; RAISE NOTICE 'ok - %', label; END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO anon, authenticated, service_role;

INSERT INTO auth.users(id) VALUES ('00000000-0000-4000-8000-0000000000a1'), ('00000000-0000-4000-8000-0000000000a2');
INSERT INTO public.markets(id, slug, name, city, state, latitude, longitude, location_status, published, review_status) VALUES
 ('40000000-0000-4000-8000-000000000001', 'verified-market', 'Verified Market', 'Boston', 'MA', 42.36, -71.05, 'verified', true, 'published'),
 ('40000000-0000-4000-8000-000000000002', 'unsure-market', 'Unsure Market', 'Boston', 'MA', 42.35, -71.06, 'needs_review', true, 'published'),
 ('40000000-0000-4000-8000-000000000003', 'draft-market', 'Draft Market', 'Boston', 'MA', 42.34, -71.07, 'verified', false, 'staged');

DO $$ BEGIN
 BEGIN UPDATE public.markets SET booking_enabled = true WHERE slug = 'verified-market';
  RAISE EXCEPTION 'FAILED: booking enabled on unclaimed market';
 EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok - bookings require a verified organizer'; END;
 BEGIN INSERT INTO public.markets(slug, name, city, state) VALUES ('bad-state', 'Bad State', 'X', 'Massachusetts');
  RAISE EXCEPTION 'FAILED: invalid state accepted';
 EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok - state must be a 2-letter code'; END;
 BEGIN INSERT INTO public.market_photos(market_id, image_url, license) VALUES ('40000000-0000-4000-8000-000000000001', 'https://x.example/a.jpg', 'cc_by');
  RAISE EXCEPTION 'FAILED: CC BY photo without attribution';
 EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok - CC BY photos require attribution'; END;
 BEGIN INSERT INTO public.market_photos(market_id, image_url, license) VALUES ('40000000-0000-4000-8000-000000000001', 'https://x.example/a.jpg', 'found_online');
  RAISE EXCEPTION 'FAILED: unlicensed photo accepted';
 EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok - photos need a recognised license'; END;
END $$;

INSERT INTO public.market_photos(market_id, image_url, license, status, is_cover) VALUES
 ('40000000-0000-4000-8000-000000000001', 'https://x.example/ok.jpg', 'organizer_permission', 'approved', true),
 ('40000000-0000-4000-8000-000000000001', 'https://x.example/pending.jpg', 'organizer_permission', 'pending_review', false);

SELECT pg_temp.act('anon', NULL);
SELECT pg_temp.expect((SELECT count(*) FROM public.map_listings(-72, 42, -70, 43)) = 1, 'map shows only published markets with verified locations');
SELECT pg_temp.expect((SELECT from_price IS NULL AND NOT bookable FROM public.map_listings(-72, 42, -70, 43)), 'directory-only market has no price');
SELECT pg_temp.expect((SELECT cover_image_url FROM public.map_listings(-72, 42, -70, 43)) = 'https://x.example/ok.jpg', 'map uses approved cover photo');
SELECT pg_temp.expect((SELECT count(*) FROM public.map_listings(-100, 30, -90, 35)) = 0, 'bounding box filters results');
SELECT pg_temp.expect((SELECT count(*) FROM public.market_photos) = 1, 'public sees approved photos only');
DO $$ BEGIN
 BEGIN PERFORM 1 FROM public.market_review_flags; RAISE EXCEPTION 'FAILED: review flags readable';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - review flags are not public'; END;
END $$;
RESET ROLE;

-- Organizer: claim, then submit a photo that enters review.
UPDATE public.markets SET owner_id = '00000000-0000-4000-8000-0000000000a1', claim_status = 'claimed' WHERE slug = 'verified-market';
SELECT pg_temp.act('authenticated', '00000000-0000-4000-8000-0000000000a1');
INSERT INTO public.market_photos(market_id, image_url, license, uploaded_by) VALUES ('40000000-0000-4000-8000-000000000001', 'https://x.example/new.jpg', 'marketbloom_original', auth.uid());
DO $$ BEGIN
 BEGIN INSERT INTO public.market_photos(market_id, image_url, license, status, uploaded_by) VALUES ('40000000-0000-4000-8000-000000000001', 'https://x.example/self.jpg', 'marketbloom_original', 'approved', auth.uid());
  RAISE EXCEPTION 'FAILED: organizer self-approved photo';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - organizer photos enter review'; END;
 BEGIN UPDATE public.markets SET review_status = 'published', booking_enabled = true WHERE slug = 'verified-market';
  RAISE EXCEPTION 'FAILED: organizer changed review/booking status directly';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - review and booking status are not organizer-writable'; END;
END $$;
UPDATE public.markets SET season_note = 'Open year-round' WHERE slug = 'verified-market';
RESET ROLE;
SELECT pg_temp.expect((SELECT season_note FROM public.markets WHERE slug = 'verified-market') = 'Open year-round', 'organizer edits schedule notes');

SELECT pg_temp.act('authenticated', '00000000-0000-4000-8000-0000000000a2');
DO $$ BEGIN
 BEGIN INSERT INTO public.market_photos(market_id, image_url, license, uploaded_by) VALUES ('40000000-0000-4000-8000-000000000001', 'https://x.example/x.jpg', 'marketbloom_original', auth.uid());
  RAISE EXCEPTION 'FAILED: non-owner uploaded photo';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - only the verified organizer can submit photos'; END;
END $$;
RESET ROLE;
ROLLBACK;
