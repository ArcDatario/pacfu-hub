import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, BarChart3, Clock, CheckCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Poll {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'ended' | 'upcoming';
  totalVotes: number;
  endDate: string;
  options: { label: string; votes: number }[];
  hasVoted: boolean;
}

const polls: Poll[] = [
  {
    id: '1',
    title: 'Preferred Date for Faculty Workshop',
    description: 'Please vote for your preferred date for the upcoming faculty development workshop.',
    status: 'active',
    totalVotes: 45,
    endDate: 'Jan 20, 2026',
    options: [
      { label: 'February 5, 2026', votes: 18 },
      { label: 'February 12, 2026', votes: 15 },
      { label: 'February 19, 2026', votes: 12 },
    ],
    hasVoted: false,
  },
  {
    id: '2',
    title: 'Faculty Assembly Meeting Time',
    description: 'Vote for the most convenient time for monthly faculty assembly meetings.',
    status: 'active',
    totalVotes: 62,
    endDate: 'Jan 18, 2026',
    options: [
      { label: '9:00 AM - 11:00 AM', votes: 25 },
      { label: '2:00 PM - 4:00 PM', votes: 30 },
      { label: '4:00 PM - 6:00 PM', votes: 7 },
    ],
    hasVoted: true,
  },
  {
    id: '3',
    title: 'Research Publication Support',
    description: 'Should PACFU allocate additional funds for research publication support?',
    status: 'ended',
    totalVotes: 89,
    endDate: 'Jan 10, 2026',
    options: [
      { label: 'Yes, increase by 50%', votes: 45 },
      { label: 'Yes, increase by 25%', votes: 28 },
      { label: 'Keep current allocation', votes: 16 },
    ],
    hasVoted: true,
  },
];

const statusStyles = {
  active: 'bg-success/10 text-success',
  ended: 'bg-muted text-muted-foreground',
  upcoming: 'bg-accent/10 text-accent',
};

export default function Polls() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const activePools = polls.filter(p => p.status === 'active');
  const pastPolls = polls.filter(p => p.status === 'ended');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Polls & Surveys</h1>
            <p className="mt-1 text-muted-foreground">
              Participate in faculty polls and surveys
            </p>
          </div>
          {isAdmin && (
            <Button variant="accent" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Poll
            </Button>
          )}
        </div>

        {/* Active Polls */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-medium text-foreground">
            <BarChart3 className="h-5 w-5 text-success" />
            Active Polls
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activePools.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
          {activePools.length === 0 && (
            <p className="text-muted-foreground py-4">No active polls at the moment.</p>
          )}
        </div>

        {/* Past Polls */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-medium text-foreground">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Past Polls
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pastPolls.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function PollCard({ poll }: { poll: Poll }) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const maxVotes = Math.max(...poll.options.map(o => o.votes));

  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
            statusStyles[poll.status]
          )}>
            {poll.status}
          </span>
          <h3 className="font-display text-lg font-semibold text-card-foreground">
            {poll.title}
          </h3>
          <p className="text-sm text-muted-foreground">{poll.description}</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {poll.options.map((option, index) => {
          const percentage = poll.totalVotes > 0 
            ? Math.round((option.votes / poll.totalVotes) * 100) 
            : 0;
          const isWinning = option.votes === maxVotes && poll.status === 'ended';
          
          return (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => !poll.hasVoted && poll.status === 'active' && setSelectedOption(index)}
                  className={cn(
                    "flex items-center gap-2 text-left",
                    !poll.hasVoted && poll.status === 'active' && "cursor-pointer hover:text-primary",
                    selectedOption === index && "text-primary font-medium"
                  )}
                  disabled={poll.hasVoted || poll.status !== 'active'}
                >
                  {(poll.hasVoted || poll.status === 'ended') && (
                    isWinning ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : null
                  )}
                  {option.label}
                </button>
                <span className="text-muted-foreground">{percentage}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isWinning ? "bg-success" : "bg-primary/60"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {poll.totalVotes} votes
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {poll.status === 'ended' ? 'Ended' : `Ends ${poll.endDate}`}
        </span>
      </div>

      {poll.status === 'active' && !poll.hasVoted && (
        <Button className="w-full mt-4" disabled={selectedOption === null}>
          Submit Vote
        </Button>
      )}

      {poll.hasVoted && poll.status === 'active' && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          ✓ You've voted in this poll
        </p>
      )}
    </div>
  );
}
