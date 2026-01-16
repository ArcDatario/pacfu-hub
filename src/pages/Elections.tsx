import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Vote, Calendar, Trophy, Users, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Candidate {
  id: string;
  name: string;
  position: string;
  department: string;
  votes?: number;
}

interface Election {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'upcoming' | 'ended';
  startDate: string;
  endDate: string;
  totalVoters: number;
  hasVoted: boolean;
  positions: {
    title: string;
    candidates: Candidate[];
  }[];
}

const elections: Election[] = [
  {
    id: '1',
    title: 'PACFU Officers Election 2026-2028',
    description: 'Elect the new set of PACFU officers for the term 2026-2028',
    status: 'active',
    startDate: 'Jan 15, 2026',
    endDate: 'Jan 25, 2026',
    totalVoters: 124,
    hasVoted: false,
    positions: [
      {
        title: 'President',
        candidates: [
          { id: '1', name: 'Dr. Maria Santos', position: 'President', department: 'College of Arts' },
          { id: '2', name: 'Dr. Jose Garcia', position: 'President', department: 'College of Science' },
        ],
      },
      {
        title: 'Vice President',
        candidates: [
          { id: '3', name: 'Prof. Ana Reyes', position: 'Vice President', department: 'College of Engineering' },
          { id: '4', name: 'Dr. Pedro Lim', position: 'Vice President', department: 'College of Business' },
        ],
      },
    ],
  },
  {
    id: '2',
    title: 'Research Committee Chair Election',
    description: 'Select the new Research Committee Chairperson',
    status: 'ended',
    startDate: 'Dec 1, 2025',
    endDate: 'Dec 15, 2025',
    totalVoters: 98,
    hasVoted: true,
    positions: [
      {
        title: 'Chair',
        candidates: [
          { id: '5', name: 'Dr. Elena Cruz', position: 'Chair', department: 'Graduate Studies', votes: 52 },
          { id: '6', name: 'Prof. Marco Tan', position: 'Chair', department: 'Research Office', votes: 46 },
        ],
      },
    ],
  },
];

const statusStyles = {
  active: { bg: 'bg-success/10', text: 'text-success', label: 'Voting Open' },
  upcoming: { bg: 'bg-accent/10', text: 'text-accent', label: 'Upcoming' },
  ended: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Ended' },
};

export default function Elections() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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
            <Button variant="accent" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Election
            </Button>
          )}
        </div>

        {/* Elections List */}
        <div className="space-y-6">
          {elections.map((election) => (
            <ElectionCard key={election.id} election={election} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function ElectionCard({ election }: { election: Election }) {
  const status = statusStyles[election.status];

  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                status.bg, status.text
              )}>
                {status.label}
              </span>
              {election.hasVoted && election.status !== 'upcoming' && (
                <span className="inline-flex items-center gap-1 text-xs text-success">
                  <CheckCircle className="h-3 w-3" />
                  Voted
                </span>
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
              {election.startDate} - {election.endDate}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {election.totalVoters} eligible voters
            </span>
          </div>
        </div>
      </div>

      {/* Positions & Candidates */}
      <div className="p-6 space-y-6">
        {election.positions.map((position, posIndex) => (
          <div key={posIndex}>
            <h3 className="font-medium text-card-foreground mb-3 flex items-center gap-2">
              <Vote className="h-4 w-4 text-primary" />
              {position.title}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {position.candidates.map((candidate) => {
                const isWinner = election.status === 'ended' && 
                  candidate.votes === Math.max(...position.candidates.map(c => c.votes || 0));
                
                return (
                  <div
                    key={candidate.id}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border p-4 transition-colors",
                      election.status === 'active' && !election.hasVoted 
                        ? "cursor-pointer hover:border-primary hover:bg-primary/5"
                        : "",
                      isWinner && "border-success bg-success/5"
                    )}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                      {candidate.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-card-foreground flex items-center gap-2">
                        {candidate.name}
                        {isWinner && <Trophy className="h-4 w-4 text-accent" />}
                      </p>
                      <p className="text-sm text-muted-foreground">{candidate.department}</p>
                    </div>
                    {election.status === 'ended' && candidate.votes !== undefined && (
                      <div className="text-right">
                        <p className="font-semibold text-card-foreground">{candidate.votes}</p>
                        <p className="text-xs text-muted-foreground">votes</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {election.status === 'active' && !election.hasVoted && (
        <div className="px-6 pb-6">
          <Button className="w-full sm:w-auto">
            Cast Your Vote
          </Button>
        </div>
      )}
    </div>
  );
}
