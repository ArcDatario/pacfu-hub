import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Users,
  X,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Group, 
  subscribeToGroups, 
  createGroup, 
  updateGroup, 
  deleteGroup,
  initializeDefaultGroups
} from '@/services/groupService';
import { toast } from 'sonner';

export function GroupManagement() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', avatar: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize default groups if none exist
    initializeDefaultGroups();
    
    // Subscribe to groups
    const unsubscribe = subscribeToGroups((fetchedGroups) => {
      setGroups(fetchedGroups);
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setIsLoading(true);
    const result = await createGroup(formData.name.trim(), formData.description.trim(), avatarPreview || undefined);
    setIsLoading(false);

    if (result) {
      toast.success(`Group "${formData.name}" created`);
      setShowAddDialog(false);
      setFormData({ name: '', description: '', avatar: '' });
      setAvatarPreview('');
      setAvatarFile(null);
    } else {
      toast.error('Failed to create group');
    }
  };

  const handleEdit = async () => {
    if (!editingGroup || !formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setIsLoading(true);
    const result = await updateGroup(editingGroup.id, formData.name.trim(), formData.description.trim(), avatarPreview || undefined);
    setIsLoading(false);

    if (result) {
      toast.success(`Group "${formData.name}" updated`);
      setEditingGroup(null);
      setFormData({ name: '', description: '', avatar: '' });
      setAvatarPreview('');
      setAvatarFile(null);
    } else {
      toast.error('Failed to update group');
    }
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;

    setIsLoading(true);
    const result = await deleteGroup(deletingGroup.id);
    setIsLoading(false);

    if (result) {
      toast.success(`Group "${deletingGroup.name}" deleted`);
      setDeletingGroup(null);
    } else {
      toast.error('Failed to delete group');
    }
  };

  const openEditDialog = (group: Group) => {
    setFormData({ name: group.name, description: group.description, avatar: group.avatar || '' });
    setAvatarPreview(group.avatar || '');
    setAvatarFile(null);
    setEditingGroup(group);
  };

  return (
    <div className="rounded-xl bg-card shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-card-foreground">Group Management</h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1"
          onClick={() => {
            setFormData({ name: '', description: '', avatar: '' });
            setAvatarPreview('');
            setAvatarFile(null);
            setShowAddDialog(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Group
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Manage groups that faculty members can be assigned to
      </p>

      <div className="space-y-2">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No groups yet. Add your first group!
          </p>
        ) : (
          groups.map((group) => (
            <div 
              key={group.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center border">
                  {group.avatar ? (
                    <img src={group.avatar} alt={group.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {group.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-card-foreground truncate">{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-muted-foreground truncate">{group.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => openEditDialog(group)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeletingGroup(group)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Group</DialogTitle>
            <DialogDescription>
              Create a new group for faculty assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                placeholder="e.g. Research Committee"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Group Avatar (Optional)</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center border">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <input
                    ref={addFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (!file) return;
                      if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
                      if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return; }
                      setAvatarFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  <Button type="button" variant="secondary" className="gap-2" onClick={() => addFileInputRef.current?.click()}>
                    <Camera className="h-4 w-4" />
                    Choose Image
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="accent" onClick={handleAdd} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update group details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editGroupName">Group Name *</Label>
              <Input
                id="editGroupName"
                placeholder="e.g. Research Committee"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Group Avatar (Optional)</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center border">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (!file) return;
                      if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
                      if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return; }
                      setAvatarFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  <Button type="button" variant="secondary" className="gap-2" onClick={() => editFileInputRef.current?.click()}>
                    <Camera className="h-4 w-4" />
                    Choose Image
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="accent" onClick={handleEdit} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingGroup} onOpenChange={(open) => !open && setDeletingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGroup?.name}"? This action cannot be undone.
              Faculty members assigned to this group will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
