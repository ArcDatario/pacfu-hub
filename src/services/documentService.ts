import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  getDoc,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { Document, getFileType, formatFileSize } from '@/types/document';

const COLLECTION_NAME = 'documents';

// Subscribe to documents in a folder for a specific user
export const subscribeToDocuments = (
  parentId: string | null,
  userId: string,
  callback: (docs: Document[]) => void
) => {
  // Query documents that belong to the current user
  const q = query(
    collection(db, COLLECTION_NAME),
    where('parentId', '==', parentId),
    where('createdBy', '==', userId) // Filter by user ID
  );

  return onSnapshot(q, (snapshot) => {
    const documents: Document[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        type: data.type,
        size: data.size,
        sizeFormatted: data.sizeFormatted,
        mimeType: data.mimeType,
        downloadUrl: data.downloadUrl,
        storagePath: data.storagePath,
        parentId: data.parentId,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        shared: data.shared || false,
        sharedWith: data.sharedWith || [],
      };
    });
    
    // Sort client-side: folders first, then by name
    documents.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
    
    callback(documents);
  }, (error) => {
    console.error('Error fetching documents:', error);
    callback([]);
  });
};

export const getDocument = async (docId: string): Promise<Document | null> => {
  const docRef = doc(db, COLLECTION_NAME, docId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    type: data.type,
    size: data.size,
    sizeFormatted: data.sizeFormatted,
    mimeType: data.mimeType,
    downloadUrl: data.downloadUrl,
    storagePath: data.storagePath,
    parentId: data.parentId,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    shared: data.shared || false,
    sharedWith: data.sharedWith || [],
  };
};

// Create a new folder
export const createFolder = async (
  name: string,
  parentId: string | null,
  userId: string,
  userName: string
): Promise<string> => {
  const now = Timestamp.now();
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    name,
    type: 'folder',
    parentId,
    createdBy: userId,
    createdByName: userName,
    createdAt: now,
    updatedAt: now,
    shared: false,
    sharedWith: [],
  });

  return docRef.id;
};

// Upload a file to public folder
export const uploadFile = async (
  file: File,
  parentId: string | null,
  userId: string,
  userName: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    onProgress?.(10);

    // CHANGE THIS LINE - use full URL
    const response = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      body: formData,
    });

    onProgress?.(50);

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const { filePath, downloadUrl } = await response.json();

    onProgress?.(80);

    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      name: file.name,
      type: getFileType(file.type),
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      mimeType: file.type,
      downloadUrl,
      storagePath: filePath,
      parentId,
      createdBy: userId,
      createdByName: userName,
      createdAt: now,
      updatedAt: now,
      shared: false,
      sharedWith: [],
    });

    onProgress?.(100);

    return docRef.id;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Rename a document/folder
export const renameDocument = async (docId: string, newName: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, docId);
  await updateDoc(docRef, {
    name: newName,
    updatedAt: Timestamp.now(),
  });
};

// Delete a document/folder
export const deleteDocument = async (document: Document): Promise<void> => {
  if (document.type === 'folder') {
    const childrenQuery = query(
      collection(db, COLLECTION_NAME),
      where('parentId', '==', document.id)
    );
    const childrenSnapshot = await getDocs(childrenQuery);
    
    for (const childDoc of childrenSnapshot.docs) {
      const childData = childDoc.data();
      await deleteDocument({
        ...childData,
        id: childDoc.id,
        createdAt: childData.createdAt?.toDate() || new Date(),
        updatedAt: childData.updatedAt?.toDate() || new Date(),
      } as Document);
    }
  }

  if (document.storagePath) {
    try {
      // CHANGE THIS LINE - use full URL
      await fetch('http://localhost:3001/api/delete-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath: document.storagePath }),
      });
    } catch (error) {
      console.error('Error deleting file from storage:', error);
    }
  }

  await deleteDoc(doc(db, COLLECTION_NAME, document.id));
};

// Toggle share status
export const toggleShareDocument = async (docId: string, shared: boolean): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, docId);
  await updateDoc(docRef, {
    shared,
    updatedAt: Timestamp.now(),
  });
};

// Move document to another folder
export const moveDocument = async (docId: string, newParentId: string | null): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, docId);
  await updateDoc(docRef, {
    parentId: newParentId,
    updatedAt: Timestamp.now(),
  });
};