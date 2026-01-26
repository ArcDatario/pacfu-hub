export interface ActivityLog {
  id: string;
  action: string;
  category: 'faculty' | 'election' | 'poll' | 'finance' | 'announcement' | 'document';
  description: string;
  adminId: string;
  adminName: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type LogCategory = ActivityLog['category'];
