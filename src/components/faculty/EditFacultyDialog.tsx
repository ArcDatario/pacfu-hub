import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useFaculty } from '@/contexts/FacultyContext';
import { useAuth } from '@/contexts/AuthContext';
import { logFacultyAction } from '@/services/logService';
import { FacultyMember } from '@/types/faculty';
import { Group, subscribeToGroups } from '@/services/groupService';

interface EditFacultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faculty: FacultyMember;
}

// Use the same departments list as CreateFacultyDialog
const departments = [
  'CAS',
  'CASTech',
  'CBEE',
  'CFA',
  'COECS',
  'COED',
  'CVM',
];


// Use the same positions list as CreateFacultyDialog
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

export function EditFacultyDialog({ open, onOpenChange, faculty }: EditFacultyDialogProps) {
  const { user } = useAuth();
  const { updateFacultyDetails } = useFaculty();
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [formData, setFormData] = useState({
    name: faculty.name,
    email: faculty.email,
    department: faculty.department,
    position: faculty.position,
    groups: faculty.groups,
  });
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const emailChanged = formData.email !== faculty.email;

  // Subscribe to groups from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToGroups((groups) => {
      setAvailableGroups(groups);
    });
    return () => unsubscribe();
  }, []);

  // Update form data when faculty prop changes or dialog opens
  useEffect(() => {
    if (faculty && open) {
      setFormData({
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        position: faculty.position,
        groups: faculty.groups || [],
      });
      setNewPassword('');
    }
  }, [faculty, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password if email changed
    if (emailChanged && newPassword.length < 6) {
      toast.error('Please enter a password with at least 6 characters for the new email account');
      return;
    }
    
    setLoading(true);

    try {
      const updateData: {
        name: string;
        department: string;
        position: string;
        groups: string[];
        email?: string;
      } = {
        name: formData.name,
        department: formData.department,
        position: formData.position,
        groups: formData.groups,
      };

      // Include email in update if changed
      if (emailChanged) {
        updateData.email = formData.email;
      }

      const success = await updateFacultyDetails(
        faculty.id, 
        updateData, 
        faculty,
        emailChanged ? { newEmail: formData.email, newPassword } : undefined
      );
      
      if (success) {
        // Log the action
        if (user) {
          const updatedFields = Object.keys(updateData);
          await logFacultyAction('updated', faculty.name, user.id, user.name, {
            updatedFields,
            emailChanged,
          });
        }
        
        toast.success('Faculty details updated successfully');
        if (emailChanged) {
          toast.success(`New login credentials created: ${formData.email}`);
        }
        onOpenChange(false);
      } else {
        toast.error('Failed to update faculty details');
      }
    } catch (error) {
      console.error('Error updating faculty:', error);
      toast.error('An error occurred while updating faculty details');
    } finally {
      setLoading(false);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Faculty Details</DialogTitle>
          <DialogDescription>
            Update the details for {faculty.name}. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {emailChanged && (
            <div className="space-y-2 p-3 bg-accent/50 border border-border rounded-md">
              <Label htmlFor="newPassword" className="text-foreground">
                New Password (required for new email)
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password for new account"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                A new login account will be created with this email and password. The faculty member should use these new credentials to log in.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select 
                value={formData.department} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="groups">
              Assign to Groups (Optional)
            </Label>
            {availableGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No groups available. Create groups in the Faculty Management page first.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
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
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}