export type AnnouncementCategory = 'general' | 'urgent' | 'event' | 'memo';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  category: AnnouncementCategory;
  isPinned: boolean;
}
