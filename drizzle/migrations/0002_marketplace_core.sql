-- MarketBloom core marketplace: public market directory, vendor profiles,
-- organizer claims, and confirmed vendor appearances.

CREATE TABLE public.markets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 80),
 name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 150),
 kind text NOT NULL DEFAULT 'farmers' CHECK (kind IN ('farmers','night','flea','artisan','craft','festival','popup','food_truck','community')),
 city text NOT NULL,
 region text NOT NULL DEFAULT '',
 address text NOT NULL DEFAULT '',
 latitude double precision CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision CHECK (longitude BETWEEN -180 AND 180),
 description text NOT NULL DEFAULT '',
 schedule text NOT NULL DEFAULT '',
 hours text NOT NULL DEFAULT '',
 vendor_categories text[] NOT NULL DEFAULT '{}',
 cover_image_url text CHECK (cover_image_url IS NULL OR cover_image_url ~ '^https://'),
 website_url text CHECK (website_url IS NULL OR website_url ~ '^https?://'),
 -- Directory provenance for seeded, informational listings.
 source_name text NOT NULL DEFAULT '',
 source_url text CHECK (source_url IS NULL OR source_url ~ '^https?://'),
 verified_at timestamptz,
 -- Control: set only by approve_market_claim (service role).
 owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 claim_status text NOT NULL DEFAULT 'unclaimed' CHECK (claim_status IN ('unclaimed','claimed')),
 partner_market_id uuid REFERENCES public.partner_markets(id) ON DELETE SET NULL,
 published boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX markets_unique_name_city ON public.markets (lower(name), lower(city));
CREATE INDEX markets_owner ON public.markets (owner_id);
GRANT SELECT ON public.markets TO anon, authenticated;
-- Verified owners may edit presentation fields only; never ownership, claim state, or provenance.
GRANT UPDATE (name, description, schedule, hours, address, vendor_categories, cover_image_url, website_url, updated_at) ON public.markets TO authenticated;
GRANT ALL ON public.markets TO service_role;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read published markets" ON public.markets FOR SELECT TO anon, authenticated USING (published OR owner_id = auth.uid());
CREATE POLICY "Owners update their market" ON public.markets FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.vendor_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 80),
 business_name text NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 150),
 category text NOT NULL DEFAULT '',
 tagline text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '',
 service_area text NOT NULL DEFAULT '',
 logo_url text CHECK (logo_url IS NULL OR logo_url ~ '^https://'),
 cover_image_url text CHECK (cover_image_url IS NULL OR cover_image_url ~ '^https://'),
 product_image_urls text[] NOT NULL DEFAULT '{}' CHECK (cardinality(product_image_urls) <= 12),
 website_url text CHECK (website_url IS NULL OR website_url ~ '^https?://'),
 instagram_handle text NOT NULL DEFAULT '',
 contact_email text NOT NULL DEFAULT '',
 show_past_markets boolean NOT NULL DEFAULT true,
 published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendor_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_profiles TO authenticated;
GRANT ALL ON public.vendor_profiles TO service_role;
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read published vendor profiles" ON public.vendor_profiles FOR SELECT TO anon, authenticated USING (published OR owner_id = auth.uid());
CREATE POLICY "Manage own vendor profile" ON public.vendor_profiles FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.market_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
 claimant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
 role_title text NOT NULL CHECK (char_length(role_title) BETWEEN 1 AND 120),
 work_email text NOT NULL CHECK (char_length(work_email) BETWEEN 3 AND 200),
 phone text NOT NULL DEFAULT '',
 evidence text NOT NULL DEFAULT '' CHECK (char_length(evidence) <= 2000),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
 reviewer_notes text NOT NULL DEFAULT '',
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX market_claims_one_open ON public.market_claims (market_id, claimant_id) WHERE status = 'pending';
GRANT SELECT, INSERT ON public.market_claims TO authenticated;
GRANT UPDATE (status) ON public.market_claims TO authenticated;
GRANT ALL ON public.market_claims TO service_role;
ALTER TABLE public.market_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own claims" ON public.market_claims FOR SELECT TO authenticated USING (claimant_id = auth.uid());
CREATE POLICY "Submit own pending claim" ON public.market_claims FOR INSERT TO authenticated WITH CHECK (claimant_id = auth.uid() AND status = 'pending' AND reviewed_at IS NULL AND reviewer_notes = '');
CREATE POLICY "Withdraw own pending claim" ON public.market_claims FOR UPDATE TO authenticated USING (claimant_id = auth.uid() AND status = 'pending') WITH CHECK (claimant_id = auth.uid() AND status = 'withdrawn');

CREATE TABLE public.market_appearances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
 vendor_id uuid NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
 appearance_date date NOT NULL,
 booth_label text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
 featured boolean NOT NULL DEFAULT false,
 source text NOT NULL DEFAULT 'organizer' CHECK (source IN ('organizer','booking')),
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (market_id, vendor_id, appearance_date)
);
CREATE INDEX market_appearances_market_date ON public.market_appearances (market_id, appearance_date);
CREATE INDEX market_appearances_vendor_date ON public.market_appearances (vendor_id, appearance_date);
GRANT SELECT ON public.market_appearances TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_appearances TO authenticated;
GRANT ALL ON public.market_appearances TO service_role;
ALTER TABLE public.market_appearances ENABLE ROW LEVEL SECURITY;
-- Public sees only confirmed appearances of published vendors at published markets.
CREATE POLICY "Read confirmed appearances" ON public.market_appearances FOR SELECT TO anon, authenticated USING (
 status = 'confirmed'
 AND EXISTS (SELECT 1 FROM public.vendor_profiles v WHERE v.id = vendor_id AND v.published)
 AND EXISTS (SELECT 1 FROM public.markets m WHERE m.id = market_id AND m.published)
);
CREATE POLICY "Vendors read own appearances" ON public.market_appearances FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.vendor_profiles v WHERE v.id = vendor_id AND v.owner_id = auth.uid()));
-- Only the verified market owner confirms participation; vendors cannot add themselves.
CREATE POLICY "Market owners manage appearances" ON public.market_appearances FOR ALL TO authenticated
 USING (EXISTS (SELECT 1 FROM public.markets m WHERE m.id = market_id AND m.owner_id = auth.uid()))
 WITH CHECK (EXISTS (SELECT 1 FROM public.markets m WHERE m.id = market_id AND m.owner_id = auth.uid()));

-- Claim approval: service role only. Grants control of a market to a verified organizer.
CREATE FUNCTION public.approve_market_claim(p_claim_id uuid, p_notes text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.market_claims;
BEGIN
 SELECT * INTO c FROM public.market_claims WHERE id = p_claim_id AND status = 'pending' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Claim is not pending'; END IF;
 UPDATE public.markets SET owner_id = c.claimant_id, claim_status = 'claimed', updated_at = now()
  WHERE id = c.market_id AND claim_status = 'unclaimed';
 IF NOT FOUND THEN RAISE EXCEPTION 'Market is already claimed'; END IF;
 UPDATE public.market_claims SET status = 'approved', reviewer_notes = p_notes, reviewed_at = now() WHERE id = p_claim_id;
 UPDATE public.market_claims SET status = 'rejected', reviewer_notes = 'Another claim was approved.', reviewed_at = now()
  WHERE market_id = c.market_id AND status = 'pending';
END; $$;
REVOKE ALL ON FUNCTION public.approve_market_claim(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_market_claim(uuid, text) TO service_role;
