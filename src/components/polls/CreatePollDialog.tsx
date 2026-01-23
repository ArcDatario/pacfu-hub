import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, X, Loader2 } from 'lucide-react';
import { createPoll } from '@/services/pollService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const pollSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  allowMultiple: z.boolean(),
});

type PollFormData = z.infer<typeof pollSchema>;

interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePollDialog({ open, onOpenChange }: CreatePollDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [options, setOptions] = useState<string[]>(['', '']);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PollFormData>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      title: '',
      description: '',
      allowMultiple: false,
    },
  });

  const allowMultiple = watch('allowMultiple');

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const resetForm = () => {
    reset();
    setOptions(['', '']);
  };

  const onSubmit = async (data: PollFormData) => {
    // Validate options
    const validOptions = options.filter((opt) => opt.trim() !== '');
    if (validOptions.length < 2) {
      toast({
        title: 'Error',
        description: 'Please provide at least 2 options',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a poll',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const pollId = await createPoll(
        {
          title: data.title,
          description: data.description || '',
          options: validOptions,
          allowMultiple: data.allowMultiple,
        },
        user.id
      );

      if (pollId) {
        toast({
          title: 'Success',
          description: 'Poll created successfully',
        });
        resetForm();
        onOpenChange(false);
      } else {
        throw new Error('Failed to create poll');
      }
    } catch (error) {
      console.error('Error creating poll:', error);
      toast({
        title: 'Error',
        description: 'Failed to create poll. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Poll</DialogTitle>
          <DialogDescription>
            Create a poll for faculty members to vote on
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Poll Title *</Label>
            <Input
              id="title"
              placeholder="Enter poll title"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter poll description (optional)"
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Options *</Label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="allowMultiple">Allow Multiple Selections</Label>
              <p className="text-sm text-muted-foreground">
                Let users select more than one option
              </p>
            </div>
            <Switch
              id="allowMultiple"
              checked={allowMultiple}
              onCheckedChange={(checked) => setValue('allowMultiple', checked)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Poll'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
