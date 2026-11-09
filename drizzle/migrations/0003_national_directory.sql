-- MarketBloom national directory: richer market facts, provenance, licensed photos,
-- review flags, import runs, and a lightweight map feed. Builds on 0002.

-- Categories: add public markets and seasonal holiday markets.
ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_kind_check;
ALTER TABLE public.markets ADD CONSTRAINT markets_kind_check CHECK (kind IN
 ('farmers','night','flea','artisan','craft','festival','popup','food_truck','community','public','holiday'));

ALTER TABLE public.markets
 ADD COLUMN external_id text UNIQUE,                         -- stable research/import key, e.g. "us-wi-dcfm-saturday"
 ADD COLUMN state text NOT NULL DEFAULT '' CHECK (state = '' OR state ~ '^[A-Z]{2}$'),
 ADD COLUMN postal_code text NOT NULL DEFAULT '' CHECK (postal_code = '' OR postal_code ~ '^\d{5}(-\d{4})?$'),
 ADD COLUMN time_zone text NOT NULL DEFAULT '',
 ADD COLUMN venue_name text NOT NULL DEFAULT '',
 ADD COLUMN organizer_name text NOT NULL DEFAULT '',
 ADD COLUMN contact_email text NOT NULL DEFAULT '',
 ADD COLUMN contact_phone text NOT NULL DEFAULT '',
 ADD COLUMN social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
 -- Structured schedule: [{ "days": ["sat"], "opens": "08:00", "closes": "13:00", "starts_on": "2026-04-11", "ends_on": "2026-11-14", "note": "" }]
 ADD COLUMN schedule_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN season_note text NOT NULL DEFAULT '',
 ADD COLUMN upcoming_dates date[] NOT NULL DEFAULT '{}',
 ADD COLUMN vendor_applications text NOT NULL DEFAULT 'unknown' CHECK (vendor_applications IN ('open','closed','unknown')),
 ADD COLUMN vendor_application_url text CHECK (vendor_application_url IS NULL OR vendor_application_url ~ '^https?://'),
 ADD COLUMN vendor_types text[] NOT NULL DEFAULT '{}',
 ADD COLUMN vendor_requirements text NOT NULL DEFAULT '',
 ADD COLUMN booth_price_note text NOT NULL DEFAULT '',      -- only verbatim-verified public pricing
 ADD COLUMN amenities text[] NOT NULL DEFAULT '{}',
 ADD COLUMN geocode_source text NOT NULL DEFAULT '' CHECK (geocode_source IN ('','mapbox_permanent','us_census','organizer','official_source')),
 ADD COLUMN location_status text NOT NULL DEFAULT 'pending' CHECK (location_status IN ('pending','verified','needs_review')),
 ADD COLUMN review_status text NOT NULL DEFAULT 'researched' CHECK (review_status IN ('researched','verified','needs_review','staged','published','closed')),
 ADD COLUMN confidence text NOT NULL DEFAULT 'low' CHECK (confidence IN ('high','medium','low')),
 ADD COLUMN booking_enabled boolean NOT NULL DEFAULT false, -- only a verified organizer with payments can turn this on
 ADD COLUMN last_verified_at date;

-- Bookings can only be enabled on organizer-controlled markets.
ALTER TABLE public.markets ADD CONSTRAINT markets_booking_requires_owner CHECK (NOT booking_enabled OR claim_status = 'claimed');
-- Directory dedupe helpers.
CREATE INDEX markets_state_city ON public.markets (state, lower(city));
CREATE INDEX markets_geo ON public.markets (latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX markets_website_host ON public.markets (lower(regexp_replace(website_url, '^https?://(www\.)?([^/]+).*$', '\2')));

-- Verified owners may also maintain these presentation/vendor columns.
GRANT UPDATE (venue_name, contact_email, contact_phone, social_links, schedule_rules, season_note, upcoming_dates,
 vendor_applications, vendor_application_url, vendor_types, vendor_requirements, booth_price_note, amenities) ON public.markets TO authenticated;

-- Where each fact came from.
CREATE TABLE public.market_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
 source_type text NOT NULL CHECK (source_type IN ('official_website','usda_directory','state_directory','municipal','tourism','association','organizer_calendar','organizer','other_licensed')),
 url text NOT NULL CHECK (url ~ '^https?://'),
 fields text[] NOT NULL DEFAULT '{}',
 retrieved_on date NOT NULL,
 notes text NOT NULL DEFAULT '',
 UNIQUE (market_id, url)
);
GRANT SELECT ON public.market_sources TO anon, authenticated;
GRANT ALL ON public.market_sources TO service_role;
ALTER TABLE public.market_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read sources of published markets" ON public.market_sources FOR SELECT TO anon, authenticated
 USING (EXISTS (SELECT 1 FROM public.markets m WHERE m.id = market_id AND (m.published OR m.owner_id = auth.uid())));

