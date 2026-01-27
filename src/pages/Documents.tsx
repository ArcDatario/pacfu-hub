import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  Search, 
  FolderOpen, 
  Grid,
  List,
  Plus,
  ChevronRight,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Document, Breadcrumb } from '@/types/document';
import { 
  subscribeToDocuments, 
  getDocument, 
  toggleShareDocument 
} from '@/services/documentService';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { UploadFileDialog } from '@/components/documents/UploadFileDialog';
import { CreateFolderDialog } from '@/components/documents/CreateFolderDialog';
import { DeleteDocumentDialog } from '@/components/documents/DeleteDocumentDialog';
import { RenameDocumentDialog } from '@/components/documents/RenameDocumentDialog';
import { toast } from '@/hooks/use-toast';

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
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

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

  const handleDownload = (doc: Document) => {
    if (doc.downloadUrl) {
      const link = document.createElement('a');
      link.href = doc.downloadUrl;
      link.download = doc.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRename = (doc: Document) => {
    setSelectedDocument(doc);
    setRenameDialogOpen(true);
  };

  const handleDelete = (doc: Document) => {
    setSelectedDocument(doc);
    setDeleteDialogOpen(true);
  };

  const handleToggleShare = async (doc: Document) => {
    try {
      await toggleShareDocument(doc.id, !doc.shared);
      toast({
        title: 'Success',
        description: doc.shared ? 'Document is now private' : 'Document is now shared',
      });
    } catch (error) {
      console.error('Error toggling share:', error);
      toast({
        title: 'Error',
        description: 'Failed to update sharing settings',
        variant: 'destructive',
      });
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
                      onOpen={navigateToFolder}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onToggleShare={handleToggleShare}
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
                      onDownload={handleDownload}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onToggleShare={handleToggleShare}
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
    </DashboardLayout>
  );
}