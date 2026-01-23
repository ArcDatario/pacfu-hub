import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Clock, CheckCircle, MoreVertical, Vote, StopCircle, Play, Trash2 } from 'lucide-react';
import { Poll, PollResponse } from '@/types/poll';
import { subscribePollResponses, endPoll, deletePoll, reactivatePoll, calculateVoteCounts, getUserResponse } from '@/services/pollService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PollCardProps {
  poll: Poll;
  onVote?: (poll: Poll) => void;
}

const statusStyles = {
  active: 'bg-success/10 text-success border-success/20',
  ended: 'bg-muted text-muted-foreground border-muted',
};

export function PollCard({ poll, onVote }: PollCardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [responses, setResponses] = useState<PollResponse[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribePollResponses(poll.id, (newResponses) => {
      setResponses(newResponses);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [poll.id]);

  useEffect(() => {
    if (user?.id) {
      const checkVoted = async () => {
        const userResponse = await getUserResponse(poll.id, user.id);
        setHasVoted(!!userResponse);
      };
      checkVoted();
    }
  }, [poll.id, user?.id, responses]);

  const voteCounts = calculateVoteCounts(responses);
  const totalVotes = responses.length;
  const maxVotes = Math.max(...Object.values(voteCounts), 0);

  const handleEndPoll = async () => {
    setIsProcessing(true);
    try {
      await endPoll(poll.id);
      toast({ title: 'Poll ended successfully' });
    } catch (error) {
      toast({ title: 'Failed to end poll', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setShowEndDialog(false);
    }
  };

  const handleReactivatePoll = async () => {
    setIsProcessing(true);
    try {
      await reactivatePoll(poll.id);
      toast({ title: 'Poll reactivated successfully' });
    } catch (error) {
      toast({ title: 'Failed to reactivate poll', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePoll = async () => {
    setIsProcessing(true);
    try {
      await deletePoll(poll.id);
      toast({ title: 'Poll deleted successfully' });
    } catch (error) {
      toast({ title: 'Failed to delete poll', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setShowDeleteDialog(false);
    }
  };

  const createdAt = poll.createdAt instanceof Date 
    ? poll.createdAt 
    : new Date(poll.createdAt);

  return (
    <>
      <div className="rounded-xl bg-card p-6 shadow-card border border-border">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('capitalize', statusStyles[poll.status])}>
                {poll.status}
              </Badge>
              {poll.allowMultiple && (
                <Badge variant="secondary" className="text-xs">
                  Multiple Choice
                </Badge>
              )}
            </div>
            <h3 className="font-display text-lg font-semibold text-card-foreground mt-2">
              {poll.title}
            </h3>
            {poll.description && (
              <p className="text-sm text-muted-foreground">{poll.description}</p>
            )}
          </div>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border shadow-md z-50">
                {poll.status === 'active' ? (
                  <DropdownMenuItem onClick={() => setShowEndDialog(true)}>
                    <StopCircle className="h-4 w-4 mr-2" />
                    End Poll
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleReactivatePoll}>
                    <Play className="h-4 w-4 mr-2" />
                    Reactivate Poll
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Poll
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-3 mb-4">
          {poll.options.map((option) => {
            const votes = voteCounts[option.id] || 0;
            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const isWinning = votes === maxVotes && poll.status === 'ended' && votes > 0;

            return (
              <div key={option.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {isWinning && <CheckCircle className="h-4 w-4 text-success" />}
                    {option.label}
                  </span>
                  <span className="text-muted-foreground">
                    {votes} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isWinning ? 'bg-success' : 'bg-primary/60'
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
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Created {format(createdAt, 'MMM d, yyyy')}
          </span>
        </div>

        {/* Only faculty can vote - admins can only manage polls */}
        {!isAdmin && poll.status === 'active' && !hasVoted && (
          <Button className="w-full mt-4" onClick={() => onVote?.(poll)}>
            <Vote className="h-4 w-4 mr-2" />
            Cast Your Vote
          </Button>
        )}

        {!isAdmin && hasVoted && poll.status === 'active' && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            ✓ You've voted in this poll
          </p>
        )}

        {isAdmin && poll.status === 'active' && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Admins can only manage polls, not vote
          </p>
        )}
      </div>

      {/* End Poll Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Poll</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this poll? No more votes will be accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndPoll} disabled={isProcessing}>
              {isProcessing ? 'Ending...' : 'End Poll'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Poll Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Poll</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this poll? This action cannot be undone and all votes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePoll}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Deleting...' : 'Delete Poll'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
