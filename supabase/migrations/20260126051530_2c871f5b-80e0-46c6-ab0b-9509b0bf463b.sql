-- Fix overly permissive RLS policies on financial_records table
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view financial records" ON public.financial_records;
DROP POLICY IF EXISTS "Authenticated users can insert financial records" ON public.financial_records;

-- Create secure owner-based policies
CREATE POLICY "Users can view own financial records" 
ON public.financial_records 
FOR SELECT 
USING (recorded_by = (auth.uid())::text);

CREATE POLICY "Users can insert own financial records" 
ON public.financial_records 
FOR INSERT 
WITH CHECK (recorded_by = (auth.uid())::text);

-- Fix the function search path issue
CREATE OR REPLACE FUNCTION public.update_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;