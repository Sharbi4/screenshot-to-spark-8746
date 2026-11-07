CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '',
 business_name text NOT NULL DEFAULT '',
 participation text NOT NULL DEFAULT 'vendor',
 category text NOT NULL DEFAULT '',
 city text NOT NULL DEFAULT '',
 phone text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '',
 onboarding_complete boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE FUNCTION public.create_partner_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles(id) VALUES (NEW.id) ON CONFLICT DO NOTHING; RETURN NEW; END; $$;
CREATE TRIGGER create_partner_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_partner_profile();
CREATE TABLE public.partner_markets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 name text NOT NULL,
 city text NOT NULL,
 address text NOT NULL,
 schedule text NOT NULL,
 hours text NOT NULL,
 description text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_markets TO authenticated;
GRANT ALL ON public.partner_markets TO service_role;
ALTER TABLE public.partner_markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own markets" ON public.partner_markets FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TABLE public.partner_stalls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 market_id uuid NOT NULL REFERENCES public.partner_markets(id) ON DELETE CASCADE,
 label text NOT NULL,
 width_ft numeric NOT NULL CHECK (width_ft > 0),
 depth_ft numeric NOT NULL CHECK (depth_ft > 0),
 daily_price numeric NOT NULL CHECK (daily_price >= 0),
 availability text NOT NULL DEFAULT 'available' CHECK (availability IN ('available','reserved','unavailable')),
 amenities text[] NOT NULL DEFAULT '{}',
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_stalls TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_stalls TO authenticated;
GRANT ALL ON public.partner_stalls TO service_role;
ALTER TABLE public.partner_stalls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read stall details" ON public.partner_stalls FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Manage own stalls" ON public.partner_stalls FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.partner_markets m WHERE m.id = market_id AND m.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.partner_markets m WHERE m.id = market_id AND m.owner_id = auth.uid()));