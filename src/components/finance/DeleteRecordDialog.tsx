import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { deleteFinancialRecord, formatCurrency } from '@/services/financeService';
import { logFinanceAction } from '@/services/logService';
import { FinancialRecord } from '@/types/finance';

interface DeleteRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: FinancialRecord | null;
}

export function DeleteRecordDialog({ open, onOpenChange, record }: DeleteRecordDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!record) return;

    setLoading(true);
    try {
      await deleteFinancialRecord(record.id);
      
      // Log the action
      if (user) {
        await logFinanceAction(
          'record_deleted',
          record.description,
          record.amount,
          user.id,
          user.name,
          { category: record.category }
        );
      }

      toast({
        title: 'Success',
        description: 'Record deleted successfully.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete record. Please try again.',
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
          <AlertDialogTitle>Delete Financial Record</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this record?
            <br />
            <br />
            <strong>{record?.description}</strong>
            <br />
            Amount: {record ? formatCurrency(record.amount) : ''}
            <br />
            <br />
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
