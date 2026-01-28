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
  // Handle migration from old 'department' field to new 'departments' array
  let departments: string[] | undefined;
  if (data.departments && Array.isArray(data.departments)) {
    departments = data.departments;
  } else if (data.department) {
    departments = [data.department];
  }
  
  return {
    id: doc.id,
    title: data.title || '',
    content: data.content || '',
    author: data.author || '',
    authorId: data.authorId || '',
    category: data.category || 'general',
    isPinned: data.isPinned || false,
    audience: data.audience === 'department' ? 'departments' : (data.audience || 'all'),
    departments,
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
    audience: data.audience,
    departments: data.departments || null,
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
  if (data.audience !== undefined) updateData.audience = data.audience;
  if (data.departments !== undefined) updateData.departments = data.departments;

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

// Get all faculty emails for notifications (optionally filter by departments)
export const getFacultyEmails = async (departments?: string[]): Promise<{ email: string; name: string }[]> => {
  console.log('Querying Firestore for faculty users...', departments?.length ? `Departments: ${departments.join(', ')}` : 'All departments');
  
  // Firestore doesn't support 'in' query with more than 30 values, so we need to handle this
  if (departments && departments.length > 0) {
    // For multiple departments, we need to fetch all active faculty and filter client-side
    // or use 'in' query if departments <= 30
    if (departments.length <= 30) {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'faculty'),
        where('isActive', '==', true),
        where('department', 'in', departments)
      );
      
      const snapshot = await getDocs(q);
      console.log('Found', snapshot.docs.length, 'faculty members in selected departments');
      
      return snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data() as { email: string; name: string; role: string; department?: string };
        console.log('Faculty member:', { email: data.email, name: data.name, department: data.department });
        return { email: data.email, name: data.name };
      });
    } else {
      // Fallback for more than 30 departments - fetch all and filter
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'faculty'),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const filtered = snapshot.docs
        .map(docSnapshot => {
          const data = docSnapshot.data() as { email: string; name: string; role: string; department?: string };
          return { ...data };
        })
        .filter(user => user.department && departments.includes(user.department));
      
      console.log('Found', filtered.length, 'faculty members in selected departments');
      return filtered.map(user => ({ email: user.email, name: user.name }));
    }
  } else {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'faculty'),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    console.log('Found', snapshot.docs.length, 'faculty members');
    
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data() as { email: string; name: string; role: string; department?: string };
      console.log('Faculty member:', { email: data.email, name: data.name, department: data.department });
      return { email: data.email, name: data.name };
    });
  }
};

// Get unique departments from faculty
export const getDepartments = async (): Promise<string[]> => {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'faculty'),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(q);
  const departments = new Set<string>();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.department) {
      departments.add(data.department);
    }
  });
  
  return Array.from(departments).sort();
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
    
    // Prepare request body
    const body = JSON.stringify({ recipients, announcement });
    const timestamp = Date.now();
    
    // Create headers - signature will be validated server-side if EMAIL_SIGNING_SECRET is configured
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'x-request-timestamp': timestamp.toString(),
    };
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-announcement-email`, {
      method: 'POST',
      headers,
      body,
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
