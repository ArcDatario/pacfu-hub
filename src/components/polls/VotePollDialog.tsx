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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Poll } from '@/types/poll';
import { submitPollResponse } from '@/services/pollService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface VotePollDialogProps {
  poll: Poll | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoted?: () => void;
}

export function VotePollDialog({ poll, open, onOpenChange, onVoted }: VotePollDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedOptions([]);
    }
  }, [open, poll?.id]);

  const handleSingleSelect = (optionId: string) => {
    setSelectedOptions([optionId]);
  };

  const handleMultiSelect = (optionId: string, checked: boolean) => {
    if (checked) {
      setSelectedOptions([...selectedOptions, optionId]);
    } else {
      setSelectedOptions(selectedOptions.filter((id) => id !== optionId));
    }
  };

  const handleSubmit = async () => {
    if (!poll || !user?.id) return;

    if (selectedOptions.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one option',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPollResponse(poll.id, user.id, selectedOptions);
      toast({
        title: 'Success',
        description: 'Your vote has been recorded',
      });
      onVoted?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting vote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit vote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!poll) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{poll.title}</DialogTitle>
          <DialogDescription>
            {poll.description || 'Select your choice below'}
            {poll.allowMultiple && (
              <span className="block mt-1 text-primary">
                You can select multiple options
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {poll.allowMultiple ? (
            <div className="space-y-3">
              {poll.options.map((option) => (
                <div key={option.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={option.id}
                    checked={selectedOptions.includes(option.id)}
                    onCheckedChange={(checked) =>
                      handleMultiSelect(option.id, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={option.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <RadioGroup
              value={selectedOptions[0] || ''}
              onValueChange={handleSingleSelect}
              className="space-y-3"
            >
              {poll.options.map((option) => (
                <div key={option.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label
                    htmlFor={option.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedOptions.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Vote'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
