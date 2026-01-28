import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Image, FileText, Loader2 } from 'lucide-react';
import { validateFileSize, MAX_MESSAGE_FILE_SIZE } from '@/services/messageFileService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileUploadButtonProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  uploading?: boolean;
}

export function FileUploadButton({
  onFileSelect,
  disabled = false,
  uploading = false,
}: FileUploadButtonProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileSize(file);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    onFileSelect(file);
    
    // Reset input
    e.target.value = '';
    setOpen(false);
  };

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled || uploading}
            className={cn(
              "h-10 w-10 rounded-full",
              uploading && "animate-pulse"
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => imageInputRef.current?.click()}
            className="cursor-pointer"
          >
            <Image className="h-4 w-4 mr-2 text-blue-500" />
            Photo or Video
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer"
          >
            <FileText className="h-4 w-4 mr-2 text-amber-500" />
            File
          </DropdownMenuItem>
          <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1 pt-2">
            Max file size: {MAX_MESSAGE_FILE_SIZE / 1024 / 1024}MB
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
