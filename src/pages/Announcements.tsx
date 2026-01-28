import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Pin, Clock, User, MoreVertical, Edit, Trash2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Announcement } from '@/types/announcement';
import { subscribeToAnnouncements, toggleAnnouncementPin } from '@/services/announcementService';
import { CreateAnnouncementDialog } from '@/components/announcements/CreateAnnouncementDialog';
import { EditAnnouncementDialog } from '@/components/announcements/EditAnnouncementDialog';
import { DeleteAnnouncementDialog } from '@/components/announcements/DeleteAnnouncementDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const categoryStyles = {
  general: 'bg-primary/10 text-primary',
  urgent: 'bg-destructive/10 text-destructive',
  event: 'bg-accent/10 text-accent',
  memo: 'bg-muted text-muted-foreground',
};

export default function Announcements() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const userDepartment = user?.department;
  const [searchQuery, setSearchQuery] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Subscribe to announcements
  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements((data) => {
      setAnnouncements(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter announcements based on search and user's department
  const filteredAnnouncements = announcements.filter(a => {
    // Search filter
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Department filter - admins see all, faculty only sees 'all' or their department in the list
    const matchesDepartment = isAdmin || 
      a.audience === 'all' || 
      (a.audience === 'departments' && a.departments?.includes(userDepartment || ''));
    
    return matchesSearch && matchesDepartment;
  });

  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.isPinned);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.isPinned);

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowEditDialog(true);
  };

  const handleDelete = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDeleteDialog(true);
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      await toggleAnnouncementPin(announcement.id, announcement.isPinned);
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

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
            <Button variant="default" className="gap-2" onClick={() => setShowCreateDialog(true)}>
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Pinned Announcements */}
            {pinnedAnnouncements.length > 0 && (
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Pin className="h-4 w-4" />
                  Pinned
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {pinnedAnnouncements.map((announcement) => (
                    <AnnouncementCard 
                      key={announcement.id} 
                      announcement={announcement}
                      isAdmin={isAdmin}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onTogglePin={handleTogglePin}
                    />
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
                  <AnnouncementCard 
                    key={announcement.id} 
                    announcement={announcement}
                    isAdmin={isAdmin}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onTogglePin={handleTogglePin}
                  />
                ))}
              </div>
            </div>

            {filteredAnnouncements.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No announcements found</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <CreateAnnouncementDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      <EditAnnouncementDialog
        announcement={selectedAnnouncement}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
      <DeleteAnnouncementDialog
        announcement={selectedAnnouncement}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </DashboardLayout>
  );
}

interface AnnouncementCardProps {
  announcement: Announcement;
  isAdmin: boolean;
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcement: Announcement) => void;
  onTogglePin: (announcement: Announcement) => void;
}

function AnnouncementCard({ announcement, isAdmin, onEdit, onDelete, onTogglePin }: AnnouncementCardProps) {
  const formattedDate = format(announcement.createdAt, 'MMM d, yyyy');

  return (
    <div className="rounded-xl bg-card p-6 shadow-card transition-all hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
              categoryStyles[announcement.category]
            )}>
              {announcement.category}
            </span>
            {announcement.isPinned && (
              <Pin className="h-3.5 w-3.5 text-accent" />
            )}
            {announcement.audience === 'departments' && announcement.departments && announcement.departments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {announcement.departments.map((dept) => (
                  <Badge key={dept} variant="outline" className="text-xs gap-1">
                    <Building2 className="h-3 w-3" />
                    {dept}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <h3 className="font-display text-lg font-semibold text-card-foreground">
            {announcement.title}
          </h3>
          
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {announcement.content}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {announcement.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>
        </div>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTogglePin(announcement)}>
                <Pin className="mr-2 h-4 w-4" />
                {announcement.isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(announcement)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(announcement)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
