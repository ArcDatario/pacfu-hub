import { db, storage } from '@/lib/firebase';
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
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { Document, getFileType, formatFileSize } from '@/types/document';

const COLLECTION_NAME = 'documents';

// Subscribe to documents in a folder
export const subscribeToDocuments = (
  parentId: string | null,
  callback: (docs: Document[]) => void
) => {
  // Simple query without multiple orderBy to avoid needing composite index
  const q = query(
    collection(db, COLLECTION_NAME),
    where('parentId', '==', parentId)
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

// Upload a file
export const uploadFile = async (
  file: File,
  parentId: string | null,
  userId: string,
  userName: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Create storage path
  const timestamp = Date.now();
  const storagePath = `documents/${userId}/${timestamp}_${file.name}`;
  const storageRef = ref(storage, storagePath);

  // Upload file with progress
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        reject(error);
      },
      async () => {
        try {
          // Get download URL
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Create document record in Firestore
          const now = Timestamp.now();
          const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            name: file.name,
            type: getFileType(file.type),
            size: file.size,
            sizeFormatted: formatFileSize(file.size),
            mimeType: file.type,
            downloadUrl,
            storagePath,
            parentId,
            createdBy: userId,
            createdByName: userName,
            createdAt: now,
            updatedAt: now,
            shared: false,
            sharedWith: [],
          });

          resolve(docRef.id);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
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
  // If it's a folder, delete all children first
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

  // Delete file from storage if it exists
  if (document.storagePath) {
    try {
      const storageRef = ref(storage, document.storagePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
    }
  }

  // Delete document from Firestore
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
