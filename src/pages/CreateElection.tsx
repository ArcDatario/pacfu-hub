import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useFaculty } from '@/contexts/FacultyContext';
import { createElection } from '@/services/electionService';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export default function CreateElection() {
  const navigate = useNavigate();
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
  const positionsContainerRef = useRef<HTMLDivElement>(null);
  const positionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/elections');
    }
  }, [user, navigate]);

  // Auto-scroll and focus when a new position is added
  useEffect(() => {
    if (positions.length > 0) {
      const lastPosition = positions[positions.length - 1];
      const positionElement = positionRefs.current[lastPosition.id];
      const inputElement = inputRefs.current[lastPosition.id];

      if (positionElement) {
        // Scroll to the new position
        setTimeout(() => {
          positionElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          
          // Focus on the position title input
          if (inputElement) {
            setTimeout(() => {
              inputElement.focus();
            }, 300);
          }
        }, 100);
      }
    }
  }, [positions.length]);

  const addPosition = () => {
    const newId = `pos_${Date.now()}`;
    setPositions([
      ...positions,
      {
        id: newId,
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
    const activeFaculty = facultyMembers.filter((f) => f.isActive);
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
        navigate('/elections');
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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/elections')}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold text-foreground">Create New Election</h1>
            <p className="mt-1 text-muted-foreground">
              Set up a new election with positions and candidates from the faculty
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Basic Information</h2>
              
              <div className="space-y-2">
                <Label htmlFor="title">Election Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. PACFU Officers Election 2026-2028"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  className="max-w-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose and details of this election"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  required
                  className="max-w-2xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
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
            </div>

            {/* Positions */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Positions & Candidates</h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPosition}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Position
                </Button>
              </div>

              {positions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">
                    No positions added yet. Click "Add Position" to get started.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg bg-muted/30">
                  <ScrollArea className="h-[600px] w-full">
                    <div ref={positionsContainerRef} className="space-y-6 p-4">
                      {positions.map((position) => {
                        const availableCandidates = getAvailableCandidates(position.id);
                        const selectedInOtherPositions = getSelectedCandidateIds(position.id);
                        
                        return (
                          <Card 
                            key={position.id} 
                            ref={(el) => {
                              positionRefs.current[position.id] = el;
                            }}
                            className="p-6 space-y-6"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Position Title *</Label>
                                  <Input
                                    ref={(el) => {
                                      inputRefs.current[position.id] = el;
                                    }}
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
                                className="text-destructive hover:text-destructive flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-3">
                            <Label>Select Candidates *</Label>
                            {activeFaculty.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No active faculty members available.
                              </p>
                            ) : (
                              <Card className="border">
                                <ScrollArea className="h-64 p-4">
                                  <div className="space-y-2">
                                    {activeFaculty.map((faculty) => {
                                      const isSelected = position.candidateIds.includes(faculty.id);
                                      const isUnavailable = !isSelected && selectedInOtherPositions.includes(faculty.id);
                                      
                                      return (
                                        <label
                                          key={faculty.id}
                                          className={cn(
                                            "flex items-center gap-3 text-sm p-3 rounded-lg transition-colors",
                                            isUnavailable 
                                              ? "opacity-50 cursor-not-allowed bg-muted/50" 
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
                                          <div className="flex-1">
                                            <span className={cn(isUnavailable && "text-muted-foreground")}>
                                              {faculty.name}
                                            </span>
                                            <span className={cn("text-muted-foreground ml-2", isUnavailable && "opacity-75")}>
                                              ({faculty.department})
                                            </span>
                                            {isUnavailable && (
                                              <span className="text-xs ml-2 text-muted-foreground italic">
                                                - selected in another position
                                              </span>
                                            )}
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </ScrollArea>
                              </Card>
                            )}
                            {position.candidateIds.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {position.candidateIds.length} candidate(s) selected
                              </p>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/elections')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Election'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
