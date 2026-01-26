import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getRecordsByDateRange } from '@/services/financeService';

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateReportDialog({ open, onOpenChange }: GenerateReportDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Custom function to format numbers with commas only
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const generatePDF = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Error',
        description: 'Please select both start and end dates.',
        variant: 'destructive',
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: 'Error',
        description: 'Start date must be before end date.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Adjust end date to end of day
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);

      const records = await getRecordsByDateRange(startDate, adjustedEndDate);

      if (records.length === 0) {
        toast({
          title: 'No Records',
          description: 'No financial records found for the selected date range.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Calculate totals
      const totalIncome = records
        .filter((r) => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);
      const totalExpense = records
        .filter((r) => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);
      const netBalance = totalIncome - totalExpense;

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('PACFU Financial Report', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('PSAU Portal', pageWidth / 2, 28, { align: 'center' });

      // Date Range
      doc.setFontSize(11);
      doc.text(
        `Period: ${format(startDate, 'MMMM d, yyyy')} - ${format(endDate, 'MMMM d, yyyy')}`,
        pageWidth / 2,
        38,
        { align: 'center' }
      );

      doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth / 2, 45, {
        align: 'center',
      });

      // Summary Box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(14, 52, pageWidth - 28, 30, 3, 3, 'FD');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      // Summary columns
      const summaryY = 62;
      doc.setTextColor(34, 139, 34); // Green for income
      doc.text('Total Income:', 20, summaryY);
      doc.text(formatAmount(totalIncome), 20, summaryY + 8);

      doc.setTextColor(220, 53, 69); // Red for expense
      doc.text('Total Expenses:', pageWidth / 2 - 20, summaryY);
      doc.text(formatAmount(totalExpense), pageWidth / 2 - 20, summaryY + 8);

      doc.setTextColor(netBalance >= 0 ? 34 : 220, netBalance >= 0 ? 139 : 53, netBalance >= 0 ? 34 : 69);
      doc.text('Net Balance:', pageWidth - 60, summaryY);
      doc.text(formatAmount(netBalance), pageWidth - 60, summaryY + 8);

      doc.setTextColor(0, 0, 0);

      // Income Table
      const incomeRecords = records.filter((r) => r.type === 'income');
      let currentY = 95;
      
      if (incomeRecords.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('INCOME / FUNDS', 14, currentY);
        currentY += 10;

        autoTable(doc, {
          startY: currentY,
          head: [['Date', 'Description', 'Category', 'Reference', 'Amount']],
          body: incomeRecords.map((r) => [
            format(r.transactionDate, 'MM/dd/yyyy'),
            r.description,
            r.category,
            r.referenceNumber || '-',
            formatAmount(r.amount),
          ]),
          foot: [['', '', '', 'Total:', formatAmount(totalIncome)]],
          headStyles: { 
            fillColor: [34, 139, 34],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
          },
          footStyles: { 
            fillColor: [240, 240, 240], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold',
            halign: 'right'
          },
          styles: { 
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          columnStyles: {
            0: { cellWidth: 25, halign: 'center' }, // Date
            1: { cellWidth: 55, halign: 'left' },   // Description
            2: { cellWidth: 30, halign: 'center' }, // Category
            3: { cellWidth: 28, halign: 'center' }, // Reference
            4: { cellWidth: 35, halign: 'right' },  // Amount
          },
          margin: { left: 14, right: 14 },
          theme: 'grid',
        });
      }

      // Expense Table
      const expenseRecords = records.filter((r) => r.type === 'expense');
      if (expenseRecords.length > 0) {
        const lastTable = (doc as any).lastAutoTable;
        currentY = lastTable ? lastTable.finalY + 20 : currentY + 20;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('EXPENSES', 14, currentY);
        currentY += 10;

        autoTable(doc, {
          startY: currentY,
          head: [['Date', 'Description', 'Category', 'Reference', 'Amount']],
          body: expenseRecords.map((r) => [
            format(r.transactionDate, 'MM/dd/yyyy'),
            r.description,
            r.category,
            r.referenceNumber || '-',
            formatAmount(r.amount),
          ]),
          foot: [['', '', '', 'Total:', formatAmount(totalExpense)]],
          headStyles: { 
            fillColor: [220, 53, 69],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
          },
          footStyles: { 
            fillColor: [240, 240, 240], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold',
            halign: 'right'
          },
          styles: { 
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          columnStyles: {
            0: { cellWidth: 25, halign: 'center' }, // Date
            1: { cellWidth: 55, halign: 'left' },   // Description
            2: { cellWidth: 30, halign: 'center' }, // Category
            3: { cellWidth: 28, halign: 'center' }, // Reference
            4: { cellWidth: 35, halign: 'right' },  // Amount
          },
          margin: { left: 14, right: 14 },
          theme: 'grid',
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `PACFU_Financial_Report_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}.pdf`;
      doc.save(fileName);

      toast({
        title: 'Success',
        description: 'PDF report generated successfully.',
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Generate Financial Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : <span>Select start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
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
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : <span>Select end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={generatePDF} disabled={loading || !startDate || !endDate}>
            {loading ? 'Generating...' : 'Generate PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}