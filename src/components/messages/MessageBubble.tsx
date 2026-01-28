import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Play, File, Image as ImageIcon, Loader2, Eye } from 'lucide-react';
import { Message } from '@/types/chat';
import { 
  isImageFile, 
  isVideoFile, 
  downloadMessageFile,
  MessageFile 
} from '@/services/messageFileService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderAvatar: { type: 'image' | 'text'; value: string };
  userAvatar?: string | null;
  userName?: string;
  showSenderName?: boolean;
  onPreviewFile?: (file: MessageFile) => void;
}

export function MessageBubble({
  message,
  isOwn,
  senderAvatar,
  userAvatar,
  userName,
  showSenderName = false,
  onPreviewFile,
}: MessageBubbleProps) {
  const [downloading, setDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const fileData = message.file;
  const isFileMessage = ['file', 'image', 'video'].includes(message.type);
  const isImage = fileData?.mimeType && isImageFile(fileData.mimeType);
  const isVideo = fileData?.mimeType && isVideoFile(fileData.mimeType);

  const handleDownload = async () => {
    if (!fileData?.downloadUrl || !fileData?.fileName) return;
    
    setDownloading(true);
    try {
      await downloadMessageFile(fileData.downloadUrl, fileData.fileName);
      toast.success('File downloaded');
    } catch (error) {
      toast.error('Failed to download');
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = () => {
    if (fileData && onPreviewFile) {
      onPreviewFile({
        id: message.id,
        chatId: message.chatId,
        messageId: message.id,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        fileSizeFormatted: fileData.fileSizeFormatted,
        mimeType: fileData.mimeType,
        storagePath: fileData.storagePath,
        downloadUrl: fileData.downloadUrl,
        uploadedBy: message.senderId,
        uploadedByName: message.senderName,
        uploadedAt: message.timestamp,
      });
    }
  };

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      {/* Sender Avatar (only show for incoming messages) */}
      {!isOwn && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full overflow-hidden">
            {senderAvatar.type === 'image' ? (
              <img 
                src={senderAvatar.value} 
                alt={message.senderName} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-accent flex items-center justify-center">
                <span className="text-accent-foreground text-xs font-medium">
                  {senderAvatar.value}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Message Bubble */}
      <div className={cn(
        "max-w-[70%] rounded-2xl overflow-hidden",
        isOwn 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-muted rounded-bl-md",
        !isFileMessage && "px-4 py-2"
      )}>
        {/* Sender name for group chats */}
        {showSenderName && !isOwn && (
          <p className={cn(
            "text-xs font-medium mb-1 opacity-70",
            isFileMessage && "px-4 pt-2"
          )}>
            {message.senderName}
          </p>
        )}

        {/* Content based on message type */}
        {isImage && fileData?.downloadUrl ? (
          <div className="relative group cursor-pointer" onClick={handlePreview}>
            {!imageLoaded && (
              <div className="w-[200px] h-[200px] flex items-center justify-center bg-muted/50">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <img
              src={fileData.downloadUrl}
              alt={fileData.fileName}
              className={cn(
                "max-w-[280px] max-h-[300px] object-cover",
                !imageLoaded && "hidden"
              )}
              onLoad={() => setImageLoaded(true)}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview();
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
                  handleDownload();
                }}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : isVideo && fileData?.downloadUrl ? (
          <div className="relative group cursor-pointer" onClick={handlePreview}>
            <video
              src={fileData.downloadUrl}
              className="max-w-[280px] max-h-[300px] object-cover"
            />
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-white/80 flex items-center justify-center">
                <Play className="h-6 w-6 text-black ml-1" />
              </div>
            </div>
          </div>
        ) : isFileMessage && fileData ? (
          <div className="flex items-center gap-3 p-3 min-w-[200px]">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
              isOwn ? "bg-primary-foreground/20" : "bg-background"
            )}>
              <File className={cn(
                "h-5 w-5",
                isOwn ? "text-primary-foreground" : "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileData.fileName}</p>
              <p className={cn(
                "text-xs",
                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {fileData.fileSizeFormatted}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant={isOwn ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={handlePreview}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant={isOwn ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {/* Timestamp */}
        <p className={cn(
          "text-xs mt-1",
          isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
          isFileMessage && "px-3 pb-2"
        )}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      
      {/* Current User Avatar (only show for own messages) */}
      {isOwn && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full overflow-hidden">
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={userName || 'You'} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-medium">
                  {userName?.charAt(0) || 'U'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
