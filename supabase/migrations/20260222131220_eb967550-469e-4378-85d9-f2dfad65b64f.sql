
CREATE TABLE public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT NOT NULL,
  address TEXT NOT NULL,
  purpose TEXT NOT NULL,
  receipt_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  account_email TEXT
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public registration form)
CREATE POLICY "Anyone can submit registration"
ON public.registrations
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read (for admin; we rely on app-level auth via Firebase)
CREATE POLICY "Anyone can read registrations"
ON public.registrations
FOR SELECT
USING (true);

-- Allow anyone to update (admin actions; app-level auth via Firebase)
CREATE POLICY "Anyone can update registrations"
ON public.registrations
FOR UPDATE
USING (true);
