import { MessageSquare, Megaphone, FileText, Vote, CheckSquare, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'announcement' | 'chat' | 'document' | 'poll' | 'election' | 'finance';
  title: string;
  description: string;
  time: Date;
}

interface RecentActivityProps {
  activities: Activity[];
  loading?: boolean;
}

const iconMap = {
  announcement: Megaphone,
  chat: MessageSquare,
  document: FileText,
  poll: Vote,
  election: CheckSquare,
  finance: DollarSign,
};

const colorMap = {
  announcement: 'bg-accent/10 text-accent',
  chat: 'bg-success/10 text-success',
  document: 'bg-primary/10 text-primary',
  poll: 'bg-warning/10 text-warning',
  election: 'bg-blue-500/10 text-blue-500',
  finance: 'bg-emerald-500/10 text-emerald-500',
};

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  const formatTime = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <h3 className="font-display text-lg font-semibold text-card-foreground mb-4">
        Recent Activity
      </h3>
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-start gap-4 rounded-lg p-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent activity
          </div>
        ) : (
          activities.map((activity) => {
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
                <div className="flex-1 space-y-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(activity.time)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
