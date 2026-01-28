import { Calendar, Vote, CheckSquare, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface UpcomingEvent {
  id: string;
  title: string;
  date: Date;
  type: 'election' | 'poll' | 'announcement';
}

interface UpcomingEventsProps {
  events: UpcomingEvent[];
  loading?: boolean;
}

const typeStyles = {
  election: 'border-l-blue-500 bg-blue-500/5',
  poll: 'border-l-warning bg-warning/5',
  announcement: 'border-l-accent bg-accent/5',
};

const typeIcons = {
  election: CheckSquare,
  poll: Vote,
  announcement: Megaphone,
};

const typeLabels = {
  election: 'Election',
  poll: 'Active Poll',
  announcement: 'Announcement',
};

export function UpcomingEvents({ events, loading }: UpcomingEventsProps) {
  const formatDate = (date: Date) => {
    try {
      return format(date, 'MMM d, yyyy');
    } catch {
      return 'Unknown date';
    }
  };

  const formatTime = (date: Date) => {
    try {
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <h3 className="font-display text-lg font-semibold text-card-foreground mb-4">
        Upcoming & Active
      </h3>
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[80px] rounded-lg" />
          ))
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No upcoming events
          </div>
        ) : (
          events.map((event) => {
            const Icon = typeIcons[event.type];
            return (
              <div
                key={event.id}
                className={cn(
                  "rounded-lg border-l-4 p-4 transition-all hover:shadow-sm",
                  typeStyles[event.type]
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-card-foreground truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {typeLabels[event.type]}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.date)}
                      </span>
                      {event.type === 'election' && (
                        <span className="text-blue-500 font-medium">
                          Ends {formatTime(event.date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
