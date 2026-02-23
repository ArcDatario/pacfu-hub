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
import { PasswordInput } from '@/components/ui/password-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { completeRegistration, sendCredentialsEmail } from '@/services/registrationService';
import { validatePassword, PASSWORD_REQUIREMENTS } from '@/lib/passwordValidation';
import { toast } from 'sonner';
import { Registration } from '@/types/registration';
import { Loader2 } from 'lucide-react';

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: Registration | null;
}

const departments = ['CAS', 'CASTech', 'CBEE', 'CFA', 'COECS', 'COED', 'CVM'];
const positions = [
  'Instructor I', 'Instructor II', 'Instructor III',
  'Assistant Professor I', 'Assistant Professor II', 'Assistant Professor III',
  'Associate Professor I', 'Associate Professor II', 'Associate Professor III',
  'Professor I', 'Professor II', 'Professor III', 'Professor IV',
];

export function CreateAccountDialog({ open, onOpenChange, registration }: CreateAccountDialogProps) {
  const { createFaculty } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    position: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  if (!registration) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.position) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const passwordCheck = validatePassword(formData.password);
    if (!passwordCheck.valid) {
      toast.error(passwordCheck.message);
      return;
    }

    setIsLoading(true);

    try {
      // Create the faculty account (same flow as existing)
      const result = await createFaculty(
        formData.email,
        formData.password,
        registration.fullName,
        registration.department,
        formData.position,
        []
      );

      if (!result.success) {
        toast.error(result.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // Mark registration as completed
      await completeRegistration(registration.id, formData.email);

      // Send credentials email
      try {
        await sendCredentialsEmail(formData.email, registration.fullName, formData.password);
        toast.success('Account created and credentials emailed successfully!');
      } catch (emailErr) {
        console.error('Email send failed:', emailErr);
        toast.success('Account created! But failed to send email. Please share credentials manually.', {
          description: `Email: ${formData.email}`,
        });
      }

      onOpenChange(false);
      setFormData({ email: '', password: '', confirmPassword: '', position: '' });
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
            <Label htmlFor="acc-email">Email Address *</Label>
            <Input
              id="acc-email"
              type="email"
              placeholder="user@psau.edu.ph"
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acc-password">Password *</Label>
              <PasswordInput
                id="acc-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-confirm">Confirm *</Label>
              <PasswordInput
                id="acc-confirm"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS}</p>

          <div className="space-y-2">
            <Label htmlFor="acc-position">Position *</Label>
            <Select
              value={formData.position}
              onValueChange={(v) => setFormData((p) => ({ ...p, position: v }))}
            >
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
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
