-- Create financial_records table for tracking income and expenses
CREATE TABLE public.financial_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category TEXT,
    reference_number TEXT,
    recorded_by TEXT NOT NULL,
    recorded_by_name TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- Create policies - only authenticated users can view
CREATE POLICY "Authenticated users can view financial records" 
ON public.financial_records 
FOR SELECT 
TO authenticated
USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can insert financial records" 
ON public.financial_records 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Only the recorder can update their records
CREATE POLICY "Users can update own financial records" 
ON public.financial_records 
FOR UPDATE 
TO authenticated
USING (recorded_by = (auth.uid())::text);

-- Only the recorder can delete their records
CREATE POLICY "Users can delete own financial records" 
ON public.financial_records 
FOR DELETE 
TO authenticated
USING (recorded_by = (auth.uid())::text);

-- Create trigger for updated_at
CREATE TRIGGER update_financial_records_updated_at
BEFORE UPDATE ON public.financial_records
FOR EACH ROW
EXECUTE FUNCTION public.update_documents_updated_at();