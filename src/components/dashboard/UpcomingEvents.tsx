import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'meeting' | 'deadline' | 'event';
}

const events: Event[] = [
  {
    id: '1',
    title: 'Faculty General Assembly',
    date: 'Jan 20, 2026',
    time: '2:00 PM',
    type: 'meeting',
  },
  {
    id: '2',
    title: 'Syllabus Submission Deadline',
    date: 'Jan 22, 2026',
    time: '11:59 PM',
    type: 'deadline',
  },
  {
    id: '3',
    title: 'Research Workshop',
    date: 'Jan 25, 2026',
    time: '9:00 AM',
    type: 'event',
  },
];

const typeStyles = {
  meeting: 'border-l-primary bg-primary/5',
  deadline: 'border-l-destructive bg-destructive/5',
  event: 'border-l-accent bg-accent/5',
};

export function UpcomingEvents() {
  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <h3 className="font-display text-lg font-semibold text-card-foreground mb-4">
        Upcoming Events
      </h3>
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              "rounded-lg border-l-4 p-4 transition-all hover:shadow-sm",
              typeStyles[event.type]
            )}
          >
            <p className="font-medium text-card-foreground">{event.title}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {event.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {event.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
