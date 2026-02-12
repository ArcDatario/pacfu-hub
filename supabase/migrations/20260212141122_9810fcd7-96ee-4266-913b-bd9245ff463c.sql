
-- Create table for login verification codes
CREATE TABLE public.verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_verification_codes_email ON public.verification_codes (email);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
-- No public policies needed since only edge functions access this table
CREATE POLICY "Service role full access" ON public.verification_codes
  FOR ALL USING (true) WITH CHECK (true);
