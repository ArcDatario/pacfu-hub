import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db, firebaseConfig } from '@/lib/firebase';
import { FacultyMember } from '@/types/faculty';
import { supabase } from '@/integrations/supabase/client';

// Get all faculty members from Firestore
export const getAllFaculty = async (): Promise<FacultyMember[]> => {
  try {
    const usersRef = collection(db, 'users');
    // Try with orderBy first, fallback to simple query if index doesn't exist
    let q = query(usersRef, where('role', '==', 'faculty'), orderBy('createdAt', 'desc'));
    let snapshot;
    
    try {
      snapshot = await getDocs(q);
    } catch (error: any) {
      // If error is about missing index, use simple query
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        console.warn('Composite index may not exist. Using simple query. Create index: users(role, createdAt)');
        q = query(usersRef, where('role', '==', 'faculty'));
        snapshot = await getDocs(q);
      } else {
        throw error;
      }
    }
    
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
        avatar: data.avatar || undefined,
      } as FacultyMember;
    });

    // Sort manually if orderBy wasn't used
    if (faculty.length > 0 && faculty[0].joinedDate) {
      return faculty.sort((a, b) => {
        const aDate = new Date(a.joinedDate).getTime();
        const bDate = new Date(b.joinedDate).getTime();
        return bDate - aDate; // Descending order
      });
    }

    return faculty;
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
        avatar: data.avatar || undefined,
      } as FacultyMember;
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
  data: Partial<{ name: string; email: string; department: string; position: string; groups: string[] }>,
  oldFacultyData?: FacultyMember,
  emailCredentials?: { newEmail: string; newPassword: string }
): Promise<{ success: boolean; newUserId?: string }> => {
  try {
    let newUserId: string | undefined;
    
    // If email is being changed with credentials, create new auth account and migrate data
    if (emailCredentials && data.email && oldFacultyData) {
      try {
        // Create a secondary Firebase app instance to create the new auth account
        const secondaryApp = initializeApp(firebaseConfig, 'email-update-' + Date.now());
        const secondaryAuth = getAuth(secondaryApp);
        
        // Create new auth account with new email
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          emailCredentials.newEmail, 
          emailCredentials.newPassword
        );
        
        newUserId = userCredential.user.uid;
        
        // Sign out from secondary auth and delete the secondary app
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);
        
        console.log('New auth account created for email:', emailCredentials.newEmail, 'with UID:', newUserId);
        
        // Get the old user document data
        const oldUserRef = doc(db, 'users', userId);
        const oldUserDoc = await getDoc(oldUserRef);
        
        if (oldUserDoc.exists()) {
          const oldUserData = oldUserDoc.data();
          
          // Create new user document with the new UID
          const newUserRef = doc(db, 'users', newUserId);
          await setDoc(newUserRef, {
            ...oldUserData,
            email: emailCredentials.newEmail,
            name: data.name || oldUserData.name,
            department: data.department || oldUserData.department,
            position: data.position || oldUserData.position,
            groups: data.groups || oldUserData.groups || [],
          });
          
          // Update all chat participants to use new UID
          const chatsRef = collection(db, 'chats');
          const chatsSnapshot = await getDocs(chatsRef);
          
          for (const chatDoc of chatsSnapshot.docs) {
            const chatData = chatDoc.data();
            
            // Check if old user is a participant
            if (chatData.participants && chatData.participants.includes(userId)) {
              // Replace old UID with new UID in participants array
              const newParticipants = chatData.participants.map((p: string) => 
                p === userId ? newUserId : p
              );
              
              // Update participant names and avatars
              const newParticipantNames = { ...chatData.participantNames };
              const newParticipantAvatars = { ...chatData.participantAvatars };
              
              if (newParticipantNames[userId]) {
                newParticipantNames[newUserId] = data.name || newParticipantNames[userId];
                delete newParticipantNames[userId];
              }
              
              if (newParticipantAvatars && newParticipantAvatars[userId]) {
                newParticipantAvatars[newUserId] = newParticipantAvatars[userId];
                delete newParticipantAvatars[userId];
              }
              
              await updateDoc(chatDoc.ref, {
                participants: newParticipants,
                participantNames: newParticipantNames,
                participantAvatars: newParticipantAvatars,
              });
            }
          }
          
          // Delete the old user document
          await deleteDoc(oldUserRef);
          
          // Delete the old Firebase Auth account via edge function
          try {
            const { data, error } = await supabase.functions.invoke('delete-firebase-user', {
              body: { uid: userId },
            });
            if (error) {
              console.error('Failed to delete old Firebase Auth account:', error);
            } else {
              console.log('Old Firebase Auth account deleted successfully for UID:', userId);
            }
          } catch (deleteAuthError) {
            console.error('Error calling delete-firebase-user:', deleteAuthError);
          }
          
          console.log('Successfully migrated user from', userId, 'to', newUserId);
        }
        
        return { success: true, newUserId };
      } catch (authError: any) {
        console.error('Error creating new auth account:', authError);
        if (authError.code === 'auth/email-already-in-use') {
          throw new Error('The email has been used already');
        }
        throw authError;
      }
    }
    
    // If no email change, just update the Firestore document
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
    
    // Update the user document with all provided fields (excluding email for non-email changes)
    const updateData = { ...data };
    delete updateData.email; // Email is only updated when creating new auth account
    await updateDoc(userRef, updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating faculty:', error);
    return { success: false };
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