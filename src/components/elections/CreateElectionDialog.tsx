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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useFaculty } from '@/contexts/FacultyContext';
import { createElection } from '@/services/electionService';
import { toast } from 'sonner';
import { Plus, X, Trash2 } from 'lucide-react';
import { ElectionPosition } from '@/types/election';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CreateElectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateElectionDialog({ open, onOpenChange }: CreateElectionDialogProps) {
  const { user } = useAuth();
  const { facultyMembers } = useFaculty();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
  });
  const [positions, setPositions] = useState<Array<{
    id: string;
    title: string;
    numberOfWinners: number;
    candidateIds: string[];
  }>>([]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({ title: '', description: '', startDate: '', endDate: '' });
      setPositions([]);
    }
  }, [open]);

  const addPosition = () => {
    setPositions([
      ...positions,
      {
        id: `pos_${Date.now()}`,
        title: '',
        numberOfWinners: 1,
        candidateIds: [],
      },
    ]);
  };

  const removePosition = (id: string) => {
    setPositions(positions.filter((p) => p.id !== id));
  };

  const updatePosition = (id: string, field: string, value: any) => {
    setPositions(
      positions.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      )
    );
  };

  // Get all candidate IDs that are already selected in other positions
  const getSelectedCandidateIds = (excludePositionId: string): string[] => {
    return positions
      .filter((p) => p.id !== excludePositionId)
      .flatMap((p) => p.candidateIds);
  };

  // Get available candidates for a position (excluding those already selected in other positions)
  const getAvailableCandidates = (positionId: string) => {
    const selectedInOtherPositions = getSelectedCandidateIds(positionId);
    return activeFaculty.filter((f) => !selectedInOtherPositions.includes(f.id));
  };

  const toggleCandidate = (positionId: string, candidateId: string) => {
    const position = positions.find((p) => p.id === positionId);
    if (!position) return;

    // If unchecking, allow it
    if (position.candidateIds.includes(candidateId)) {
      setPositions(
        positions.map((p) =>
          p.id === positionId
            ? { ...p, candidateIds: p.candidateIds.filter((id) => id !== candidateId) }
            : p
        )
      );
      return;
    }

    // If checking, verify candidate is not already selected in another position
    const selectedInOtherPositions = getSelectedCandidateIds(positionId);
    if (selectedInOtherPositions.includes(candidateId)) {
      toast.error('This candidate is already selected for another position');
      return;
    }

    // Allow selection
    setPositions(
      positions.map((p) =>
        p.id === positionId ? { ...p, candidateIds: [...p.candidateIds, candidateId] } : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (positions.length === 0) {
      toast.error('Please add at least one position');
      return;
    }

    for (const position of positions) {
      if (!position.title) {
        toast.error('All positions must have a title');
        return;
      }
      if (position.numberOfWinners < 1) {
        toast.error('Number of winners must be at least 1');
        return;
      }
      if (position.candidateIds.length === 0) {
        toast.error(`Position "${position.title}" must have at least one candidate`);
        return;
      }
      if (position.numberOfWinners > position.candidateIds.length) {
        toast.error(`Number of winners cannot exceed number of candidates for "${position.title}"`);
        return;
      }
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (startDate >= endDate) {
      toast.error('End date must be after start date');
      return;
    }

    if (startDate < new Date()) {
      toast.error('Start date cannot be in the past');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to create an election');
      return;
    }

    setIsLoading(true);

    try {
      const electionData = {
        title: formData.title,
        description: formData.description,
        startDate,
        endDate,
        positions: positions.map((p) => ({
          title: p.title,
          numberOfWinners: p.numberOfWinners,
          candidateIds: p.candidateIds,
        })),
      };

      const electionId = await createElection(electionData, user.id);

      if (electionId) {
        toast.success('Election created successfully');
        onOpenChange(false);
      } else {
        toast.error('Failed to create election');
      }
    } catch (error) {
      console.error('Error creating election:', error);
      toast.error('Failed to create election');
    } finally {
      setIsLoading(false);
    }
  };

  const activeFaculty = facultyMembers.filter((f) => f.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Create New Election</DialogTitle>
          <DialogDescription>
            Set up a new election with positions and candidates from the faculty.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Election Title *</Label>
              <Input
                id="title"
                placeholder="e.g. PACFU Officers Election 2026-2028"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and details of this election"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Positions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPosition}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Position
                </Button>
              </div>

              {positions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No positions added yet. Click "Add Position" to get started.
                </p>
              ) : (
                <ScrollArea className="max-h-[400px] pr-4">
                  <div className="space-y-4">
                    {positions.map((position, index) => {
                      const availableCandidates = getAvailableCandidates(position.id);
                      const selectedInOtherPositions = getSelectedCandidateIds(position.id);
                      
                      return (
                        <div
                          key={position.id}
                          className="border rounded-lg p-4 space-y-4 bg-card"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Position Title *</Label>
                                <Input
                                  placeholder="e.g. President"
                                  value={position.title}
                                  onChange={(e) =>
                                    updatePosition(position.id, 'title', e.target.value)
                                  }
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Number of Winners *</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={position.numberOfWinners}
                                  onChange={(e) =>
                                    updatePosition(
                                      position.id,
                                      'numberOfWinners',
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  required
                                />
                              </div>
                            </div>
                            {positions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removePosition(position.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Select Candidates *</Label>
                            {activeFaculty.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No active faculty members available.
                              </p>
                            ) : (
                              <ScrollArea className="h-32 border rounded-md p-3">
                                <div className="space-y-2">
                                  {activeFaculty.map((faculty) => {
                                    const isSelected = position.candidateIds.includes(faculty.id);
                                    const isUnavailable = !isSelected && selectedInOtherPositions.includes(faculty.id);
                                    
                                    return (
                                      <label
                                        key={faculty.id}
                                        className={cn(
                                          "flex items-center gap-2 text-sm p-2 rounded",
                                          isUnavailable 
                                            ? "opacity-50 cursor-not-allowed" 
                                            : "cursor-pointer hover:bg-accent/50"
                                        )}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          disabled={isUnavailable}
                                          onCheckedChange={() =>
                                            toggleCandidate(position.id, faculty.id)
                                          }
                                        />
                                        <span className={isUnavailable ? "text-muted-foreground" : ""}>
                                          {faculty.name} ({faculty.department})
                                          {isUnavailable && (
                                            <span className="text-xs ml-1 text-muted-foreground">
                                              (selected in another position)
                                            </span>
                                          )}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </ScrollArea>
                            )}
                            {position.candidateIds.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {position.candidateIds.length} candidate(s) selected
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
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
              <Button type="submit" variant="accent" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Election'}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
