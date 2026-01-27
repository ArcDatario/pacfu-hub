export type AnnouncementCategory = 'general' | 'urgent' | 'event' | 'memo';
export type AnnouncementAudience = 'all' | 'department';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  audience: AnnouncementAudience;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  audience: AnnouncementAudience;
  department?: string;
}
