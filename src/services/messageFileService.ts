import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';

// Maximum file size (5MB)
export const MAX_MESSAGE_FILE_SIZE = 5 * 1024 * 1024;

export interface MessageFile {
  id: string;
  chatId: string;
  messageId: string;
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  mimeType: string;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Date;
}

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validate file size
export const validateFileSize = (file: File): { valid: boolean; message?: string } => {
  if (file.size > MAX_MESSAGE_FILE_SIZE) {
    return {
      valid: false,
      message: `File "${file.name}" exceeds the maximum size of 5MB (${formatFileSize(file.size)})`,
    };
  }
  return { valid: true };
};

// Check if file is an image
export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

// Check if file is a video
export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

// Check if file is media (image or video)
export const isMediaFile = (mimeType: string): boolean => {
  return isImageFile(mimeType) || isVideoFile(mimeType);
};

// Get file type category
export const getFileTypeCategory = (mimeType: string): 'image' | 'video' | 'document' | 'other' => {
  if (isImageFile(mimeType)) return 'image';
  if (isVideoFile(mimeType)) return 'video';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word') || 
      mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('text')) {
    return 'document';
  }
  return 'other';
};

// Upload file to Lovable Cloud storage (messages bucket)
export const uploadMessageFile = async (
  file: File,
  chatId: string,
  userId: string,
  userName: string,
  onProgress?: (progress: number) => void
): Promise<{ storagePath: string; downloadUrl: string } | null> => {
  try {
    // Validate file size
    const validation = validateFileSize(file);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    onProgress?.(10);

    // Create unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${chatId}/${userId}/${timestamp}_${sanitizedFileName}`;

    onProgress?.(30);

    // Upload to Lovable Cloud storage (messages bucket)
    const { data, error } = await supabase.storage
      .from('messages')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    onProgress?.(70);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('messages')
      .getPublicUrl(data.path);

    onProgress?.(100);

    return {
      storagePath: data.path,
      downloadUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Send file message
export const sendFileMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  file: File,
  storagePath: string,
  downloadUrl: string
): Promise<string | null> => {
  try {
    // Add message to subcollection
    const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId,
      senderName,
      content: file.name,
      type: isMediaFile(file.type) ? (isImageFile(file.type) ? 'image' : 'video') : 'file',
      timestamp: serverTimestamp(),
      readBy: [senderId],
      file: {
        fileName: file.name,
        fileSize: file.size,
        fileSizeFormatted: formatFileSize(file.size),
        mimeType: file.type,
        storagePath,
        downloadUrl,
      },
    });

    // Update chat's last message
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: isMediaFile(file.type) 
        ? (isImageFile(file.type) ? '📷 Photo' : '🎥 Video')
        : `📎 ${file.name}`,
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: senderId,
    });

    return messageRef.id;
  } catch (error) {
    console.error('Error sending file message:', error);
    return null;
  }
};

// Get all files in a chat
export const getChatFiles = async (chatId: string): Promise<MessageFile[]> => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      where('type', 'in', ['file', 'image', 'video']),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const file = data.file || {};
      return {
        id: doc.id,
        chatId,
        messageId: doc.id,
        fileName: file.fileName || data.content || 'Unknown',
        fileSize: file.fileSize || 0,
        fileSizeFormatted: file.fileSizeFormatted || '0 Bytes',
        mimeType: file.mimeType || 'application/octet-stream',
        storagePath: file.storagePath || '',
        downloadUrl: file.downloadUrl || '',
        uploadedBy: data.senderId,
        uploadedByName: data.senderName,
        uploadedAt: data.timestamp?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error fetching chat files:', error);
    return [];
  }
};

// Get media files in a chat (images and videos only)
export const getChatMedia = async (chatId: string): Promise<MessageFile[]> => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      where('type', 'in', ['image', 'video']),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const file = data.file || {};
      return {
        id: doc.id,
        chatId,
        messageId: doc.id,
        fileName: file.fileName || data.content || 'Unknown',
        fileSize: file.fileSize || 0,
        fileSizeFormatted: file.fileSizeFormatted || '0 Bytes',
        mimeType: file.mimeType || 'application/octet-stream',
        storagePath: file.storagePath || '',
        downloadUrl: file.downloadUrl || '',
        uploadedBy: data.senderId,
        uploadedByName: data.senderName,
        uploadedAt: data.timestamp?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error fetching chat media:', error);
    return [];
  }
};

// Delete file from storage
export const deleteMessageFile = async (storagePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('messages')
      .remove([storagePath]);

    if (error) {
      console.error('Error deleting file from storage:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Download file
export const downloadMessageFile = async (url: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

// Search messages in a chat
export const searchMessagesInChat = async (
  chatId: string, 
  searchTerm: string
): Promise<Array<{ id: string; content: string; senderName: string; timestamp: Date }>> => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    
    const searchLower = searchTerm.toLowerCase();
    
    return snapshot.docs
      .filter(doc => {
        const data = doc.data();
        const content = (data.content || '').toLowerCase();
        const senderName = (data.senderName || '').toLowerCase();
        return content.includes(searchLower) || senderName.includes(searchLower);
      })
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content,
          senderName: data.senderName,
          timestamp: data.timestamp?.toDate() || new Date(),
        };
      });
  } catch (error) {
    console.error('Error searching messages:', error);
    return [];
  }
};
