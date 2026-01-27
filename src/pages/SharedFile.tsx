import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Folder, AlertCircle, Loader2 } from 'lucide-react';
import { getShareLinkByToken, getDocument, getAllFilesInFolder } from '@/services/documentService';
import { Document } from '@/types/document';
import JSZip from 'jszip';

export default function SharedFile() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [isFolder, setIsFolder] = useState(false);

  useEffect(() => {
    loadSharedContent();
  }, [token]);

  const loadSharedContent = async () => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    try {
      const shareLink = await getShareLinkByToken(token);
      if (!shareLink) {
        setError('This share link has expired or does not exist');
        setLoading(false);
        return;
      }

      const doc = await getDocument(shareLink.documentId);
      if (!doc) {
        setError('The shared file or folder no longer exists');
        setLoading(false);
        return;
      }

      setDocument(doc);
      setIsFolder(shareLink.isFolder);
    } catch (err) {
      console.error('Error loading shared content:', err);
      setError('Failed to load shared content');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    setDownloading(true);
    try {
      if (isFolder || document.type === 'folder') {
        // Download folder as ZIP
        const zip = new JSZip();
        const files = await getAllFilesInFolder(document.id);
        
        for (const file of files) {
          if (file.downloadUrl) {
            try {
              const response = await fetch(file.downloadUrl);
              const blob = await response.blob();
              zip.file(file.name, blob);
            } catch (error) {
              console.error(`Failed to fetch ${file.name}:`, error);
            }
          }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${document.name}.zip`;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (document.downloadUrl) {
        // Force download single file using fetch + blob
        const response = await fetch(document.downloadUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.name;
        link.style.display = 'none';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Share Link Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {isFolder || document.type === 'folder' ? (
            <Folder className="h-16 w-16 text-accent mx-auto mb-4" />
          ) : (
            <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
          )}
          <CardTitle className="break-all">{document.name}</CardTitle>
          <CardDescription>
            {isFolder || document.type === 'folder'
              ? 'Shared folder - download as ZIP'
              : document.sizeFormatted || 'Shared file'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {document.type === 'image' && document.downloadUrl && (
            <div className="rounded-lg overflow-hidden bg-muted">
              <img 
                src={document.downloadUrl} 
                alt={document.name}
                className="w-full h-auto max-h-64 object-contain"
              />
            </div>
          )}
          
          <Button 
            className="w-full gap-2" 
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing download...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download {isFolder || document.type === 'folder' ? 'as ZIP' : ''}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Shared by {document.createdByName}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
