import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createAnnouncement, getFacultyEmails, sendAnnouncementNotification } from '@/services/announcementService';
import { logAnnouncementAction } from '@/services/logService';
import { AnnouncementCategory } from '@/types/announcement';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be less than 5000 characters'),
  category: z.enum(['general', 'urgent', 'event', 'memo']),
  isPinned: z.boolean(),
  sendNotification: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAnnouncementDialog({ open, onOpenChange }: CreateAnnouncementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      category: 'general',
      isPinned: false,
      sendNotification: true,
    },
  });

  const category = watch('category');
  const isPinned = watch('isPinned');
  const sendNotification = watch('sendNotification');

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Create the announcement
      await createAnnouncement(
        {
          title: data.title,
          content: data.content,
          category: data.category as AnnouncementCategory,
          isPinned: data.isPinned,
        },
        user.id,
        user.name
      );

      // If notifications are enabled, send email to faculty
      if (data.sendNotification) {
        try {
          console.log('Fetching faculty emails...');
          const facultyList = await getFacultyEmails();
          
          console.log('Faculty list:', facultyList);
          
          if (facultyList.length > 0) {
            console.log('Sending notifications to', facultyList.length, 'faculty members');
            const result = await sendAnnouncementNotification(facultyList, {
              title: data.title,
              content: data.content,
              category: data.category,
              author: user.name,
            });
            
            console.log('Notification result:', result);
            
            if (result.success) {
              toast({
                title: 'Notifications sent',
                description: result.message,
              });
            } else {
              toast({
                title: 'Notification warning',
                description: `Announcement published, but email notifications failed: ${result.message}`,
                variant: 'destructive',
              });
            }
          } else {
            console.warn('No active faculty members found to notify');
            toast({
              title: 'No faculty found',
              description: 'No active faculty members were found to send notifications to.',
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('Error sending notifications:', error);
          toast({
            title: 'Notification error',
            description: `Failed to send notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: 'destructive',
          });
        }
      }

      // Log the action
      await logAnnouncementAction('created', data.title, user.id, user.name, {
        category: data.category,
        isPinned: data.isPinned,
      });

      toast({
        title: 'Announcement created',
        description: 'Your announcement has been published successfully.',
      });

      reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create announcement',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Announcement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter announcement title"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Enter announcement content"
              rows={5}
              {...register('content')}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(value) => setValue('category', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="memo">Memo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPinned"
                  checked={isPinned}
                  onCheckedChange={(checked) => setValue('isPinned', checked === true)}
                />
                <Label htmlFor="isPinned" className="font-normal">
                  Pin this announcement
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox
              id="sendNotification"
              checked={sendNotification}
              onCheckedChange={(checked) => setValue('sendNotification', checked === true)}
            />
            <Label htmlFor="sendNotification" className="font-normal">
              Notify all faculty members (email & push notification)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish Announcement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
