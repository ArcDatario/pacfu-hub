import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FacultyMember } from '@/types/faculty';

// Get all faculty members from Firestore
export const getAllFaculty = async (): Promise<FacultyMember[]> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'faculty'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        department: data.department || 'Not Assigned',
        position: data.position || 'Faculty',
        isActive: data.isActive,
        joinedDate: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        groups: data.groups || [],
      };
    });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    return [];
  }
};

// Subscribe to faculty changes
export const subscribeFaculty = (callback: (faculty: FacultyMember[]) => void) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'faculty'));
  
  return onSnapshot(q, (snapshot) => {
    const faculty = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        department: data.department || 'Not Assigned',
        position: data.position || 'Faculty',
        isActive: data.isActive,
        joinedDate: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        groups: data.groups || [],
      };
    });
    callback(faculty);
  });
};

// Toggle faculty active status
export const toggleFacultyActive = async (userId: string, currentStatus: boolean): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isActive: !currentStatus,
    });
    return true;
  } catch (error) {
    console.error('Error toggling faculty status:', error);
    return false;
  }
};

// Update faculty details
export const updateFacultyDetails = async (
  userId: string, 
  data: Partial<{ name: string; department: string; position: string; groups: string[] }>,
  oldFacultyData?: FacultyMember
): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // If groups are being updated, update chat participants
    if (data.groups && oldFacultyData) {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('type', '==', 'group'));
      const chatsSnapshot = await getDocs(q);
      
      for (const chatDoc of chatsSnapshot.docs) {
        const chatData = chatDoc.data();
        const isInOldGroups = oldFacultyData.groups.includes(chatData.name);
        const isInNewGroups = data.groups.includes(chatData.name);
        
        // Remove from old groups they're no longer assigned to
        if (isInOldGroups && !isInNewGroups) {
          const newParticipantNames = { ...chatData.participantNames };
          delete newParticipantNames[userId];
          
          await updateDoc(chatDoc.ref, {
            participants: arrayRemove(userId),
            participantNames: newParticipantNames,
          });
        }
        
        // Add to new groups they're now assigned to
        if (!isInOldGroups && isInNewGroups) {
          await updateDoc(chatDoc.ref, {
            participants: arrayUnion(userId),
            participantNames: {
              ...chatData.participantNames,
              [userId]: data.name || oldFacultyData.name,
            },
          });
        }
        
        // Update name in groups they're already in
        if (isInOldGroups && isInNewGroups && data.name && data.name !== oldFacultyData.name) {
          await updateDoc(chatDoc.ref, {
            participantNames: {
              ...chatData.participantNames,
              [userId]: data.name,
            },
          });
        }
      }
    }
    
    // Update the user document with all provided fields
    await updateDoc(userRef, data);
    return true;
  } catch (error) {
    console.error('Error updating faculty:', error);
    return false;
  }
};

// Delete faculty member
export const deleteFacultyMember = async (userId: string): Promise<boolean> => {
  try {
    // Remove faculty from all group chats first
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('type', '==', 'group'));
    const chatsSnapshot = await getDocs(q);
    
    for (const chatDoc of chatsSnapshot.docs) {
      const chatData = chatDoc.data();
      
      // Check if this faculty member is a participant
      if (chatData.participants && chatData.participants.includes(userId)) {
        const newParticipantNames = { ...chatData.participantNames };
        delete newParticipantNames[userId];
        
        await updateDoc(chatDoc.ref, {
          participants: arrayRemove(userId),
          participantNames: newParticipantNames,
        });
      }
    }
    
    // Delete the user document from Firestore
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    
    // Note: Firebase Auth user deletion requires admin SDK or Cloud Functions
    // For now, we're only deleting from Firestore
    // You may want to implement a Cloud Function to also delete from Auth
    
    return true;
  } catch (error) {
    console.error('Error deleting faculty member:', error);
    return false;
  }
};