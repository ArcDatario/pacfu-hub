import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useFaculty } from '@/contexts/FacultyContext';
import { castVotes } from '@/services/electionService';
import { toast } from 'sonner';
import { ElectionWithVotes } from '@/types/election';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface VoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election: ElectionWithVotes;
  onVoteSuccess: () => void;
}

export function VoteDialog({ open, onOpenChange, election, onVoteSuccess }: VoteDialogProps) {
  const { user } = useAuth();
  const { getFacultyById } = useFaculty();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({});

  // Initialize selected votes when dialog opens
  useEffect(() => {
    if (open) {
      const initialVotes: Record<string, string> = {};
      election.positions.forEach((position) => {
        // Pre-select first candidate if available
        if (position.candidateIds.length > 0) {
          initialVotes[position.id] = position.candidateIds[0];
        }
      });
      setSelectedVotes(initialVotes);
    } else {
      // Reset when dialog closes
      setSelectedVotes({});
    }
  }, [open, election]);

  const handleVoteChange = (positionId: string, candidateId: string) => {
    console.log('handleVoteChange called:', { positionId, candidateId });
    setSelectedVotes((prev) => {
      const newVotes = {
        ...prev,
        [positionId]: candidateId,
      };
      console.log('Updated votes:', newVotes);
      return newVotes;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all positions have votes
    for (const position of election.positions) {
      if (!selectedVotes[position.id]) {
        toast.error(`Please select a candidate for ${position.title}`);
        return;
      }
    }

    if (!user) {
      toast.error('You must be logged in to vote');
      return;
    }

    setIsLoading(true);

    try {
      const votes = election.positions.map((position) => ({
        positionId: position.id,
        candidateId: selectedVotes[position.id],
      }));

      await castVotes(election.id, user.id, votes);
      toast.success('Your vote has been cast successfully');
      onVoteSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error casting vote:', error);
      toast.error(error.message || 'Failed to cast vote');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Cast Your Vote</DialogTitle>
          <DialogDescription>
            Select your preferred candidate for each position. You can only vote once.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4" style={{ pointerEvents: 'auto' }}>
          <form onSubmit={handleSubmit} className="space-y-6" style={{ pointerEvents: 'auto' }}>
            {election.positions.map((position) => {
              const selectedCandidate = selectedVotes[position.id];
              const candidates = position.candidateIds
                .map((id) => {
                  const faculty = getFacultyById(id);
                  if (!faculty) {
                    console.warn(`Faculty member with ID ${id} not found`);
                    return null;
                  }
                  return { id, ...faculty };
                })
                .filter((c): c is NonNullable<typeof c> => c !== null);
              
              if (candidates.length === 0 && position.candidateIds.length > 0) {
                console.error(`No candidates found for position ${position.title}. Candidate IDs:`, position.candidateIds);
              }

              return (
                <div key={position.id} className="space-y-3 border rounded-lg p-4 bg-card">
                  <div>
                    <Label className="text-base font-semibold">{position.title}</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select {position.numberOfWinners} winner{position.numberOfWinners > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {candidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No candidates available for this position.
                      </p>
                    ) : (
                      candidates.map((candidate) => {
                        const isSelected = selectedCandidate === candidate.id;
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => {
                              console.log('Candidate clicked:', candidate.name, 'Position:', position.id);
                              handleVoteChange(position.id, candidate.id);
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary ring-offset-2'
                                : 'border-border hover:border-primary/50 hover:bg-accent/50 active:bg-accent'
                            }`}
                          >
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected 
                                ? 'border-primary bg-primary' 
                                : 'border-muted-foreground'
                            }`}>
                              {isSelected && (
                                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                              )}
                            </div>
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              {candidate.avatar ? (
                                <AvatarImage 
                                  src={candidate.avatar} 
                                  alt={candidate.name}
                                  className="object-cover"
                                />
                              ) : null}
                              <AvatarFallback className="bg-accent text-accent-foreground">
                                {candidate.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{candidate.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {candidate.department}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Vote'}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
