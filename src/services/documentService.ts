import { Document, getFileType, formatFileSize } from '@/types/document';
import { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'documents';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

// Lazy initialization of Supabase client
let supabaseClient: SupabaseClient | null = null;

const getSupabase = (): SupabaseClient | null => {
  if (supabaseClient) return supabaseClient;
  
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  if (!url || !key) {
    console.warn('Supabase credentials not available yet');
    return null;
  }
  
  supabaseClient = createClient(url, key, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  
  return supabaseClient;
};

// Subscribe to documents in a folder for the current user
export const subscribeToDocuments = (
  parentId: string | null,
  callback: (docs: Document[]) => void
) => {
  // Initial fetch
  fetchDocuments(parentId).then(callback);

  const supabase = getSupabase();
  if (!supabase) {
    console.warn('Supabase not initialized, skipping realtime subscription');
    return () => {};
  }

  // Set up realtime subscription
  const channel = supabase
    .channel('documents-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'documents',
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        // Refetch on any change
        fetchDocuments(parentId).then(callback);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Fetch documents for the current user
const fetchDocuments = async (parentId: string | null): Promise<Document[]> => {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('Supabase not initialized');
    return [];
  }

  let query = supabase
    .from('documents')
    .select('*');

  if (parentId === null) {
    query = query.is('parent_id', null);
  } else {
    query = query.eq('parent_id', parentId);
  }

  const { data, error } = await query.order('type', { ascending: true }).order('name', { ascending: true });

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }

  return (data || []).map((doc) => ({
    id: doc.id,
    name: doc.name,
    type: doc.type as Document['type'],
    size: doc.size || undefined,
    sizeFormatted: doc.size_formatted || undefined,
    mimeType: doc.mime_type || undefined,
    storagePath: doc.storage_path || undefined,
    parentId: doc.parent_id,
    createdBy: doc.created_by,
    createdByName: doc.created_by_name,
    createdAt: new Date(doc.created_at),
    updatedAt: new Date(doc.updated_at),
    shared: doc.shared,
  }));
};

// Get a single document
export const getDocument = async (docId: string): Promise<Document | null> => {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('Supabase not initialized');
    return null;
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching document:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    type: data.type as Document['type'],
    size: data.size || undefined,
    sizeFormatted: data.size_formatted || undefined,
    mimeType: data.mime_type || undefined,
    storagePath: data.storage_path || undefined,
    parentId: data.parent_id,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    shared: data.shared,
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
  if (!supabase) {
    throw new Error('Storage service not available');
  }

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

// Upload a file
export const uploadFile = async (
  file: File,
  parentId: string | null,
  userId: string,
  userName: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Storage service not available');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  // Create storage path with user ID for isolation
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${userId}/${timestamp}_${sanitizedFileName}`;

  onProgress?.(10); // Started

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw uploadError;
  }

  onProgress?.(70); // File uploaded

  // Create document record in database
  const { data, error: dbError } = await supabase
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

  if (dbError) {
    // Cleanup uploaded file if database insert fails
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    console.error('Database error:', dbError);
    throw dbError;
  }

  onProgress?.(100); // Complete

  return data.id;
};

// Get download URL for a file
export const getDownloadUrl = (storagePath: string): string => {
  const supabase = getSupabase();
  if (!supabase) {
    return '';
  }
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  return data.publicUrl;
};

// Rename a document/folder
export const renameDocument = async (docId: string, newName: string): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Storage service not available');
  }

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
  if (!supabase) {
    throw new Error('Storage service not available');
  }

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
          shared: child.shared,
        });
      }
    }
  }

  // Delete file from storage if it exists
  if (document.storagePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([document.storagePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
    }
  }

  // Delete document from database
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
  if (!supabase) {
    throw new Error('Storage service not available');
  }

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
  if (!supabase) {
    throw new Error('Storage service not available');
  }

  const { error } = await supabase
    .from('documents')
    .update({ parent_id: newParentId })
    .eq('id', docId);

  if (error) {
    console.error('Error moving document:', error);
    throw error;
  }
};
