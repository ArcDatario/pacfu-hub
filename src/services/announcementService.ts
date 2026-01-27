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
import { Announcement, CreateAnnouncementData, TargetAudience } from '@/types/announcement';

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
    targetAudience: data.targetAudience || { type: 'all' },
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
    targetAudience: data.targetAudience || { type: 'all' },
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

// Get faculty emails for notifications based on target audience
export const getFacultyEmails = async (
  targetAudience?: TargetAudience
): Promise<{ email: string; name: string; fcmToken?: string }[]> => {
  console.log('Querying Firestore for faculty users with target:', targetAudience);
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'faculty'),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(q);
  console.log('Found', snapshot.docs.length, 'active faculty members');
  
  let filteredDocs = snapshot.docs;
  
  // Filter based on target audience
  if (targetAudience && targetAudience.type !== 'all') {
    filteredDocs = snapshot.docs.filter(doc => {
      const data = doc.data();
      
      if (targetAudience.type === 'department' && targetAudience.departments?.length) {
        return targetAudience.departments.includes(data.department);
      }
      
      if (targetAudience.type === 'group' && targetAudience.groups?.length) {
        const userGroups = data.groups || [];
        return targetAudience.groups.some(g => userGroups.includes(g));
      }
      
      return true;
    });
  }
  
  console.log('After filtering:', filteredDocs.length, 'faculty members');
  
  const emails = filteredDocs.map(doc => {
    const data = doc.data();
    console.log('Faculty member:', { email: data.email, name: data.name, department: data.department });
    return {
      email: data.email,
      name: data.name,
      fcmToken: data.fcmToken,
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
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    console.log('Supabase URL:', supabaseUrl);
    
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

// Send push notifications via FCM
export const sendPushNotifications = async (
  recipients: { email: string; name: string; fcmToken?: string }[],
  notification: {
    title: string;
    body: string;
    category: string;
  }
): Promise<{ success: boolean; message: string }> => {
  try {
    // Filter recipients with FCM tokens
    const tokens = recipients
      .filter(r => r.fcmToken)
      .map(r => r.fcmToken as string);
    
    if (tokens.length === 0) {
      console.log('No FCM tokens found among recipients');
      return { success: true, message: 'No devices to notify' };
    }

    console.log('Sending push notifications to', tokens.length, 'devices');
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        tokens,
        title: notification.title,
        body: notification.body,
        data: { category: notification.category },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Push notification error:', errorText);
      throw new Error('Failed to send push notifications');
    }

    const result = await response.json();
    console.log('Push notification result:', result);
    
    return { 
      success: true, 
      message: `${result.successCount} push notification(s) sent` 
    };
  } catch (error: any) {
    console.error('Error sending push notifications:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to send push notifications' 
    };
  }
};
