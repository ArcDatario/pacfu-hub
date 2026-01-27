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
  console.log('Querying Firestore for faculty users...');
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'faculty'),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(q);
  console.log('Found', snapshot.docs.length, 'faculty members');
  
  const emails = snapshot.docs.map(doc => {
    const data = doc.data();
    console.log('Faculty member:', { email: data.email, name: data.name, role: data.role });
    return {
      email: data.email,
      name: data.name,
    };
  });
  
  return emails;
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
    console.log('sendAnnouncementNotification called with', recipients.length, 'recipients');
    
    // Use hardcoded URL since env variable may not load properly
    const supabaseUrl = 'https://pdyywievbtdhtxylylln.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeXl3aWV2YnRkaHR4eWx5bGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTgzMDQsImV4cCI6MjA4NDg3NDMwNH0.cfxky3c4CCd0NqLKdSBVaK5JdVJRZbUjl2pvntsncTA';
    
    console.log('Making request to edge function...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-announcement-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ recipients, announcement }),
    });

    console.log('Edge function response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function error response:', errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch (e) {
        error = { message: errorText };
      }
      throw new Error(error.error || error.message || 'Failed to send emails');
    }

    const result = await response.json();
    console.log('Edge function success response:', result);
    
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
