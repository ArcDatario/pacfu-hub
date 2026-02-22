import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  await addDoc(collection(db, 'registrations'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
};

// Subscribe to all registrations (admin)
export const subscribeRegistrations = (callback: (registrations: Registration[]) => void) => {
  const q = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const registrations = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        fullName: d.fullName,
        email: d.email || '',
        phone: d.phone || '',
        department: d.department,
        address: d.address,
        purpose: d.purpose,
        receiptUrl: d.receiptUrl,
        status: d.status,
        createdAt: d.createdAt?.toDate() || new Date(),
        approvedAt: d.approvedAt?.toDate(),
        approvedBy: d.approvedBy,
        accountEmail: d.accountEmail,
      } as Registration;
    });
    callback(registrations);
  }, (error) => {
    console.error('Error subscribing to registrations:', error);
    // Fallback without orderBy if index missing
    const fallbackQ = query(collection(db, 'registrations'));
    onSnapshot(fallbackQ, (snap) => {
      const regs = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
        fullName: d.fullName,
        email: d.email || '',
        phone: d.phone || '',
        department: d.department,
        address: d.address,
        purpose: d.purpose,
        receiptUrl: d.receiptUrl,
        status: d.status,
        createdAt: d.createdAt?.toDate() || new Date(),
        approvedAt: d.approvedAt?.toDate(),
        approvedBy: d.approvedBy,
        accountEmail: d.accountEmail,
      } as Registration;
      });
      regs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(regs);
    });
  });
};

// Approve registration
export const approveRegistration = async (id: string, adminId: string): Promise<void> => {
  await updateDoc(doc(db, 'registrations', id), {
    status: 'approved',
    approvedAt: serverTimestamp(),
    approvedBy: adminId,
  });
};

// Reject registration
export const rejectRegistration = async (id: string): Promise<void> => {
  await updateDoc(doc(db, 'registrations', id), {
    status: 'rejected',
  });
};

// Mark registration as completed with account email
export const completeRegistration = async (id: string, email: string): Promise<void> => {
  await updateDoc(doc(db, 'registrations', id), {
    status: 'completed',
    accountEmail: email,
  });
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
