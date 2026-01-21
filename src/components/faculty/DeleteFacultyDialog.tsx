import { useState } from 'react';
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
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FacultyMember } from '@/types/faculty';

interface DeleteFacultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faculty: FacultyMember;
  onConfirm: () => void;
}

export function DeleteFacultyDialog({ 
  open, 
  onOpenChange, 
  faculty, 
  onConfirm 
}: DeleteFacultyDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    if (confirmationText.toLowerCase() !== 'delete') {
      return;
    }
    
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmationText('');
    onOpenChange(false);
  };

  const isConfirmDisabled = confirmationText.toLowerCase() !== 'delete' || isDeleting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Faculty Account</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the faculty account.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            Warning: Deleting {faculty.name}'s account will remove all their data, including:
            <ul className="list-disc list-inside mt-1 text-sm font-normal">
              <li>Account information</li>
              <li>Group assignments</li>
              <li>Chat history</li>
              <li>Any associated data</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To confirm deletion, please type <span className="font-mono text-destructive font-bold">"delete"</span> in the box below:
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type "delete" to confirm
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type 'delete' to confirm"
              className={confirmationText && confirmationText.toLowerCase() !== 'delete' ? 'border-destructive' : ''}
            />
            {confirmationText && confirmationText.toLowerCase() !== 'delete' && (
              <p className="text-sm text-destructive">
                You must type exactly "delete" to confirm
              </p>
            )}
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm font-medium mb-2">Account to be deleted:</p>
            <p className="text-sm">
              <span className="font-medium">Name:</span> {faculty.name}
            </p>
            <p className="text-sm">
              <span className="font-medium">Email:</span> {faculty.email}
            </p>
            <p className="text-sm">
              <span className="font-medium">Department:</span> {faculty.department}
            </p>
            <p className="text-sm">
              <span className="font-medium">Status:</span> {faculty.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isConfirmDisabled}
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}