import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  File, 
  Image, 
  Video, 
  Download, 
  Eye,
  Loader2,
  FileText,
  FileSpreadsheet,
  Archive
} from 'lucide-react';
import { 
  getChatFiles, 
  getChatMedia, 
  downloadMessageFile, 
  isImageFile, 
  isVideoFile,
  MessageFile 
} from '@/services/messageFileService';
import { toast } from 'sonner';

interface ChatFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  onPreviewFile: (file: MessageFile) => void;
}

export function ChatFilesDialog({
  open,
  onOpenChange,
  chatId,
  onPreviewFile,
}: ChatFilesDialogProps) {
  const [files, setFiles] = useState<MessageFile[]>([]);
  const [media, setMedia] = useState<MessageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('media');

  useEffect(() => {
    if (open && chatId) {
      loadFiles();
    }
  }, [open, chatId]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const [allFiles, mediaFiles] = await Promise.all([
        getChatFiles(chatId),
        getChatMedia(chatId),
      ]);
      setFiles(allFiles);
      setMedia(mediaFiles);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: MessageFile) => {
    setDownloading(file.id);
    try {
      await downloadMessageFile(file.downloadUrl, file.fileName);
      toast.success('File downloaded');
    } catch (error) {
      toast.error('Failed to download file');
    } finally {
      setDownloading(null);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (isImageFile(mimeType)) return <Image className="h-5 w-5 text-blue-500" />;
    if (isVideoFile(mimeType)) return <Video className="h-5 w-5 text-purple-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) 
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) 
      return <Archive className="h-5 w-5 text-amber-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const documents = files.filter(f => !isImageFile(f.mimeType) && !isVideoFile(f.mimeType));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            Shared Files & Media
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Media ({media.length})
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <File className="h-4 w-4" />
              Files ({documents.length})
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="media" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {media.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <Image className="h-12 w-12 mb-4 opacity-50" />
                      <p>No media shared yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {media.map(file => (
                        <div
                          key={file.id}
                          className="relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer"
                          onClick={() => onPreviewFile(file)}
                        >
                          {isImageFile(file.mimeType) ? (
                            <img
                              src={file.downloadUrl}
                              alt={file.fileName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <video
                              src={file.downloadUrl}
                              className="h-full w-full object-cover"
                            />
                          )}
                          
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPreviewFile(file);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file);
                              }}
                              disabled={downloading === file.id}
                            >
                              {downloading === file.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          {isVideoFile(file.mimeType) && (
                            <div className="absolute bottom-2 right-2 bg-black/70 rounded px-1.5 py-0.5">
                              <Video className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="files" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <File className="h-12 w-12 mb-4 opacity-50" />
                      <p>No files shared yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map(file => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          {getFileIcon(file.mimeType)}
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.fileSizeFormatted} • {file.uploadedByName} • {file.uploadedAt.toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onPreviewFile(file)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownload(file)}
                              disabled={downloading === file.id}
                            >
                              {downloading === file.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
