export type AnnouncementCategory = 'general' | 'urgent' | 'event' | 'memo';
export type AnnouncementAudience = 'all' | 'departments';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  audience: AnnouncementAudience;
  departments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  audience: AnnouncementAudience;
  departments?: string[];
}
