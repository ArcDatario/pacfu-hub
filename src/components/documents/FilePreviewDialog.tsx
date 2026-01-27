import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Document } from '@/types/document';
import { Download, X, ExternalLink } from 'lucide-react';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  onDownload: (doc: Document) => void;
}

export function FilePreviewDialog({ 
  open, 
  onOpenChange, 
  document: doc,
  onDownload 
}: FilePreviewDialogProps) {
  if (!doc) return null;

  const renderPreview = () => {
    if (!doc.downloadUrl) {
      return (
        <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
          <p className="text-muted-foreground">Preview not available</p>
        </div>
      );
    }

    switch (doc.type) {
      case 'image':
        return (
          <div className="flex items-center justify-center max-h-[70vh] overflow-hidden">
            <img 
              src={doc.downloadUrl} 
              alt={doc.name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        );
      
      case 'pdf':
        return (
          <iframe
            src={doc.downloadUrl}
            className="w-full h-[70vh] rounded-lg border"
            title={doc.name}
          />
        );
      
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg gap-4">
            <p className="text-muted-foreground">
              Preview not available for this file type
            </p>
            <Button onClick={() => onDownload(doc)} className="gap-2">
              <Download className="h-4 w-4" />
              Download to view
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate">{doc.name}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(doc.downloadUrl, '_blank')}
                className="gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(doc)}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {renderPreview()}
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          {doc.sizeFormatted && <span>{doc.sizeFormatted}</span>}
          {doc.mimeType && <span className="ml-2">• {doc.mimeType}</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