-- Licensed photography. Files live in the project's storage; rights metadata lives here.
CREATE TABLE public.market_photos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
 image_url text NOT NULL CHECK (image_url ~ '^https://'),
 storage_path text NOT NULL DEFAULT '',
 source_url text CHECK (source_url IS NULL OR source_url ~ '^https?://'),
 owner_name text NOT NULL DEFAULT '',
 license text NOT NULL CHECK (license IN ('organizer_permission','commercial_license','cc_by','cc_by_sa','cc0','public_domain','marketbloom_original')),
 attribution text NOT NULL DEFAULT '',
 permission_note text NOT NULL DEFAULT '',
 alt_text text NOT NULL DEFAULT '',
 is_cover boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected')),
 uploaded_by uuid DEFAULT auth.uid(),
 uploaded_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT attribution_required CHECK (license NOT IN ('cc_by','cc_by_sa') OR attribution <> '')
);
CREATE UNIQUE INDEX market_photos_one_cover ON public.market_photos (market_id) WHERE is_cover AND status = 'approved';
GRANT SELECT ON public.market_photos TO anon;
GRANT SELECT, INSERT ON public.market_photos TO authenticated;
GRANT ALL ON public.market_photos TO service_role;
ALTER TABLE public.market_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read approved photos" ON public.market_photos FOR SELECT TO anon, authenticated
 USING (status = 'approved' AND EXISTS (SELECT 1 FROM public.markets m WHERE m.id = market_id AND m.published));
CREATE POLICY "Owners read their photos" ON public.market_photos FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.markets m WHERE m.id = market_id AND m.owner_id = auth.uid()));
-- Verified organizers submit photos; they enter review and cannot self-approve.
CREATE POLICY "Owners submit photos" ON public.market_photos FOR INSERT TO authenticated
 WITH CHECK (status = 'pending_review' AND uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.markets m WHERE m.id = market_id AND m.owner_id = auth.uid()));

-- Conflicts and low-confidence facts found during research or import.
CREATE TABLE public.market_review_flags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 market_id uuid REFERENCES public.markets(id) ON DELETE CASCADE,
 external_id text NOT NULL,
 field text NOT NULL,
 severity text NOT NULL CHECK (severity IN ('info','warning','blocking')),
 message text NOT NULL,
 resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (external_id, field, message)
);
GRANT ALL ON public.market_review_flags TO service_role;
ALTER TABLE public.market_review_flags ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.directory_import_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dataset text NOT NULL,
 dataset_sha256 text NOT NULL,
 mode text NOT NULL CHECK (mode IN ('stage','publish')),
 summary jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.directory_import_runs TO service_role;
ALTER TABLE public.directory_import_runs ENABLE ROW LEVEL SECURITY;

-- Lightweight map feed for a bounding box. Runs as the caller, so RLS applies.
-- Price appears only for bookable markets with verified, available booth inventory.
CREATE FUNCTION public.map_listings(min_lng double precision, min_lat double precision, max_lng double precision, max_lat double precision, max_rows integer DEFAULT 5000)
RETURNS TABLE (listing_type text, slug text, name text, kind text, city text, state text, latitude double precision, longitude double precision, cover_image_url text, bookable boolean, from_price numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
 SELECT 'market', m.slug, m.name, m.kind, m.city, m.state, m.latitude, m.longitude,
  (SELECT p.image_url FROM public.market_photos p WHERE p.market_id = m.id AND p.is_cover AND p.status = 'approved' LIMIT 1),
  m.booking_enabled,
  CASE WHEN m.booking_enabled THEN (SELECT min(s.daily_price) FROM public.partner_stalls s WHERE s.market_id = m.partner_market_id AND s.availability = 'available') END
 FROM public.markets m
 WHERE m.published AND m.latitude IS NOT NULL AND m.location_status = 'verified'
  AND m.longitude BETWEEN min_lng AND max_lng AND m.latitude BETWEEN min_lat AND max_lat
 ORDER BY m.name
 LIMIT least(greatest(max_rows, 1), 5000);
$$;
GRANT EXECUTE ON FUNCTION public.map_listings(double precision, double precision, double precision, double precision, integer) TO anon, authenticated;
