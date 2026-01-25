-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', true, 5242880); -- 5MB = 5 * 1024 * 1024

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'folder', 'pdf', 'image', 'document', 'spreadsheet', 'presentation', 'archive', 'video', 'audio', 'other'
  size BIGINT,
  size_formatted TEXT,
  mime_type TEXT,
  storage_path TEXT, -- path in storage bucket
  parent_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL, -- user id
  created_by_name TEXT NOT NULL,
  shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Everyone can view all documents (shared portal)
CREATE POLICY "Anyone can view documents" 
ON public.documents FOR SELECT 
USING (true);

-- Authenticated users can create documents
CREATE POLICY "Authenticated users can create documents" 
ON public.documents FOR INSERT 
WITH CHECK (true);

-- Authenticated users can update documents
CREATE POLICY "Authenticated users can update documents" 
ON public.documents FOR UPDATE 
USING (true);

-- Authenticated users can delete documents
CREATE POLICY "Authenticated users can delete documents" 
ON public.documents FOR DELETE 
USING (true);

-- Storage policies for documents bucket
CREATE POLICY "Anyone can view document files"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload document files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update document files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete document files"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents');

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_documents_updated_at();

-- Enable realtime for documents
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;