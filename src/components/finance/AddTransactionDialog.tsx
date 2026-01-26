import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Minus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { financeService, CreateFinancialRecordInput } from '@/services/financeService';
import { useAuth } from '@/contexts/AuthContext';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const INCOME_CATEGORIES = [
  'Membership Fees',
  'Donations',
  'Event Revenue',
  'Grants',
  'Other Income',
];

const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Event Expenses',
  'Travel',
  'Equipment',
  'Utilities',
  'Professional Services',
  'Other Expenses',
];

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddTransactionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const resetForm = () => {
    setType('income');
    setAmount('');
    setDescription('');
    setCategory('');
    setReferenceNumber('');
    setDate(new Date());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add transactions.',
        variant: 'destructive',
      });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount.',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please enter a description for this transaction.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateFinancialRecordInput = {
        type,
        amount: parsedAmount,
        description: description.trim(),
        category: category || undefined,
        reference_number: referenceNumber.trim() || undefined,
        recorded_by: user.id,
        recorded_by_name: user.name || user.email,
        transaction_date: format(date, 'yyyy-MM-dd'),
      };

      await financeService.createRecord(input);

      toast({
        title: 'Transaction Added',
        description: `${type === 'income' ? 'Income' : 'Expense'} of ${financeService.formatCurrency(parsedAmount)} recorded successfully.`,
      });

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to add transaction. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new income or expense transaction.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'outline'}
              className={cn(
                'flex-1',
                type === 'income' && 'bg-green-600 hover:bg-green-700'
              )}
              onClick={() => {
                setType('income');
                setCategory('');
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Income
            </Button>
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              className={cn(
                'flex-1',
                type === 'expense' && 'bg-red-600 hover:bg-red-700'
              )}
              onClick={() => {
                setType('expense');
                setCategory('');
              }}
            >
              <Minus className="mr-2 h-4 w-4" />
              Expense
            </Button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (PHP)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter transaction description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference Number (Optional)</Label>
            <Input
              id="reference"
              placeholder="e.g., Receipt #, Invoice #"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          {/* Transaction Date */}
          <div className="space-y-2">
            <Label>Transaction Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
