export interface Document {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'doc' | 'image' | 'spreadsheet' | 'other';
  size?: number;
  sizeFormatted?: string;
  mimeType?: string;
  downloadUrl?: string;
  storagePath?: string;
  parentId: string | null; // null means root level
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  shared: boolean;
  sharedWith?: string[]; // user IDs
}

export interface Breadcrumb {
  id: string | null;
  name: string;
}

export const getFileType = (mimeType: string): Document['type'] => {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'spreadsheet';
  return 'other';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
