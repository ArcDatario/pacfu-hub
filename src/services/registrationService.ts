import { supabase } from '@/integrations/supabase/client';
import { Registration } from '@/types/registration';

// Upload receipt to Supabase storage
export const uploadReceipt = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `receipts/${fileName}`;

  const { error } = await supabase.storage
    .from('registrations')
    .upload(filePath, file);

  if (error) throw new Error('Failed to upload receipt: ' + error.message);

  const { data: urlData } = supabase.storage
    .from('registrations')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
};

// Submit a new registration
export const submitRegistration = async (data: {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  address: string;
  purpose: string;
  receiptUrl: string;
}): Promise<void> => {
  const { error } = await supabase.from('registrations').insert({
    full_name: data.fullName,
    email: data.email,
    phone: data.phone,
    department: data.department,
    address: data.address,
    purpose: data.purpose,
    receipt_url: data.receiptUrl,
    status: 'pending',
  });

  if (error) throw new Error('Failed to submit registration: ' + error.message);
};

// Subscribe to all registrations (admin) using polling
export const subscribeRegistrations = (callback: (registrations: Registration[]) => void) => {
  const fetchRegistrations = async () => {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching registrations:', error);
      return;
    }

    const registrations: Registration[] = (data || []).map((r: any) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email || '',
      phone: r.phone || '',
      department: r.department,
      address: r.address,
      purpose: r.purpose,
      receiptUrl: r.receipt_url,
      status: r.status,
      createdAt: new Date(r.created_at),
      approvedAt: r.approved_at ? new Date(r.approved_at) : undefined,
      approvedBy: r.approved_by,
      accountEmail: r.account_email,
    }));

    callback(registrations);
  };

  // Initial fetch
  fetchRegistrations();

  // Poll every 5 seconds
  const interval = setInterval(fetchRegistrations, 5000);

  // Return unsubscribe function
  return () => clearInterval(interval);
};

// Approve registration
export const approveRegistration = async (id: string, adminId: string): Promise<void> => {
  const { error } = await supabase.from('registrations').update({
    status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: adminId,
  }).eq('id', id);

  if (error) throw new Error('Failed to approve registration: ' + error.message);
};

// Reject registration
export const rejectRegistration = async (id: string): Promise<void> => {
  const { error } = await supabase.from('registrations').update({
    status: 'rejected',
  }).eq('id', id);

  if (error) throw new Error('Failed to reject registration: ' + error.message);
};

// Mark registration as completed with account email
export const completeRegistration = async (id: string, email: string): Promise<void> => {
  const { error } = await supabase.from('registrations').update({
    status: 'completed',
    account_email: email,
  }).eq('id', id);

  if (error) throw new Error('Failed to complete registration: ' + error.message);
};

// Send credentials email via edge function
export const sendCredentialsEmail = async (
  recipientEmail: string,
  recipientName: string,
  password: string
): Promise<void> => {
  const { error } = await supabase.functions.invoke('send-credentials-email', {
    body: {
      email: recipientEmail,
      name: recipientName,
      password: password,
    },
  });

  if (error) throw new Error('Failed to send credentials email: ' + error.message);
};
