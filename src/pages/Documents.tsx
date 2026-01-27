import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Upload, 
  Search, 
  FolderOpen, 
  Grid,
  List,
  Plus,
  ChevronRight,
  Home,
  Download,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Document, Breadcrumb } from '@/types/document';
import { 
  subscribeToDocuments, 
  getAllFilesInFolder,
  downloadFile
} from '@/services/documentService';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { UploadFileDialog } from '@/components/documents/UploadFileDialog';
import { CreateFolderDialog } from '@/components/documents/CreateFolderDialog';
import { DeleteDocumentDialog } from '@/components/documents/DeleteDocumentDialog';
import { RenameDocumentDialog } from '@/components/documents/RenameDocumentDialog';
import { FilePreviewDialog } from '@/components/documents/FilePreviewDialog';
import { ShareLinkDialog } from '@/components/documents/ShareLinkDialog';
import { useDocumentSelection } from '@/hooks/useDocumentSelection';
import { toast } from '@/hooks/use-toast';
import JSZip from 'jszip';

export default function Documents() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'My Documents' }]);
  
  // Dialog states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Selection state
  const {
    selectedCount,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    getSelectedDocuments,
  } = useDocumentSelection();
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Subscribe to documents
  useEffect(() => {
    if (!user?.id) return;
    
    setLoading(true);
    const unsubscribe = subscribeToDocuments(currentFolderId, user.id, (docs) => {
      setDocuments(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentFolderId, user?.id]);

  // Update breadcrumbs when navigating
  const navigateToFolder = async (doc: Document) => {
    setCurrentFolderId(doc.id);
    setBreadcrumbs(prev => [...prev, { id: doc.id, name: doc.name }]);
  };

  const navigateToBreadcrumb = async (breadcrumb: Breadcrumb, index: number) => {
    setCurrentFolderId(breadcrumb.id);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  const handleDownload = async (doc: Document) => {
    if (doc.downloadUrl) {
      try {
        await downloadFile(doc.downloadUrl, doc.name);
        toast({
          title: 'Download started',
          description: `Downloading ${doc.name}`,
        });
      } catch (error) {
        toast({
          title: 'Download failed',
          description: 'Could not download the file',
          variant: 'destructive',
        });
      }
    }
  };

  const handlePreview = (doc: Document) => {
    setSelectedDocument(doc);
    setPreviewDialogOpen(true);
  };

  const handleRename = (doc: Document) => {
    setSelectedDocument(doc);
    setRenameDialogOpen(true);
  };

  const handleDelete = (doc: Document) => {
    setSelectedDocument(doc);
    setDeleteDialogOpen(true);
  };

  const handleShare = (doc: Document) => {
    setSelectedDocument(doc);
    setShareDialogOpen(true);
  };

  const handleSelect = (doc: Document) => {
    toggleSelection(doc.id);
  };

  const handleSelectAll = () => {
    selectAll(filteredDocs);
  };

  const handleClearSelection = () => {
    clearSelection();
    setSelectionMode(false);
  };

  const handleDownloadSelected = async () => {
    const selected = getSelectedDocuments(documents);
    if (selected.length === 0) return;

    // If only one file selected (not folder), download directly
    if (selected.length === 1 && selected[0].type !== 'folder') {
      handleDownload(selected[0]);
      return;
    }

    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      
      for (const doc of selected) {
        if (doc.type === 'folder') {
          // Get all files in folder recursively
          const folderFiles = await getAllFilesInFolder(doc.id);
          const folder = zip.folder(doc.name);
          
          for (const file of folderFiles) {
            if (file.downloadUrl) {
              try {
                const response = await fetch(file.downloadUrl);
                const blob = await response.blob();
                folder?.file(file.name, blob);
              } catch (error) {
                console.error(`Failed to fetch ${file.name}:`, error);
              }
            }
          }
        } else if (doc.downloadUrl) {
          try {
            const response = await fetch(doc.downloadUrl);
            const blob = await response.blob();
            zip.file(doc.name, blob);
          } catch (error) {
            console.error(`Failed to fetch ${doc.name}:`, error);
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documents-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download complete',
        description: `${selected.length} item(s) downloaded as ZIP`,
      });

      handleClearSelection();
    } catch (error) {
      console.error('ZIP download error:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to create ZIP file',
        variant: 'destructive',
      });
    } finally {
      setDownloadingZip(false);
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const folders = filteredDocs.filter(d => d.type === 'folder');
  const files = filteredDocs.filter(d => d.type !== 'folder');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Documents</h1>
            <p className="mt-1 text-muted-foreground">
              Manage and organize your files
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setCreateFolderOpen(true)}>
              <Plus className="h-4 w-4" />
              New Folder
            </Button>
            <Button variant="accent" className="gap-2" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id ?? 'root'} className="flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
              <button
                onClick={() => navigateToBreadcrumb(crumb, index)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors",
                  index === breadcrumbs.length - 1 
                    ? "font-medium text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {index === 0 && <Home className="h-4 w-4" />}
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* Selection Bar */}
        {selectionMode && (
          <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedCount} item(s) selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleDownloadSelected}
                disabled={selectedCount === 0 || downloadingZip}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {downloadingZip ? 'Creating ZIP...' : 'Download as ZIP'}
              </Button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            {!selectionMode && filteredDocs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectionMode(true)}
              >
                Select
              </Button>
            )}
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading documents...</p>
          </div>
        ) : (
          <>
            {/* Folders Section */}
            {folders.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Folders</h2>
                <div className={cn(
                  viewMode === 'grid' 
                    ? "grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    : "space-y-2"
                )}>
                  {folders.map((doc) => (
                    <DocumentCard 
                      key={doc.id} 
                      document={doc} 
                      viewMode={viewMode}
                      isSelected={isSelected(doc.id)}
                      selectionMode={selectionMode}
                      onSelect={handleSelect}
                      onOpen={navigateToFolder}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onShare={handleShare}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Files Section */}
            {files.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Files</h2>
                <div className={cn(
                  viewMode === 'grid' 
                    ? "grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    : "space-y-2"
                )}>
                  {files.map((doc) => (
                    <DocumentCard 
                      key={doc.id} 
                      document={doc} 
                      viewMode={viewMode}
                      isSelected={isSelected(doc.id)}
                      selectionMode={selectionMode}
                      onSelect={handleSelect}
                      onPreview={handlePreview}
                      onDownload={handleDownload}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onShare={handleShare}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredDocs.length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No documents found' : 'This folder is empty'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload files or create folders to get started
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <UploadFileDialog 
        open={uploadOpen} 
        onOpenChange={setUploadOpen} 
        parentId={currentFolderId} 
      />
      <CreateFolderDialog 
        open={createFolderOpen} 
        onOpenChange={setCreateFolderOpen} 
        parentId={currentFolderId} 
      />
      <DeleteDocumentDialog 
        open={deleteDialogOpen} 
        onOpenChange={setDeleteDialogOpen} 
        document={selectedDocument} 
      />
      <RenameDocumentDialog 
        open={renameDialogOpen} 
        onOpenChange={setRenameDialogOpen} 
        document={selectedDocument} 
      />
      <FilePreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        document={selectedDocument}
        onDownload={handleDownload}
      />
      <ShareLinkDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        document={selectedDocument}
      />
    </DashboardLayout>
  );
}
