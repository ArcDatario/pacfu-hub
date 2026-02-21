import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { Registration } from '@/types/registration';
import {
  subscribeRegistrations,
  approveRegistration,
  rejectRegistration,
} from '@/services/registrationService';
import { CreateAccountDialog } from '@/components/registrations/CreateAccountDialog';
import { toast } from 'sonner';
import { Check, X, UserPlus, Eye, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Registrations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showReceipt, setShowReceipt] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    const unsub = subscribeRegistrations(setRegistrations);
    return () => unsub();
  }, [user, navigate]);

  const handleApprove = async (reg: Registration) => {
    setLoadingId(reg.id);
    try {
      await approveRegistration(reg.id, user!.id);
      toast.success(`${reg.fullName}'s registration approved`);
    } catch {
      toast.error('Failed to approve');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (reg: Registration) => {
    setLoadingId(reg.id);
    try {
      await rejectRegistration(reg.id);
      toast.success(`${reg.fullName}'s registration rejected`);
    } catch {
      toast.error('Failed to reject');
    } finally {
      setLoadingId(null);
    }
  };

  const statusBadge = (status: Registration['status']) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      completed: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'} className="capitalize">{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Registrations</h1>
          <p className="text-muted-foreground">Manage membership registration applications</p>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No registration applications yet
                  </TableCell>
                </TableRow>
              ) : (
                registrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{reg.fullName}</p>
                        <p className="text-xs text-muted-foreground">{reg.address}</p>
                      </div>
                    </TableCell>
                    <TableCell>{reg.department}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{reg.purpose}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setShowReceipt(reg.receiptUrl)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                    <TableCell>{statusBadge(reg.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {reg.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {reg.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleApprove(reg)}
                              disabled={loadingId === reg.id}
                            >
                              {loadingId === reg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleReject(reg)}
                              disabled={loadingId === reg.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {reg.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="accent"
                            onClick={() => { setSelectedReg(reg); setShowCreateAccount(true); }}
                          >
                            <UserPlus className="h-4 w-4 mr-1" /> Create Account
                          </Button>
                        )}
                        {reg.status === 'completed' && (
                          <span className="text-xs text-muted-foreground">{reg.accountEmail}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateAccountDialog
        open={showCreateAccount}
        onOpenChange={setShowCreateAccount}
        registration={selectedReg}
      />

      {/* Receipt Preview */}
      <Dialog open={!!showReceipt} onOpenChange={() => setShowReceipt(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {showReceipt && (
            <img src={showReceipt} alt="Payment receipt" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
