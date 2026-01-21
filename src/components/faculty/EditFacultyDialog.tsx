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
import { FacultyMember } from '@/types/faculty';
import { Group, subscribeToGroups } from '@/services/groupService';

interface EditFacultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faculty: FacultyMember;
}

export function EditFacultyDialog({ open, onOpenChange, faculty }: EditFacultyDialogProps) {
  const { updateFacultyDetails } = useFaculty();
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [formData, setFormData] = useState({
    name: faculty.name,
    email: faculty.email,
    department: faculty.department,
    position: faculty.position,
    groups: faculty.groups,
  });
  const [loading, setLoading] = useState(false);

  // Subscribe to groups from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToGroups((groups) => {
      setAvailableGroups(groups);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (faculty) {
      setFormData({
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        position: faculty.position,
        groups: faculty.groups,
      });
    }
  }, [faculty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        name: formData.name,
        department: formData.department,
        groups: formData.groups,
        position: formData.position,
      };

      const success = await updateFacultyDetails(faculty.id, updateData, faculty);
      
      if (success) {
        toast.success('Faculty details updated successfully');
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

  const departments = [
    'Computer Science',
    'Information Technology',
    'Engineering',
    'Business Administration',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Not Assigned'
  ];

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
                disabled
              />
            </div>
          </div>

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
              <Input
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="e.g., Professor, Lecturer"
              />
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