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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Group, subscribeToGroups } from '@/services/groupService';

interface CreateFacultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const departments = [
  'College of Arts and Sciences',
  'College of Engineering',
  'College of Business',
  'College of Agriculture',
  'College of Education',
  'Graduate Studies',
  'Administration',
];

const positions = [
  'Instructor I',
  'Instructor II',
  'Instructor III',
  'Assistant Professor I',
  'Assistant Professor II',
  'Assistant Professor III',
  'Associate Professor I',
  'Associate Professor II',
  'Associate Professor III',
  'Professor I',
  'Professor II',
  'Professor III',
  'Professor IV',
];


export function CreateFacultyDialog({ open, onOpenChange }: CreateFacultyDialogProps) {
  const { createFaculty } = useAuth();
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    position: '',
    groups: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to groups from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToGroups((groups) => {
      setAvailableGroups(groups);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password || !formData.department || !formData.position) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await createFaculty(
        formData.email,
        formData.password,
        formData.name,
        formData.department,
        formData.position,
        formData.groups
      );

      if (result.success) {
        toast.success(`Faculty account created for ${formData.name}`, {
          description: 'Note: You may need to log in again as the admin.'
        });
        onOpenChange(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          department: '',
          position: '',
          groups: [],
        });
      } else {
        toast.error(result.error || 'Failed to create faculty account');
      }
    } catch (error) {
      toast.error('Failed to create faculty account');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGroup = (group: string) => {
    setFormData((prev) => ({
      ...prev,
      groups: prev.groups.includes(group)
        ? prev.groups.filter((g) => g !== group)
        : [...prev.groups, group],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Add New Faculty</DialogTitle>
          <DialogDescription>
            Create a new faculty account. They will receive login credentials via email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Dr. John Doe"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@psau.edu.ph"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Select
              value={formData.department}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position *</Label>
            <Select
              value={formData.position}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, position: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assign to Groups (Optional)</Label>
            {availableGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No groups available. Create groups in the Faculty Management page first.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {availableGroups.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={formData.groups.includes(group.name)}
                      onCheckedChange={() => toggleGroup(group.name)}
                    />
                    <span className="truncate" title={group.name}>{group.name}</span>
                  </label>
                ))}
              </div>
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
              {isLoading ? 'Creating...' : 'Create Faculty'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
