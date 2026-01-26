import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Announcement, CreateAnnouncementData } from '@/types/announcement';

const COLLECTION_NAME = 'announcements';

// Convert Firestore document to Announcement
const convertDoc = (doc: any): Announcement => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || '',
    content: data.content || '',
    author: data.author || '',
    authorId: data.authorId || '',
    category: data.category || 'general',
    isPinned: data.isPinned || false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
};

// Subscribe to announcements in real-time
export const subscribeToAnnouncements = (
  callback: (announcements: Announcement[]) => void
) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map(convertDoc);
    callback(announcements);
  });
};

// Create a new announcement
export const createAnnouncement = async (
  data: CreateAnnouncementData,
  authorId: string,
  authorName: string
): Promise<string> => {
  const docData: any = {
    title: data.title,
    content: data.content,
    category: data.category,
    isPinned: data.isPinned,
    author: authorName,
    authorId: authorId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
  return docRef.id;
};

// Update an announcement
export const updateAnnouncement = async (
  id: string,
  data: Partial<CreateAnnouncementData>
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  
  const updateData: any = {
    updatedAt: serverTimestamp(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;

  await updateDoc(docRef, updateData);
};

// Delete an announcement
export const deleteAnnouncement = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};

// Toggle pin status
export const toggleAnnouncementPin = async (id: string, isPinned: boolean): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    isPinned: !isPinned,
    updatedAt: serverTimestamp(),
  });
};

// Get all faculty emails for notifications
export const getFacultyEmails = async (): Promise<{ email: string; name: string }[]> => {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'faculty'),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    email: doc.data().email,
    name: doc.data().name,
  }));
};

// Send announcement notification emails
export const sendAnnouncementNotification = async (
  recipients: { email: string; name: string }[],
  announcement: {
    title: string;
    content: string;
    category: string;
    author: string;
  }
): Promise<{ success: boolean; message: string }> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    // Get the current Supabase session for authentication
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData?.session?.access_token) {
      throw new Error('No active session - please log in again');
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-announcement-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ recipients, announcement }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to send emails');
    }

    const result = await response.json();
    return { 
      success: true, 
      message: `${result.successCount} email(s) sent successfully` 
    };
  } catch (error: any) {
    console.error('Error sending announcement notifications:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to send notifications' 
    };
  }
};
