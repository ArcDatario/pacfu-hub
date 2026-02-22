import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { completeRegistration, sendCredentialsEmail } from '@/services/registrationService';
import { toast } from 'sonner';
import { Registration } from '@/types/registration';
import { Loader2, RefreshCw } from 'lucide-react';

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: Registration | null;
}

const positions = [
  'Instructor I', 'Instructor II', 'Instructor III',
  'Assistant Professor I', 'Assistant Professor II', 'Assistant Professor III',
  'Associate Professor I', 'Associate Professor II', 'Associate Professor III',
  'Professor I', 'Professor II', 'Professor III', 'Professor IV',
];

const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export function CreateAccountDialog({ open, onOpenChange, registration }: CreateAccountDialogProps) {
  const { createFaculty } = useAuth();
  const [password, setPassword] = useState(generatePassword());
  const [position, setPosition] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!registration) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!position) {
      toast.error('Please select a position');
      return;
    }

    setIsLoading(true);

    try {
      const result = await createFaculty(
        registration.email,
        password,
        registration.fullName,
        registration.department,
        position,
        []
      );

      if (!result.success) {
        toast.error(result.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      await completeRegistration(registration.id, registration.email);

      try {
        await sendCredentialsEmail(registration.email, registration.fullName, password);
        toast.success('Account created and credentials emailed successfully!');
      } catch (emailErr) {
        console.error('Email send failed:', emailErr);
        toast.success('Account created! But failed to send email. Please share credentials manually.', {
          description: `Email: ${registration.email}`,
        });
      }

      onOpenChange(false);
      setPassword(generatePassword());
      setPosition('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Create Account</DialogTitle>
          <DialogDescription>
            Create a faculty account for <strong>{registration.fullName}</strong> ({registration.department}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input value={registration.email} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Auto-Generated Password</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPassword(generatePassword())}>
                <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
              </Button>
            </div>
            <Input value={password} readOnly className="font-mono bg-muted" />
            <p className="text-xs text-muted-foreground">This password will be emailed to the user.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acc-position">Position *</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : 'Create & Send Credentials'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
