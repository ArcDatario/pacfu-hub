import { useState, useEffect } from 'react';
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
import { createAnnouncement, getFacultyEmails, sendAnnouncementNotification, sendPushNotifications } from '@/services/announcementService';
import { logAnnouncementAction } from '@/services/logService';
import { AnnouncementCategory, TargetAudienceType } from '@/types/announcement';
import { Loader2 } from 'lucide-react';
import { subscribeToGroups } from '@/services/groupService';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be less than 5000 characters'),
  category: z.enum(['general', 'urgent', 'event', 'memo']),
  isPinned: z.boolean(),
  sendNotification: z.boolean(),
  targetType: z.enum(['all', 'department', 'group']),
  targetDepartments: z.array(z.string()),
  targetGroups: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

const DEPARTMENTS = [
  'College of Agriculture and Food Science',
  'College of Arts and Sciences',
  'College of Business Administration and Accountancy',
  'College of Education',
  'College of Engineering',
  'College of Veterinary Medicine',
];

interface CreateAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAnnouncementDialog({ open, onOpenChange }: CreateAnnouncementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToGroups((groupList) => {
      setGroups(groupList.map(g => g.name));
    });
    return () => unsubscribe();
  }, []);

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
      targetType: 'all',
      targetDepartments: [],
      targetGroups: [],
    },
  });

  const category = watch('category');
  const isPinned = watch('isPinned');
  const sendNotification = watch('sendNotification');
  const targetType = watch('targetType');
  const targetDepartments = watch('targetDepartments');
  const targetGroups = watch('targetGroups');

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Build target audience
      const targetAudience = {
        type: data.targetType as TargetAudienceType,
        departments: data.targetType === 'department' ? data.targetDepartments : undefined,
        groups: data.targetType === 'group' ? data.targetGroups : undefined,
      };

      // Create the announcement
      await createAnnouncement(
        {
          title: data.title,
          content: data.content,
          category: data.category as AnnouncementCategory,
          isPinned: data.isPinned,
          targetAudience,
        },
        user.id,
        user.name
      );

      // If notifications are enabled, send email and push notifications
      if (data.sendNotification) {
        try {
          console.log('Fetching faculty emails...');
          const facultyList = await getFacultyEmails(targetAudience);
          
          console.log('Faculty list:', facultyList);
          
          if (facultyList.length > 0) {
            // Send email notifications
            console.log('Sending email notifications to', facultyList.length, 'faculty members');
            const emailResult = await sendAnnouncementNotification(facultyList, {
              title: data.title,
              content: data.content,
              category: data.category,
              author: user.name,
            });
            
            if (emailResult.success) {
              toast({
                title: 'Email notifications sent',
                description: emailResult.message,
              });
            }

            // Send push notifications
            console.log('Sending push notifications...');
            const pushResult = await sendPushNotifications(facultyList, {
              title: `New Announcement: ${data.title}`,
              body: data.content.substring(0, 100) + (data.content.length > 100 ? '...' : ''),
              category: data.category,
            });

            if (pushResult.success) {
              toast({
                title: 'Push notifications sent',
                description: pushResult.message,
              });
            }
          } else {
            console.warn('No active faculty members found to notify');
            toast({
              title: 'No faculty found',
              description: 'No active faculty members matched the target audience.',
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
        targetAudience,
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

  const toggleDepartment = (dept: string) => {
    const current = targetDepartments || [];
    if (current.includes(dept)) {
      setValue('targetDepartments', current.filter(d => d !== dept));
    } else {
      setValue('targetDepartments', [...current, dept]);
    }
  };

  const toggleGroup = (group: string) => {
    const current = targetGroups || [];
    if (current.includes(group)) {
      setValue('targetGroups', current.filter(g => g !== group));
    } else {
      setValue('targetGroups', [...current, group]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

          {/* Target Audience Section */}
          <div className="space-y-3 border-t pt-4">
            <Label>Target Audience</Label>
            <Select
              value={targetType}
              onValueChange={(value) => setValue('targetType', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Faculty Members</SelectItem>
                <SelectItem value="department">Specific Departments</SelectItem>
                <SelectItem value="group">Specific Groups</SelectItem>
              </SelectContent>
            </Select>

            {targetType === 'department' && (
              <div className="space-y-2 pl-2">
                <Label className="text-sm text-muted-foreground">Select Departments</Label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {DEPARTMENTS.map((dept) => (
                    <div key={dept} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept}`}
                        checked={targetDepartments?.includes(dept)}
                        onCheckedChange={() => toggleDepartment(dept)}
                      />
                      <Label htmlFor={`dept-${dept}`} className="font-normal text-sm">
                        {dept}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {targetType === 'group' && (
              <div className="space-y-2 pl-2">
                <Label className="text-sm text-muted-foreground">Select Groups</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {groups.map((group) => (
                    <div key={group} className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${group}`}
                        checked={targetGroups?.includes(group)}
                        onCheckedChange={() => toggleGroup(group)}
                      />
                      <Label htmlFor={`group-${group}`} className="font-normal text-sm">
                        {group}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox
              id="sendNotification"
              checked={sendNotification}
              onCheckedChange={(checked) => setValue('sendNotification', checked === true)}
            />
            <Label htmlFor="sendNotification" className="font-normal">
              Notify faculty members (email & push notification)
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
