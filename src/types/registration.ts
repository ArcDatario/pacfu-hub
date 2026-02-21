export interface Registration {
  id: string;
  fullName: string;
  department: string;
  address: string;
  purpose: string;
  receiptUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  accountEmail?: string;
}
