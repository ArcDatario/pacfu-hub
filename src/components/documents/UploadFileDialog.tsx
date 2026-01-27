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
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { uploadFile, validateFileSize, MAX_FILE_SIZE } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
}

interface FileWithError {
  file: File;
  error?: string;
}

export function UploadFileDialog({ open, onOpenChange, parentId }: UploadFileDialogProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileWithError[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => {
        const validation = validateFileSize(file);
        return {
          file,
          error: validation.valid ? undefined : validation.message,
        };
      });
      setFiles(prev => [...prev, ...newFiles]);
      setProgress(prev => [...prev, ...newFiles.map(() => 0)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setProgress(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!user) return;

    // Filter out files with errors
    const validFiles = files.filter(f => !f.error);
    if (validFiles.length === 0) {
      toast({
        title: 'No valid files',
        description: `All selected files exceed the ${maxSizeMB}MB limit`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      let uploadedCount = 0;
      for (let i = 0; i < files.length; i++) {
        if (files[i].error) continue; // Skip files with errors
        
        await uploadFile(
          files[i].file,
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
        uploadedCount++;
      }

      toast({
        title: 'Success',
        description: `${uploadedCount} file(s) uploaded successfully`,
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
      const newFiles = Array.from(e.dataTransfer.files).map(file => {
        const validation = validateFileSize(file);
        return {
          file,
          error: validation.valid ? undefined : validation.message,
        };
      });
      setFiles(prev => [...prev, ...newFiles]);
      setProgress(prev => [...prev, ...newFiles.map(() => 0)]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const validFilesCount = files.filter(f => !f.error).length;
  const hasErrors = files.some(f => f.error);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Drag and drop files or click to browse. Maximum file size: {maxSizeMB}MB
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
              Maximum file size: {maxSizeMB}MB per file
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
              {files.map((fileWithError, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    fileWithError.error ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted'
                  }`}
                >
                  {fileWithError.error ? (
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  ) : (
                    <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileWithError.file.name}</p>
                    {fileWithError.error ? (
                      <p className="text-xs text-destructive">
                        Exceeds {maxSizeMB}MB limit ({(fileWithError.file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {(fileWithError.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                    {uploading && !fileWithError.error && progress[index] > 0 && (
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

          {hasErrors && (
            <p className="text-xs text-destructive">
              Some files exceed the {maxSizeMB}MB limit and will be skipped
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={validFilesCount === 0 || uploading}
          >
            {uploading ? 'Uploading...' : `Upload ${validFilesCount} File(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
