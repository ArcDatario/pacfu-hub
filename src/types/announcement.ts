export type AnnouncementCategory = 'general' | 'urgent' | 'event' | 'memo';

export type TargetAudienceType = 'all' | 'department' | 'group';

export interface TargetAudience {
  type: TargetAudienceType;
  departments?: string[];
  groups?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  targetAudience: TargetAudience;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  targetAudience: TargetAudience;
}
