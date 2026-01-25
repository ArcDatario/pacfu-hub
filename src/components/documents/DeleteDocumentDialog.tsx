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
import { Document } from '@/types/document';
import { deleteDocument } from '@/services/documentService';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface DeleteDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
}

export function DeleteDocumentDialog({ open, onOpenChange, document }: DeleteDocumentDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!document) return;

    setLoading(true);

    try {
      await deleteDocument(document);

      toast({
        title: 'Success',
        description: `${document.type === 'folder' ? 'Folder' : 'File'} deleted successfully`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {document?.type === 'folder' ? 'Folder' : 'File'}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{document?.name}"?
            {document?.type === 'folder' && (
              <span className="block mt-2 text-destructive font-medium">
                This will also delete all files and folders inside it.
              </span>
            )}
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
