-- Create storage policies for the messages bucket
-- Since this project uses Firebase Auth (not Supabase Auth), we need public policies

-- Allow public uploads to messages bucket
CREATE POLICY "Allow public uploads to messages bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'messages');

-- Allow public updates to messages bucket
CREATE POLICY "Allow public updates to messages bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'messages');

-- Allow public deletes from messages bucket
CREATE POLICY "Allow public deletes from messages bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'messages');

-- Allow public reads from messages bucket (in case not already set)
CREATE POLICY "Allow public reads from messages bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'messages');