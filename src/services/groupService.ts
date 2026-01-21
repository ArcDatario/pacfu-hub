import { 
  collection, 
  query, 
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  deleteDoc,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Group {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
}

// Subscribe to all groups (real-time)
export const subscribeToGroups = (callback: (groups: Group[]) => void): Unsubscribe => {
  const groupsRef = collection(db, 'groups');
  
  return onSnapshot(groupsRef, (snapshot) => {
    const groups = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description || '',
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Group;
    });
    
    // Sort by name
    const sortedGroups = groups.sort((a, b) => a.name.localeCompare(b.name));
    callback(sortedGroups);
  }, (error) => {
    console.error('Error subscribing to groups:', error);
    callback([]);
  });
};

// Get all groups (one-time fetch)
export const getAllGroups = async (): Promise<Group[]> => {
  try {
    const groupsRef = collection(db, 'groups');
    const snapshot = await getDocs(groupsRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description || '',
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
};

// Create a new group
export const createGroup = async (name: string, description: string = ''): Promise<string | null> => {
  try {
    const groupsRef = collection(db, 'groups');
    const newGroup = await addDoc(groupsRef, {
      name,
      description,
      createdAt: serverTimestamp(),
    });
    return newGroup.id;
  } catch (error) {
    console.error('Error creating group:', error);
    return null;
  }
};

// Update a group
export const updateGroup = async (groupId: string, name: string, description: string = ''): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'groups', groupId), {
      name,
      description,
    });
    return true;
  } catch (error) {
    console.error('Error updating group:', error);
    return false;
  }
};

// Delete a group
export const deleteGroup = async (groupId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'groups', groupId));
    return true;
  } catch (error) {
    console.error('Error deleting group:', error);
    return false;
  }
};

// Initialize default groups if none exist
export const initializeDefaultGroups = async (): Promise<void> => {
  try {
    const groupsRef = collection(db, 'groups');
    const snapshot = await getDocs(groupsRef);
    
    if (snapshot.empty) {
      const defaultGroups = [
        { name: 'Research Committee', description: 'Faculty research initiatives' },
        { name: 'Curriculum Committee', description: 'Curriculum development and review' },
        { name: 'PACFU Officers', description: 'PACFU leadership team' },
        { name: 'Faculty Development', description: 'Professional development programs' },
        { name: 'Accreditation Team', description: 'Accreditation preparation and compliance' },
        { name: 'Extension Committee', description: 'Community extension programs' },
      ];
      
      for (const group of defaultGroups) {
        await addDoc(groupsRef, {
          name: group.name,
          description: group.description,
          createdAt: serverTimestamp(),
        });
      }
      console.log('Default groups initialized');
    }
  } catch (error) {
    console.error('Error initializing default groups:', error);
  }
};
