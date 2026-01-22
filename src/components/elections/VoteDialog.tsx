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
import { MinusCircle } from 'lucide-react';

interface VoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election: ElectionWithVotes;
  onVoteSuccess: () => void;
}

// Special value to represent "None" option
const NONE_VALUE = 'none';

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
        // Initially no selection for each position (empty string)
        initialVotes[position.id] = '';
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

  const handleSelectNone = (positionId: string) => {
    handleVoteChange(positionId, NONE_VALUE);
  };

  const handleClearSelection = (positionId: string) => {
    handleVoteChange(positionId, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all positions have a selection (either candidate or none)
    for (const position of election.positions) {
      if (selectedVotes[position.id] === undefined || selectedVotes[position.id] === '') {
        toast.error(`Please make a selection for ${position.title}. You can choose a candidate or select "None".`);
        return;
      }
    }

    if (!user) {
      toast.error('You must be logged in to vote');
      return;
    }

    setIsLoading(true);

    try {
      // Filter out "none" votes - these won't be recorded as votes for candidates
      // but will still count as the user having participated in the election
      const votes = election.positions
        .filter(position => selectedVotes[position.id] !== NONE_VALUE)
        .map((position) => ({
          positionId: position.id,
          candidateId: selectedVotes[position.id],
        }));

      // Even if all votes are "none", we still need to record that the user has voted
      // We'll cast an empty vote array, which will still mark the user as having voted
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

  // Check if all positions have selections
  const allPositionsSelected = election.positions.every(
    position => selectedVotes[position.id] !== undefined && selectedVotes[position.id] !== ''
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Cast Your Vote</DialogTitle>
          <DialogDescription>
            Select your preferred candidate for each position, or choose "None" if you prefer not to vote for any candidate. 
            You can only vote once, and your participation will be counted regardless of your choices.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4" style={{ pointerEvents: 'auto' }}>
          <form onSubmit={handleSubmit} className="space-y-6" style={{ pointerEvents: 'auto' }}>
            {election.positions.map((position) => {
              const selectedCandidate = selectedVotes[position.id];
              const isNoneSelected = selectedCandidate === NONE_VALUE;
              const hasSelection = selectedCandidate !== '' && selectedCandidate !== undefined;
              
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
                  <div className="flex justify-between items-start">
                    <div>
                      <Label className="text-base font-semibold">{position.title}</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select {position.numberOfWinners} winner{position.numberOfWinners > 1 ? 's' : ''} or choose "None"
                      </p>
                    </div>
                    
                    {hasSelection && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClearSelection(position.id)}
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <MinusCircle className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* None option */}
                  <button
                    type="button"
                    onClick={() => handleSelectNone(position.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      isNoneSelected
                        ? 'border-destructive bg-destructive/10 shadow-sm ring-2 ring-destructive ring-offset-2'
                        : 'border-border hover:border-destructive/50 hover:bg-destructive/5'
                    }`}
                  >
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isNoneSelected 
                        ? 'border-destructive bg-destructive' 
                        : 'border-muted-foreground'
                    }`}>
                      {isNoneSelected && (
                        <div className="h-2 w-2 rounded-full bg-destructive-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-destructive">None / Abstain</p>
                      <p className="text-xs text-muted-foreground">
                        I choose not to vote for any candidate in this position
                      </p>
                    </div>
                  </button>

                  {/* Candidate options */}
                  <div className="space-y-2">
                    {candidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No candidates available for this position.
                      </p>
                    ) : (
                      candidates.map((candidate) => {
                        const isSelected = selectedCandidate === candidate.id;
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => handleVoteChange(position.id, candidate.id)}
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

                  {/* Current selection indicator */}
                  {hasSelection && !isNoneSelected && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Currently selected: <span className="font-medium text-primary">
                          {candidates.find(c => c.id === selectedCandidate)?.name || 'Unknown'}
                        </span>
                      </p>
                    </div>
                  )}
                  {isNoneSelected && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        You have chosen to <span className="font-medium text-destructive">abstain</span> from voting in this position.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Choosing "None" counts as participation in the election. 
                Your vote will be recorded, and you will be marked as having voted even if you select "None" for all positions.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="accent" 
                disabled={isLoading || !allPositionsSelected}
              >
                {isLoading ? 'Submitting...' : 'Submit Vote'}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}