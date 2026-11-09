CREATE TABLE public.booking_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 request_key uuid NOT NULL,
 market_id text NOT NULL,
 stall_id uuid REFERENCES public.partner_stalls(id),
 market_name text NOT NULL,
 city text NOT NULL,
 hours text NOT NULL,
 stall_label text NOT NULL,
 daily_price numeric NOT NULL,
 booking_date date NOT NULL,
 notes text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'Pending',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id, request_key),
 CONSTRAINT booking_request_pending CHECK (status = 'Pending'),
 CONSTRAINT booking_request_price CHECK (daily_price >= 0)
);
GRANT SELECT, INSERT ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own booking requests" ON public.booking_requests FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Create own pending booking requests" ON public.booking_requests FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND status = 'Pending');
CREATE INDEX booking_requests_owner_created ON public.booking_requests(owner_id, created_at DESC);