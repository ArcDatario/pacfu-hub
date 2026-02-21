
-- Create storage bucket for registration receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('registrations', 'registrations', true);

-- Allow anyone to upload to registrations bucket (public registration)
CREATE POLICY "Anyone can upload registration receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'registrations');

-- Allow anyone to read registration receipts
CREATE POLICY "Anyone can view registration receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'registrations');
