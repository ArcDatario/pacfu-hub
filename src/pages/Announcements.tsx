import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Pin, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  isPinned: boolean;
  category: 'general' | 'urgent' | 'event' | 'memo';
}

const announcements: Announcement[] = [
  {
    id: '1',
    title: 'Faculty General Assembly - January 2026',
    content: 'All PACFU members are required to attend the General Assembly on January 20, 2026 at 2:00 PM in the University Auditorium. Agenda includes election of new officers and budget approval.',
    author: 'Dr. Maria Santos',
    date: 'Jan 15, 2026',
    isPinned: true,
    category: 'urgent',
  },
  {
    id: '2',
    title: 'Research Grant Application Deadline Extended',
    content: 'The deadline for submitting research grant applications has been extended to February 28, 2026. Please coordinate with the Research Office for requirements.',
    author: 'Dr. Jose Garcia',
    date: 'Jan 14, 2026',
    isPinned: true,
    category: 'general',
  },
  {
    id: '3',
    title: 'New Library Resources Available',
    content: 'The University Library has acquired new academic journals and e-books. Access them through the online portal using your faculty credentials.',
    author: 'Ms. Ana Reyes',
    date: 'Jan 12, 2026',
    isPinned: false,
    category: 'general',
  },
  {
    id: '4',
    title: 'Faculty Development Workshop Series',
    content: 'Register now for the upcoming Faculty Development Workshop Series starting February 2026. Topics include pedagogical innovations and research methodologies.',
    author: 'Dr. Maria Santos',
    date: 'Jan 10, 2026',
    isPinned: false,
    category: 'event',
  },
];

const categoryStyles = {
  general: 'bg-primary/10 text-primary',
  urgent: 'bg-destructive/10 text-destructive',
  event: 'bg-accent/10 text-accent',
  memo: 'bg-muted text-muted-foreground',
};

export default function Announcements() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.isPinned);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.isPinned);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Announcements</h1>
            <p className="mt-1 text-muted-foreground">
              Stay updated with the latest news and updates
            </p>
          </div>
          {isAdmin && (
            <Button variant="accent" className="gap-2">
              <Plus className="h-4 w-4" />
              New Announcement
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Pinned Announcements */}
        {pinnedAnnouncements.length > 0 && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Pin className="h-4 w-4" />
              Pinned
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pinnedAnnouncements.map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </div>
          </div>
        )}

        {/* Regular Announcements */}
        <div className="space-y-4">
          {pinnedAnnouncements.length > 0 && (
            <h2 className="text-sm font-medium text-muted-foreground">All Announcements</h2>
          )}
          <div className="space-y-4">
            {regularAnnouncements.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        </div>

        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No announcements found</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <div className="rounded-xl bg-card p-6 shadow-card transition-all hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
              categoryStyles[announcement.category]
            )}>
              {announcement.category}
            </span>
            {announcement.isPinned && (
              <Pin className="h-3.5 w-3.5 text-accent" />
            )}
          </div>
          
          <h3 className="font-display text-lg font-semibold text-card-foreground">
            {announcement.title}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {announcement.content}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {announcement.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {announcement.date}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
