import { Document } from '@/types/document';
import { 
  FolderOpen, 
  FileText, 
  Image, 
  FileSpreadsheet,
  File,
  FileVideo,
  FileAudio
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  document: Document;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const typeIcons = {
  folder: FolderOpen,
  pdf: FileText,
  doc: FileText,
  image: Image,
  spreadsheet: FileSpreadsheet,
  video: FileVideo,
  audio: FileAudio,
  other: File,
};

const typeColors = {
  folder: 'text-accent',
  pdf: 'text-destructive',
  doc: 'text-primary',
  image: 'text-success',
  spreadsheet: 'text-success',
  video: 'text-purple-500',
  audio: 'text-orange-500',
  other: 'text-muted-foreground',
};

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
};

const previewSizes = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
};

export function FilePreview({ document: doc, size = 'md', className }: FilePreviewProps) {
  const Icon = typeIcons[doc.type] || typeIcons.other;
  
  // Show image preview for image files
  if (doc.type === 'image' && doc.downloadUrl) {
    return (
      <div className={cn(
        "rounded-lg overflow-hidden bg-muted flex items-center justify-center",
        previewSizes[size],
        className
      )}>
        <img 
          src={doc.downloadUrl} 
          alt={doc.name}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback to icon if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement?.classList.add('fallback-icon');
          }}
        />
      </div>
    );
  }

  // Show icon for other file types
  return (
    <Icon className={cn(
      sizeClasses[size],
      typeColors[doc.type] || typeColors.other,
      className
    )} />
  );
}
