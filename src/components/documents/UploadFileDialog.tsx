import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, File as FileIcon, X, AlertCircle } from 'lucide-react';
import { uploadFile, validateFileSize, getMaxFileSizeMB } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
}

export function UploadFileDialog({ open, onOpenChange, parentId }: UploadFileDialogProps) {
  const { user } = useAuth();
  // IMPORTANT: use the browser File type here. We also import a Lucide icon named `File`,
  // so we alias it to `FileIcon` above to avoid breaking uploads.
  const [files, setFiles] = useState<globalThis.File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles: globalThis.File[] = [];
      const invalidFiles: string[] = [];
      
      newFiles.forEach(file => {
        if (validateFileSize(file)) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      });
      
      if (invalidFiles.length > 0) {
        toast({
          title: 'Files too large',
          description: `${invalidFiles.join(', ')} exceed the ${getMaxFileSizeMB()}MB limit`,
          variant: 'destructive',
        });
      }
      
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
        setProgress(prev => [...prev, ...validFiles.map(() => 0)]);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setProgress(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!user || files.length === 0) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(
          files[i],
          parentId,
          user.id,
          user.name,
          (fileProgress) => {
            setProgress(prev => {
              const newProgress = [...prev];
              newProgress[i] = fileProgress;
              return newProgress;
            });
          }
        );
      }

      toast({
        title: 'Success',
        description: `${files.length} file(s) uploaded successfully`,
      });

      setFiles([]);
      setProgress([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload files. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setProgress([]);
      onOpenChange(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      const validFiles: globalThis.File[] = [];
      const invalidFiles: string[] = [];
      
      newFiles.forEach(file => {
        if (validateFileSize(file)) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      });
      
      if (invalidFiles.length > 0) {
        toast({
          title: 'Files too large',
          description: `${invalidFiles.join(', ')} exceed the ${getMaxFileSizeMB()}MB limit`,
          variant: 'destructive',
        });
      }
      
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
        setProgress(prev => [...prev, ...validFiles.map(() => 0)]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Drag and drop files or click to browse
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Drag files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum file size: {getMaxFileSizeMB()}MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                >
                  <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {uploading && progress[index] > 0 && (
                      <Progress value={progress[index]} className="h-1 mt-1" />
                    )}
                  </div>
                  {!uploading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
