import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useFaculty } from '@/contexts/FacultyContext';
import { VoteDialog } from '@/components/elections/VoteDialog';
import {
  subscribeElections,
  subscribeElectionVotes,
  getElectionWithVotes,
  calculateVoteCounts,
  calculateWinners,
  hasUserVoted,
  endElection,
} from '@/services/electionService';
import { Election, ElectionWithVotes, Vote } from '@/types/election';
import { Plus, Vote as VoteIcon, Calendar, Trophy, Users, CheckCircle, BarChart3, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusStyles = {
  active: { bg: 'bg-success/10', text: 'text-success', label: 'Voting Open' },
  upcoming: { bg: 'bg-accent/10', text: 'text-accent', label: 'Upcoming' },
  ended: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Ended' },
};

export default function Elections() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getFacultyById } = useFaculty();
  const isAdmin = user?.role === 'admin';
  const [elections, setElections] = useState<Election[]>([]);
  const [electionsWithVotes, setElectionsWithVotes] = useState<ElectionWithVotes[]>([]);
  const [votingElection, setVotingElection] = useState<ElectionWithVotes | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'ended'>('active');

  // Subscribe to elections
  useEffect(() => {
    const unsubscribe = subscribeElections((electionsList) => {
      setElections(electionsList);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to votes and update election data
  useEffect(() => {
    if (elections.length === 0 || !user) return;

    const unsubscribes: (() => void)[] = [];

    const loadElectionsWithVotes = async () => {
      const electionsData = await Promise.all(
        elections.map(async (election) => {
          const electionWithVotes = await getElectionWithVotes(election.id, user.id);
          if (!electionWithVotes) return null;

          // Subscribe to real-time vote updates
          const unsubscribe = subscribeElectionVotes(election.id, async (votes) => {
            const voteCounts = calculateVoteCounts(votes);
            const winners = calculateWinners(election.positions, voteCounts);
            
            // Check if user has voted
            const { hasUserVoted } = await import('@/services/electionService');
            const hasVoted = await hasUserVoted(election.id, user.id);

            setElectionsWithVotes((prev) =>
              prev.map((e) =>
                e.id === election.id
                  ? {
                      ...e,
                      votes,
                      voteCounts,
                      winners,
                      hasVoted,
                    }
                  : e
              )
            );
          });
          unsubscribes.push(unsubscribe);

          return electionWithVotes;
        })
      );

      setElectionsWithVotes(electionsData.filter((e): e is ElectionWithVotes => e !== null));
    };

    loadElectionsWithVotes();

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [elections, user?.id]);

  const filteredElections = electionsWithVotes.filter((e) => {
    if (activeTab === 'active') return e.status === 'active';
    if (activeTab === 'upcoming') return e.status === 'upcoming';
    return e.status === 'ended';
  });

  const handleVoteSuccess = async () => {
    if (votingElection && user) {
      // Refresh election data
      const updated = await getElectionWithVotes(votingElection.id, user.id);
      if (updated) {
        setElectionsWithVotes((prev) =>
          prev.map((e) => (e.id === updated.id ? { ...updated, hasVoted: true } : e))
        );
      }
    }
    setVotingElection(null);
  };

  const handleEndElection = async (electionId: string) => {
    if (!isAdmin) return;
    
    if (window.confirm('Are you sure you want to end this election? This action cannot be undone.')) {
      const success = await endElection(electionId);
      if (success) {
        toast.success('Election ended successfully');
        // Refresh the specific election
        const updated = await getElectionWithVotes(electionId, user?.id);
        if (updated) {
          setElectionsWithVotes((prev) =>
            prev.map((e) => (e.id === electionId ? updated : e))
          );
        }
      } else {
        toast.error('Failed to end election');
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Elections</h1>
            <p className="mt-1 text-muted-foreground">
              Participate in PACFU elections and view results
            </p>
          </div>
          {isAdmin && (
            <Button variant="accent" className="gap-2" onClick={() => navigate('/elections/create')}>
              <Plus className="h-4 w-4" />
              Create Election
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="active">Active Elections</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="ended">History</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6 mt-6">
            {filteredElections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <VoteIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No {activeTab} elections found.</p>
              </div>
            ) : (
              filteredElections.map((election) => (
                <ElectionCard
                  key={election.id}
                  election={election}
                  isAdmin={isAdmin}
                  onVote={() => setVotingElection(election)}
                  onEndElection={handleEndElection}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Vote Dialog */}
      {votingElection && (
        <VoteDialog
          open={!!votingElection}
          onOpenChange={(open) => !open && setVotingElection(null)}
          election={votingElection}
          onVoteSuccess={handleVoteSuccess}
        />
      )}
    </DashboardLayout>
  );
}

function ElectionCard({
  election,
  isAdmin,
  onVote,
  onEndElection,
}: {
  election: ElectionWithVotes;
  isAdmin: boolean;
  onVote: () => void;
  onEndElection: (electionId: string) => Promise<void>;
}) {
  const { getFacultyById } = useFaculty();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every minute for accurate progress calculation
  useEffect(() => {
    if (election.status === 'active') {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [election.status]);
  
  const status = statusStyles[election.status];
  const startDate = election.startDate instanceof Date ? election.startDate : new Date(election.startDate);
  const endDate = election.endDate instanceof Date ? election.endDate : new Date(election.endDate);
  
  // Calculate progress based on time elapsed (more accurate than days)
  const totalTime = endDate.getTime() - startDate.getTime();
  const elapsedTime = currentTime.getTime() - startDate.getTime();
  const progress = totalTime > 0 
    ? Math.min(Math.max((elapsedTime / totalTime) * 100, 0), 100)
    : 0;

  const totalVotes = election.votes?.length || 0;
  const votePercentage = election.totalVoters
    ? Math.round((totalVotes / election.totalVoters) * 100)
    : 0;

  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  status.bg,
                  status.text
                )}
              >
                {status.label}
              </span>
              {election.hasVoted && election.status !== 'upcoming' && (
                <Badge variant="outline" className="gap-1 text-success border-success">
                  <CheckCircle className="h-3 w-3" />
                  Voted
                </Badge>
              )}
              {election.status === 'active' && (
                <>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {format(endDate, 'MMM dd, yyyy HH:mm')}
                  </Badge>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEndElection(election.id)}
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50"
                    >
                      <XCircle className="h-3 w-3" />
                      End Election
                    </Button>
                  )}
                </>
              )}
            </div>
            <h2 className="font-display text-xl font-semibold text-card-foreground">
              {election.title}
            </h2>
            <p className="text-sm text-muted-foreground">{election.description}</p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
            </span>
            {election.totalVoters && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {election.totalVoters} eligible voters
              </span>
            )}
            {election.status !== 'upcoming' && (
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                {totalVotes} votes ({votePercentage}%)
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar for Active Elections */}
        {election.status === 'active' && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Election Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}
      </div>

      {/* Positions & Candidates */}
      <div className="p-6 space-y-6">
        {election.positions.map((position) => {
          const candidates = position.candidateIds
            .map((id) => {
              const faculty = getFacultyById(id);
              return faculty ? { id, ...faculty } : null;
            })
            .filter((c): c is NonNullable<typeof c> => c !== null);

          const voteCounts = election.voteCounts?.[position.id] || {};
          const winners = election.winners?.[position.id] || [];
          const totalPositionVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
          const maxVotes = Math.max(...Object.values(voteCounts), 0);

          return (
            <div key={position.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-card-foreground flex items-center gap-2">
                  <VoteIcon className="h-4 w-4 text-primary" />
                  {position.title}
                  {position.numberOfWinners > 1 && (
                    <span className="text-xs text-muted-foreground font-normal">
                      ({position.numberOfWinners} winners)
                    </span>
                  )}
                </h3>
                {election.status !== 'upcoming' && (
                  <span className="text-xs text-muted-foreground">
                    {totalPositionVotes} vote{totalPositionVotes !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {candidates.map((candidate) => {
                  const votes = voteCounts[candidate.id] || 0;
                  const votePercentage = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
                  const isWinner = winners.includes(candidate.id);
                  const showVotes = election.status !== 'upcoming';

                  return (
                    <div
                      key={candidate.id}
                      className={cn(
                        'flex items-center gap-4 rounded-lg border p-4 transition-colors',
                        isWinner && 'border-success bg-success/5',
                        election.status === 'active' &&
                          !election.hasVoted &&
                          'hover:border-primary hover:bg-primary/5'
                      )}
                    >
                      <Avatar className="h-12 w-12">
                        {candidate.avatar ? (
                          <AvatarImage 
                            src={candidate.avatar} 
                            alt={candidate.name}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {candidate.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-card-foreground flex items-center gap-2 truncate">
                          {candidate.name}
                          {isWinner && <Trophy className="h-4 w-4 text-accent flex-shrink-0" />}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{candidate.department}</p>
                        {showVotes && (
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Votes</span>
                              <span className="font-medium">{votes}</span>
                            </div>
                            <Progress value={votePercentage} className="h-1.5" />
                          </div>
                        )}
                      </div>
                      {showVotes && (
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-card-foreground">{votes}</p>
                          <p className="text-xs text-muted-foreground">votes</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {election.status === 'active' && !election.hasVoted && (
        <div className="px-6 pb-6">
          {!isAdmin ? (
            <Button className="w-full sm:w-auto" onClick={onVote}>
              <VoteIcon className="h-4 w-4 mr-2" />
              Cast Your Vote
            </Button>
          ) : (
            <div className="text-sm text-muted-foreground">
              Admin users cannot vote in elections.
            </div>
          )}
        </div>
      )}

      {election.status === 'ended' && (
        <div className="px-6 pb-6 border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4 text-accent" />
            <span>Winners have been determined for all positions.</span>
          </div>
        </div>
      )}
    </div>
  );
}

