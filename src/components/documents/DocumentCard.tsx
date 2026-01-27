import { Document } from '@/types/document';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical,
  Download,
  Trash2,
  Pencil,
  Link2,
  Users,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FilePreview } from './FilePreview';

interface DocumentCardProps {
  document: Document;
  viewMode: 'grid' | 'list';
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: (doc: Document) => void;
  onOpen?: (doc: Document) => void;
  onPreview?: (doc: Document) => void;
  onDownload?: (doc: Document) => void;
  onRename?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onShare?: (doc: Document) => void;
  isAdmin?: boolean;
}

export function DocumentCard({ 
  document: doc, 
  viewMode, 
  isSelected = false,
  selectionMode = false,
  onSelect,
  onOpen,
  onPreview,
  onDownload,
  onRename,
  onDelete,
  onShare,
  isAdmin
}: DocumentCardProps) {
  const formattedDate = format(doc.createdAt, 'MMM d, yyyy');

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if coming from dropdown or action button
    const target = e.target as HTMLElement;
    if (target.closest('[data-radix-dropdown-menu-trigger]') || 
        target.closest('button') || 
        target.closest('[role="menuitem"]')) {
      e.stopPropagation();
      return;
    }

    if (selectionMode) {
      e.stopPropagation();
      onSelect?.(doc);
      return;
    }
    
    if (doc.type === 'folder') {
      onOpen?.(doc);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (selectionMode) return;
    
    if (doc.type !== 'folder') {
      onPreview?.(doc);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(doc);
  };

  const handleMenuItemClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    action();
  };

  if (viewMode === 'list') {
    return (
      <div 
        className={cn(
          "flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm hover:shadow-card transition-shadow cursor-pointer",
          isSelected && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {selectionMode && (
          <div onClick={handleCheckboxClick}>
            <Checkbox checked={isSelected} />
          </div>
        )}
        <FilePreview document={doc} size="sm" />
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
          {doc.type !== 'folder' && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onPreview?.(doc);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
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
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {doc.type !== 'folder' && (
                <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, () => onPreview?.(doc))}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
              )}
              {doc.type !== 'folder' && doc.downloadUrl && (
                <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, () => onDownload?.(doc))}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, () => onRename?.(doc))}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, () => onShare?.(doc))}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Share Link
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => handleMenuItemClick(e, () => onDelete?.(doc))}
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

  // Grid view
  return (
    <div 
      className={cn(
        "group rounded-xl bg-card p-4 shadow-card transition-all hover:shadow-card-hover cursor-pointer relative",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {selectionMode && (
        <div 
          className="absolute top-2 left-2 z-10"
          onClick={handleCheckboxClick}
        >
          <Checkbox checked={isSelected} />
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <FilePreview document={doc} size="md" />
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
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {doc.type !== 'folder' && (
              <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, () => onPreview?.(doc))}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
            )}
            {doc.type !== 'folder' && doc.downloadUrl && (
              <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, () => onDownload?.(doc))}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, () => onRename?.(doc))}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, () => onShare?.(doc))}>
                <Link2 className="h-4 w-4 mr-2" />
                Share Link
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={(e) => handleMenuItemClick(e, () => onDelete?.(doc))}
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
