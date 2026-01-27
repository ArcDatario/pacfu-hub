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
    formData.append('userId', 'default'); // Always use 'default' for consistent file paths
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

// Share link collection
const SHARE_LINKS_COLLECTION = 'shareLinks';

export interface ShareLink {
  id: string;
  documentId: string;
  url: string;
  token: string;
  isFolder: boolean;
  createdAt: Date;
  expiresAt: Date | null;
}

// Generate a share link for a document or folder
export const generateShareLink = async (
  documentId: string,
  isFolder: boolean = false
): Promise<ShareLink> => {
  // Generate a unique token
  const token = crypto.randomUUID();
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/share/${token}`;
  
  const now = Timestamp.now();
  // Set expiry to 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  const docRef = await addDoc(collection(db, SHARE_LINKS_COLLECTION), {
    documentId,
    token,
    url,
    isFolder,
    createdAt: now,
    expiresAt: Timestamp.fromDate(expiresAt),
  });

  return {
    id: docRef.id,
    documentId,
    url,
    token,
    isFolder,
    createdAt: now.toDate(),
    expiresAt,
  };
};

// Get existing share link for a document
export const getShareLink = async (documentId: string): Promise<ShareLink | null> => {
  const q = query(
    collection(db, SHARE_LINKS_COLLECTION),
    where('documentId', '==', documentId)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const docData = snapshot.docs[0].data();
  const expiresAt = docData.expiresAt?.toDate();
  
  // Check if expired
  if (expiresAt && expiresAt < new Date()) {
    // Delete expired link
    await deleteDoc(doc(db, SHARE_LINKS_COLLECTION, snapshot.docs[0].id));
    return null;
  }
  
  return {
    id: snapshot.docs[0].id,
    documentId: docData.documentId,
    url: docData.url,
    token: docData.token,
    isFolder: docData.isFolder,
    createdAt: docData.createdAt?.toDate() || new Date(),
    expiresAt: expiresAt || null,
  };
};

// Get share link by token (for public access)
export const getShareLinkByToken = async (token: string): Promise<ShareLink | null> => {
  const q = query(
    collection(db, SHARE_LINKS_COLLECTION),
    where('token', '==', token)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const docData = snapshot.docs[0].data();
  const expiresAt = docData.expiresAt?.toDate();
  
  // Check if expired
  if (expiresAt && expiresAt < new Date()) {
    return null;
  }
  
  return {
    id: snapshot.docs[0].id,
    documentId: docData.documentId,
    url: docData.url,
    token: docData.token,
    isFolder: docData.isFolder,
    createdAt: docData.createdAt?.toDate() || new Date(),
    expiresAt: expiresAt || null,
  };
};

// Get all files in a folder recursively (for ZIP download)
export const getAllFilesInFolder = async (folderId: string): Promise<Document[]> => {
  const files: Document[] = [];
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('parentId', '==', folderId)
  );
  
  const snapshot = await getDocs(q);
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const document: Document = {
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
    
    if (document.type === 'folder') {
      // Recursively get files from subfolders
      const subFiles = await getAllFilesInFolder(document.id);
      files.push(...subFiles);
    } else {
      files.push(document);
    }
  }
  
  return files;
};

// Maximum file size (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Validate file size
export const validateFileSize = (file: File): { valid: boolean; message?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `File "${file.name}" exceeds the maximum size of 5MB (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    };
  }
  return { valid: true };
};