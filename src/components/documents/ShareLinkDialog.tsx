import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Document } from '@/types/document';
import { Copy, Check, Link2, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { generateShareLink, getShareLink } from '@/services/documentService';

interface ShareLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
}

export function ShareLinkDialog({ open, onOpenChange, document: doc }: ShareLinkDialogProps) {
  const [shareLink, setShareLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>('');

  useEffect(() => {
    if (open && doc) {
      loadOrGenerateLink();
    }
  }, [open, doc]);

  const loadOrGenerateLink = async () => {
    if (!doc) return;
    
    setLoading(true);
    try {
      // Check if a share link already exists
      const existingLink = await getShareLink(doc.id);
      if (existingLink) {
        setShareLink(existingLink.url);
        setExpiresAt(existingLink.expiresAt?.toLocaleDateString() || 'Never');
      } else {
        setShareLink('');
        setExpiresAt('');
      }
    } catch (error) {
      console.error('Error loading share link:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!doc) return;
    
    setLoading(true);
    try {
      const link = await generateShareLink(doc.id, doc.type === 'folder');
      setShareLink(link.url);
      setExpiresAt(link.expiresAt?.toLocaleDateString() || 'Never');
      toast({
        title: 'Share link created',
        description: 'Anyone with this link can download the file',
      });
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate share link',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share "{doc.name}"
          </DialogTitle>
          <DialogDescription>
            {doc.type === 'folder' 
              ? 'Create a link to share this folder. Anyone with the link can download all files as a ZIP.'
              : 'Create a link to share this file. Anyone with the link can download it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {shareLink ? (
            <>
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input 
                    value={shareLink} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {expiresAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Expires: {expiresAt}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <Link2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No share link exists for this {doc.type === 'folder' ? 'folder' : 'file'}
              </p>
              <Button onClick={handleGenerateLink} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Share Link'}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {shareLink && (
            <Button onClick={handleGenerateLink} disabled={loading}>
              Regenerate Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
