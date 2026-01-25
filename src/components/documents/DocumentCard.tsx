import { Document } from '@/types/document';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FolderOpen, 
  FileText, 
  Image, 
  FileSpreadsheet,
  File,
  MoreVertical,
  Download,
  Trash2,
  Pencil,
  Share2,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DocumentCardProps {
  document: Document;
  viewMode: 'grid' | 'list';
  onOpen?: (doc: Document) => void;
  onDownload?: (doc: Document) => void;
  onRename?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onToggleShare?: (doc: Document) => void;
  isAdmin?: boolean;
}

const typeIcons = {
  folder: FolderOpen,
  pdf: FileText,
  doc: FileText,
  image: Image,
  spreadsheet: FileSpreadsheet,
  other: File,
};

const typeColors = {
  folder: 'text-accent',
  pdf: 'text-destructive',
  doc: 'text-primary',
  image: 'text-success',
  spreadsheet: 'text-success',
  other: 'text-muted-foreground',
};

export function DocumentCard({ 
  document: doc, 
  viewMode, 
  onOpen,
  onDownload,
  onRename,
  onDelete,
  onToggleShare,
  isAdmin
}: DocumentCardProps) {
  const Icon = typeIcons[doc.type];
  const formattedDate = format(doc.createdAt, 'MMM d, yyyy');

  const handleClick = () => {
    if (doc.type === 'folder') {
      onOpen?.(doc);
    }
  };

  const handleDoubleClick = () => {
    if (doc.type !== 'folder' && doc.downloadUrl) {
      window.open(doc.downloadUrl, '_blank');
    }
  };

  if (viewMode === 'list') {
    return (
      <div 
        className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm hover:shadow-card transition-shadow cursor-pointer"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <Icon className={cn("h-8 w-8", typeColors[doc.type])} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-card-foreground truncate">{doc.name}</p>
          <p className="text-xs text-muted-foreground">
            {doc.sizeFormatted ? `${doc.sizeFormatted} • ` : ''}{formattedDate} • {doc.createdByName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {doc.shared && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              <Users className="h-3 w-3" />
              Shared
            </span>
          )}
          {doc.type !== 'folder' && doc.downloadUrl && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.(doc);
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRename?.(doc)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => onToggleShare?.(doc)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  {doc.shared ? 'Make Private' : 'Share'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => onDelete?.(doc)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group rounded-xl bg-card p-4 shadow-card transition-all hover:shadow-card-hover cursor-pointer"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-start justify-between mb-4">
        <Icon className={cn("h-10 w-10", typeColors[doc.type])} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {doc.type !== 'folder' && doc.downloadUrl && (
              <DropdownMenuItem onClick={() => onDownload?.(doc)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRename?.(doc)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => onToggleShare?.(doc)}>
                <Share2 className="h-4 w-4 mr-2" />
                {doc.shared ? 'Make Private' : 'Share'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => onDelete?.(doc)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="font-medium text-card-foreground truncate mb-1">{doc.name}</p>
      <p className="text-xs text-muted-foreground">
        {doc.sizeFormatted ? `${doc.sizeFormatted} • ` : ''}{formattedDate}
      </p>
      {doc.shared && (
        <span className="inline-flex items-center gap-1 mt-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          <Users className="h-3 w-3" />
          Shared
        </span>
      )}
    </div>
  );
}
