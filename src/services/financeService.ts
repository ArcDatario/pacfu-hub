import { supabase } from '@/integrations/supabase/client';

export interface FinancialRecord {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string | null;
  reference_number: string | null;
  recorded_by: string;
  recorded_by_name: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFinancialRecordInput {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category?: string;
  reference_number?: string;
  recorded_by: string;
  recorded_by_name: string;
  transaction_date: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

export const financeService = {
  async getRecords(startDate?: string, endDate?: string): Promise<FinancialRecord[]> {
    let query = supabase
      .from('financial_records')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching financial records:', error);
      throw error;
    }

    return (data || []) as FinancialRecord[];
  },

  async createRecord(input: CreateFinancialRecordInput): Promise<FinancialRecord> {
    const { data, error } = await supabase
      .from('financial_records')
      .insert({
        type: input.type,
        amount: input.amount,
        description: input.description,
        category: input.category || null,
        reference_number: input.reference_number || null,
        recorded_by: input.recorded_by,
        recorded_by_name: input.recorded_by_name,
        transaction_date: input.transaction_date,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating financial record:', error);
      throw error;
    }

    return data as FinancialRecord;
  },

  async deleteRecord(id: string): Promise<void> {
    const { error } = await supabase
      .from('financial_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting financial record:', error);
      throw error;
    }
  },

  calculateSummary(records: FinancialRecord[]): FinancialSummary {
    const totalIncome = records
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const totalExpenses = records
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount: records.length,
    };
  },

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  },
};
