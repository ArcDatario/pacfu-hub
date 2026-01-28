import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { MessageFile, isImageFile, isVideoFile, downloadMessageFile } from '@/services/messageFileService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: MessageFile | null;
}

export function FilePreviewModal({
  open,
  onOpenChange,
  file,
}: FilePreviewModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);

  if (!file) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadMessageFile(file.downloadUrl, file.fileName);
      toast.success('File downloaded');
    } catch (error) {
      toast.error('Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const isImage = isImageFile(file.mimeType);
  const isVideo = isVideoFile(file.mimeType);
  const isPdf = file.mimeType.includes('pdf');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden [&>button]:hidden">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
          <DialogTitle className="truncate max-w-[60%]">{file.fileName}</DialogTitle>
          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4 min-h-[400px]">
          {isImage ? (
            <div 
              className="overflow-auto max-w-full max-h-[calc(90vh-100px)] flex items-center justify-center"
              style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
            >
              <img
                src={file.downloadUrl}
                alt={file.fileName}
                className={cn(
                  "max-w-full max-h-full object-contain transition-transform duration-200",
                )}
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          ) : isVideo ? (
            <video
              src={file.downloadUrl}
              controls
              autoPlay
              className="max-w-full max-h-[calc(90vh-100px)]"
            />
          ) : isPdf ? (
            <iframe
              src={file.downloadUrl}
              title={file.fileName}
              className="w-full h-[calc(90vh-100px)]"
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-lg font-medium mb-2">{file.fileName}</p>
              <p className="text-muted-foreground mb-4">{file.fileSizeFormatted}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Preview not available for this file type
              </p>
              <Button onClick={handleDownload} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download to view
              </Button>
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-muted/20 text-sm text-muted-foreground">
          {file.fileSizeFormatted} • Shared by {file.uploadedByName} • {file.uploadedAt.toLocaleString()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
