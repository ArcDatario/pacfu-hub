import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarIcon, FileText, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { FinancialRecord, financeService } from '@/services/financeService';

interface FinancialReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: FinancialRecord[];
}

type PresetPeriod = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export function FinancialReportDialog({
  open,
  onOpenChange,
  records,
}: FinancialReportDialogProps) {
  const [presetPeriod, setPresetPeriod] = useState<PresetPeriod>('this_month');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const handlePresetChange = (preset: PresetPeriod) => {
    setPresetPeriod(preset);
    const now = new Date();

    switch (preset) {
      case 'today':
        setStartDate(startOfDay(now));
        setEndDate(endOfDay(now));
        break;
      case 'this_week':
        setStartDate(startOfWeek(now, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(now, { weekStartsOn: 1 }));
        break;
      case 'this_month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case 'custom':
        // Keep current dates for custom
        break;
    }
  };

  const filteredRecords = useMemo(() => {
    const start = format(startDate, 'yyyy-MM-dd');
    const end = format(endDate, 'yyyy-MM-dd');
    
    return records.filter((record) => {
      return record.transaction_date >= start && record.transaction_date <= end;
    });
  }, [records, startDate, endDate]);

  const summary = useMemo(() => {
    return financeService.calculateSummary(filteredRecords);
  }, [filteredRecords]);

  const incomeByCategory = useMemo(() => {
    const result: Record<string, number> = {};
    filteredRecords
      .filter((r) => r.type === 'income')
      .forEach((r) => {
        const cat = r.category || 'Uncategorized';
        result[cat] = (result[cat] || 0) + Number(r.amount);
      });
    return Object.entries(result).sort((a, b) => b[1] - a[1]);
  }, [filteredRecords]);

  const expenseByCategory = useMemo(() => {
    const result: Record<string, number> = {};
    filteredRecords
      .filter((r) => r.type === 'expense')
      .forEach((r) => {
        const cat = r.category || 'Uncategorized';
        result[cat] = (result[cat] || 0) + Number(r.amount);
      });
    return Object.entries(result).sort((a, b) => b[1] - a[1]);
  }, [filteredRecords]);

  const handleExport = () => {
    const reportData = {
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
      },
      summary: {
        totalIncome: summary.totalIncome,
        totalExpenses: summary.totalExpenses,
        netBalance: summary.balance,
        transactionCount: summary.transactionCount,
      },
      incomeByCategory: Object.fromEntries(incomeByCategory),
      expenseByCategory: Object.fromEntries(expenseByCategory),
      transactions: filteredRecords.map((r) => ({
        date: r.transaction_date,
        type: r.type,
        description: r.description,
        category: r.category,
        amount: r.amount,
        reference: r.reference_number,
        recordedBy: r.recorded_by_name,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Financial Report
          </DialogTitle>
          <DialogDescription>
            Generate a financial summary for the selected period.
          </DialogDescription>
        </DialogHeader>

        {/* Period Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Report Period</Label>
            <Select
              value={presetPeriod}
              onValueChange={(v) => handlePresetChange(v as PresetPeriod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {presetPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => d && setStartDate(d)}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => d && setEndDate(d)}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Period Display */}
          <div className="text-sm text-muted-foreground">
            Showing data from{' '}
            <span className="font-medium text-foreground">
              {format(startDate, 'MMMM d, yyyy')}
            </span>{' '}
            to{' '}
            <span className="font-medium text-foreground">
              {format(endDate, 'MMMM d, yyyy')}
            </span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-2xl font-bold text-green-600">
              {financeService.formatCurrency(summary.totalIncome)}
            </p>
          </div>
          <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-4">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">
              {financeService.formatCurrency(summary.totalExpenses)}
            </p>
          </div>
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4">
            <p className="text-sm text-muted-foreground">Net Balance</p>
            <p
              className={cn(
                'text-2xl font-bold',
                summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'
              )}
            >
              {financeService.formatCurrency(summary.balance)}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          {/* Income by Category */}
          <div>
            <h4 className="font-medium mb-3 text-green-600">Income by Category</h4>
            {incomeByCategory.length > 0 ? (
              <div className="space-y-2">
                {incomeByCategory.map(([category, amount]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{category}</span>
                    <span className="font-medium">
                      {financeService.formatCurrency(amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No income recorded</p>
            )}
          </div>

          {/* Expenses by Category */}
          <div>
            <h4 className="font-medium mb-3 text-red-600">Expenses by Category</h4>
            {expenseByCategory.length > 0 ? (
              <div className="space-y-2">
                {expenseByCategory.map(([category, amount]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{category}</span>
                    <span className="font-medium">
                      {financeService.formatCurrency(amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No expenses recorded</p>
            )}
          </div>
        </div>

        {/* Transaction Count */}
        <div className="text-sm text-muted-foreground mt-4">
          Total transactions: <span className="font-medium">{summary.transactionCount}</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
