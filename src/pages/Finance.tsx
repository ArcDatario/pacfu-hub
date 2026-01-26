import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Plus, 
  FileDown, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  MoreHorizontal,
  Edit,
  Trash2,
  Search
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { subscribeToFinancialRecords, formatCurrency } from '@/services/financeService';
import { FinancialRecord } from '@/types/finance';
import { AddRecordDialog } from '@/components/finance/AddRecordDialog';
import { EditRecordDialog } from '@/components/finance/EditRecordDialog';
import { DeleteRecordDialog } from '@/components/finance/DeleteRecordDialog';
import { GenerateReportDialog } from '@/components/finance/GenerateReportDialog';

export default function Finance() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only admins can access financial records.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate, toast]);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = subscribeToFinancialRecords(
      (fetchedRecords) => {
        setRecords(fetchedRecords);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching records:', error);
        toast({
          title: 'Error',
          description: 'Failed to load financial records.',
          variant: 'destructive',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, toast]);

  if (authLoading || !isAuthenticated || !isAdmin) {
    return null;
  }

  // Calculate totals
  const totalIncome = records
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = records
    .filter((r) => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Filter records
  const filteredRecords = records.filter((record) => {
    const matchesSearch = 
      record.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || record.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleEdit = (record: FinancialRecord) => {
    setSelectedRecord(record);
    setShowEditDialog(true);
  };

  const handleDelete = (record: FinancialRecord) => {
    setSelectedRecord(record);
    setShowDeleteDialog(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Financial Records
            </h1>
            <p className="text-muted-foreground">
              Manage income, expenses, and generate reports
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowReportDialog(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Record
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                {records.filter((r) => r.type === 'income').length} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpense)}
              </div>
              <p className="text-xs text-muted-foreground">
                {records.filter((r) => r.type === 'expense').length} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Current balance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={(value: 'all' | 'income' | 'expense') => setFilterType(value)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="income">Income Only</SelectItem>
              <SelectItem value="expense">Expenses Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Records Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading records...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No financial records found</p>
                <Button variant="link" onClick={() => setShowAddDialog(true)}>
                  Add your first record
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(record.transactionDate, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.type === 'income' ? 'default' : 'destructive'}>
                          {record.type === 'income' ? 'Income' : 'Expense'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {record.description}
                      </TableCell>
                      <TableCell>{record.category}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.referenceNumber || '-'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {record.type === 'income' ? '+' : '-'}{formatCurrency(record.amount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(record)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(record)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AddRecordDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <EditRecordDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog} 
        record={selectedRecord} 
      />
      <DeleteRecordDialog 
        open={showDeleteDialog} 
        onOpenChange={setShowDeleteDialog} 
        record={selectedRecord} 
      />
      <GenerateReportDialog open={showReportDialog} onOpenChange={setShowReportDialog} />
    </DashboardLayout>
  );
}
