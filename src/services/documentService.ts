import { Document, getFileType, formatFileSize } from '@/types/document';
import { RealtimeChannel, createClient, SupabaseClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

// Lazy initialization of Supabase client to prevent app crash if env vars not ready
let supabaseInstance: SupabaseClient | null = null;

const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!url || !key) {
      throw new Error('Lovable Cloud is not configured yet. Please wait for the environment to sync.');
    }
    
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
};

// Subscribe to documents in a folder
export const subscribeToDocuments = (
  parentId: string | null,
  callback: (docs: Document[]) => void
): (() => void) => {
  // Check if Supabase is available
  try {
    const supabase = getSupabase();
    
    // Initial fetch
    fetchDocuments(parentId).then(callback).catch(() => callback([]));

    // Set up realtime subscription
    const channel: RealtimeChannel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
        },
        () => {
          // Refetch when any change happens
          fetchDocuments(parentId).then(callback).catch(() => callback([]));
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error('Supabase not ready:', error);
    callback([]);
    return () => {};
  }
};

// Fetch documents from a folder
const fetchDocuments = async (parentId: string | null): Promise<Document[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('parent_id', parentId);

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }

  const documents: Document[] = (data || []).map((doc) => ({
    id: doc.id,
    name: doc.name,
    type: doc.type as Document['type'],
    size: doc.size || undefined,
    sizeFormatted: doc.size_formatted || undefined,
    mimeType: doc.mime_type || undefined,
    downloadUrl: doc.storage_path ? getPublicUrl(doc.storage_path) : undefined,
    storagePath: doc.storage_path || undefined,
    parentId: doc.parent_id,
    createdBy: doc.created_by,
    createdByName: doc.created_by_name,
    createdAt: new Date(doc.created_at),
    updatedAt: new Date(doc.updated_at),
    shared: doc.shared || false,
    sharedWith: [],
  }));

  // Sort: folders first, then by name
  documents.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  return documents;
};

// Get public URL for a file
const getPublicUrl = (storagePath: string): string => {
  const supabase = getSupabase();
  const { data } = supabase.storage.from('documents').getPublicUrl(storagePath);
  return data.publicUrl;
};

// Get a single document
export const getDocument = async (docId: string): Promise<Document | null> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    type: data.type as Document['type'],
    size: data.size || undefined,
    sizeFormatted: data.size_formatted || undefined,
    mimeType: data.mime_type || undefined,
    downloadUrl: data.storage_path ? getPublicUrl(data.storage_path) : undefined,
    storagePath: data.storage_path || undefined,
    parentId: data.parent_id,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    shared: data.shared || false,
    sharedWith: [],
  };
};

// Create a new folder
export const createFolder = async (
  name: string,
  parentId: string | null,
  userId: string,
  userName: string
): Promise<string> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('documents')
    .insert({
      name,
      type: 'folder',
      parent_id: parentId,
      created_by: userId,
      created_by_name: userName,
      shared: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    throw error;
  }

  return data.id;
};

// Validate file size
export const validateFileSize = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE;
};

// Get max file size in MB
export const getMaxFileSizeMB = (): number => {
  return MAX_FILE_SIZE / (1024 * 1024);
};

// Upload a file
export const uploadFile = async (
  file: File,
  parentId: string | null,
  userId: string,
  userName: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const supabase = getSupabase();
  
  // Validate file size
  if (!validateFileSize(file)) {
    throw new Error(`File size exceeds ${getMaxFileSizeMB()}MB limit`);
  }

  // Create storage path
  const timestamp = Date.now();
  const storagePath = `${userId}/${timestamp}_${file.name}`;

  // Upload to storage
  onProgress?.(10);
  
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file);

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw uploadError;
  }

  onProgress?.(70);

  // Create document record
  const { data, error: insertError } = await supabase
    .from('documents')
    .insert({
      name: file.name,
      type: getFileType(file.type),
      size: file.size,
      size_formatted: formatFileSize(file.size),
      mime_type: file.type,
      storage_path: storagePath,
      parent_id: parentId,
      created_by: userId,
      created_by_name: userName,
      shared: false,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating document record:', insertError);
    // Try to delete the uploaded file
    await supabase.storage.from('documents').remove([storagePath]);
    throw insertError;
  }

  onProgress?.(100);

  return data.id;
};

// Rename a document/folder
export const renameDocument = async (docId: string, newName: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('documents')
    .update({ name: newName })
    .eq('id', docId);

  if (error) {
    console.error('Error renaming document:', error);
    throw error;
  }
};

// Delete a document/folder
export const deleteDocument = async (document: Document): Promise<void> => {
  const supabase = getSupabase();
  
  // If it's a folder, delete all children first
  if (document.type === 'folder') {
    const { data: children } = await supabase
      .from('documents')
      .select('*')
      .eq('parent_id', document.id);

    if (children) {
      for (const child of children) {
        await deleteDocument({
          id: child.id,
          name: child.name,
          type: child.type as Document['type'],
          size: child.size || undefined,
          sizeFormatted: child.size_formatted || undefined,
          mimeType: child.mime_type || undefined,
          storagePath: child.storage_path || undefined,
          parentId: child.parent_id,
          createdBy: child.created_by,
          createdByName: child.created_by_name,
          createdAt: new Date(child.created_at),
          updatedAt: new Date(child.updated_at),
          shared: child.shared || false,
          sharedWith: [],
        });
      }
    }
  }

  // Delete file from storage if it exists
  if (document.storagePath) {
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.storagePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
    }
  }

  // Delete document record
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', document.id);

  if (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Toggle share status
export const toggleShareDocument = async (docId: string, shared: boolean): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('documents')
    .update({ shared })
    .eq('id', docId);

  if (error) {
    console.error('Error toggling share:', error);
    throw error;
  }
};

// Move document to another folder
export const moveDocument = async (docId: string, newParentId: string | null): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('documents')
    .update({ parent_id: newParentId })
    .eq('id', docId);

  if (error) {
    console.error('Error moving document:', error);
    throw error;
  }
};
