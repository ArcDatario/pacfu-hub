import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, BarChart3, Clock, Loader2 } from 'lucide-react';
import { Poll } from '@/types/poll';
import { subscribePolls } from '@/services/pollService';
import { PollCard } from '@/components/polls/PollCard';
import { CreatePollDialog } from '@/components/polls/CreatePollDialog';
import { VotePollDialog } from '@/components/polls/VotePollDialog';

export default function Polls() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribePolls((newPolls) => {
      setPolls(newPolls);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const activePolls = polls.filter((p) => p.status === 'active');
  const pastPolls = polls.filter((p) => p.status === 'ended');

  const handleVote = (poll: Poll) => {
    setSelectedPoll(poll);
    setVoteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

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
            <Button variant="accent" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
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
          {activePolls.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {activePolls.map((poll) => (
                <PollCard key={poll.id} poll={poll} onVote={handleVote} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-card p-8 text-center border border-border">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No active polls at the moment.</p>
              {isAdmin && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Poll
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Past Polls */}
        {pastPolls.length > 0 && (
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
        )}
      </div>

      {/* Create Poll Dialog */}
      <CreatePollDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {/* Vote Poll Dialog */}
      <VotePollDialog
        poll={selectedPoll}
        open={voteDialogOpen}
        onOpenChange={setVoteDialogOpen}
      />
    </DashboardLayout>
  );
}
