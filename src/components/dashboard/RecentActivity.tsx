import { MessageSquare, Megaphone, FileText, Vote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'announcement' | 'chat' | 'document' | 'poll';
  title: string;
  description: string;
  time: string;
}

const activities: Activity[] = [
  {
    id: '1',
    type: 'announcement',
    title: 'Faculty Meeting Reminder',
    description: 'Monthly faculty meeting scheduled for Friday',
    time: '10 min ago',
  },
  {
    id: '2',
    type: 'chat',
    title: 'New message in Research Group',
    description: 'Dr. Garcia shared new research materials',
    time: '25 min ago',
  },
  {
    id: '3',
    type: 'document',
    title: 'Syllabus submitted',
    description: 'Prof. Reyes uploaded course syllabus',
    time: '1 hour ago',
  },
  {
    id: '4',
    type: 'poll',
    title: 'Workshop date poll',
    description: 'New poll for upcoming workshop dates',
    time: '2 hours ago',
  },
];

const iconMap = {
  announcement: Megaphone,
  chat: MessageSquare,
  document: FileText,
  poll: Vote,
};

const colorMap = {
  announcement: 'bg-accent/10 text-accent',
  chat: 'bg-success/10 text-success',
  document: 'bg-primary/10 text-primary',
  poll: 'bg-warning/10 text-warning',
};

export function RecentActivity() {
  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <h3 className="font-display text-lg font-semibold text-card-foreground mb-4">
        Recent Activity
      </h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = iconMap[activity.type];
          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50"
            >
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                colorMap[activity.type]
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-card-foreground">
                  {activity.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
