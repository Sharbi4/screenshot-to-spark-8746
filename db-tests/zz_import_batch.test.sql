-- Applies the generated batch-001 staging SQL twice and checks idempotency and organizer protection.
-- (Not wrapped in a transaction: the generated file manages its own. Runs last on a throwaway DB.)
\i data/directory/out/batch-001.stage.sql
CREATE TEMP TABLE first_run AS SELECT external_id, slug, updated_at FROM public.markets WHERE external_id IS NOT NULL;
DO $$ BEGIN
 IF (SELECT count(*) FROM first_run) <> 16 THEN RAISE EXCEPTION 'FAILED: expected 16 staged markets, got %', (SELECT count(*) FROM first_run); END IF;
 IF EXISTS (SELECT 1 FROM public.markets WHERE external_id IS NOT NULL AND (published OR booking_enabled)) THEN RAISE EXCEPTION 'FAILED: staging published or enabled bookings'; END IF;
 IF EXISTS (SELECT 1 FROM public.markets WHERE external_id IS NOT NULL AND latitude IS NOT NULL AND geocode_source = '') THEN RAISE EXCEPTION 'FAILED: coordinates without a geocode source'; END IF;
 RAISE NOTICE 'ok - stage import creates 16 unpublished, non-bookable markets with provenance';
END $$;
-- An organizer claims Findlay Market and edits it.
INSERT INTO auth.users(id) VALUES ('00000000-0000-4000-8000-0000000000f1');
UPDATE public.markets SET owner_id = '00000000-0000-4000-8000-0000000000f1', claim_status = 'claimed', description = 'Organizer-written description.' WHERE external_id = 'us-oh-cincinnati-findlay-market';
\i data/directory/out/batch-001.stage.sql
DO $$ BEGIN
 IF (SELECT count(*) FROM public.markets WHERE external_id IS NOT NULL) <> 16 THEN RAISE EXCEPTION 'FAILED: rerun created duplicates'; END IF;
 IF (SELECT count(*) FROM public.market_sources) <> 16 THEN RAISE EXCEPTION 'FAILED: rerun duplicated sources (%).', (SELECT count(*) FROM public.market_sources); END IF;
 IF (SELECT count(DISTINCT (external_id, field, message)) FROM public.market_review_flags) <> (SELECT count(*) FROM public.market_review_flags) THEN RAISE EXCEPTION 'FAILED: duplicate flags'; END IF;
 IF (SELECT description FROM public.markets WHERE external_id = 'us-oh-cincinnati-findlay-market') <> 'Organizer-written description.' THEN RAISE EXCEPTION 'FAILED: import overwrote organizer edits'; END IF;
 IF (SELECT count(*) FROM public.directory_import_runs) <> 2 THEN RAISE EXCEPTION 'FAILED: import runs not recorded'; END IF;
 RAISE NOTICE 'ok - rerun is idempotent (no duplicate markets, sources or flags)';
 RAISE NOTICE 'ok - organizer-claimed market is never overwritten by research data';
END $$;
SET ROLE anon;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.map_listings(-180, -90, 180, 90)) <> 0 THEN RAISE EXCEPTION 'FAILED: staged markets visible on public map'; END IF;
 RAISE NOTICE 'ok - staged (unpublished) markets are not on the public map';
END $$;
RESET ROLE;
