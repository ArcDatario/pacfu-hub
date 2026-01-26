export type TransactionType = 'income' | 'expense';

export interface FinancialRecord {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  transactionDate: Date;
  referenceNumber?: string;
  recordedBy: string;
  recordedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export const incomeCategories = [
  'Membership Fees',
  'Donations',
  'Grants',
  'Event Revenue',
  'Sponsorships',
  'Other Income',
];

export const expenseCategories = [
  'Office Supplies',
  'Events & Activities',
  'Travel & Transportation',
  'Professional Development',
  'Equipment',
  'Utilities',
  'Salaries & Honorarium',
  'Miscellaneous',
];
