import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  Search, 
  FolderOpen, 
  FileText, 
  Image, 
  FileSpreadsheet,
  MoreVertical,
  Download,
  Trash2,
  Grid,
  List,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'doc' | 'image' | 'spreadsheet';
  size?: string;
  modified: string;
  shared: boolean;
}

const documents: Document[] = [
  { id: '1', name: 'Course Syllabi', type: 'folder', modified: 'Jan 15, 2026', shared: false },
  { id: '2', name: 'Research Papers', type: 'folder', modified: 'Jan 14, 2026', shared: true },
  { id: '3', name: 'Faculty Manual 2026.pdf', type: 'pdf', size: '2.4 MB', modified: 'Jan 12, 2026', shared: true },
  { id: '4', name: 'Teaching Schedule.xlsx', type: 'spreadsheet', size: '156 KB', modified: 'Jan 10, 2026', shared: false },
  { id: '5', name: 'Department Photo.jpg', type: 'image', size: '3.2 MB', modified: 'Jan 8, 2026', shared: false },
  { id: '6', name: 'Meeting Minutes Jan 2026.docx', type: 'doc', size: '89 KB', modified: 'Jan 5, 2026', shared: true },
  { id: '7', name: 'Budget Proposal.pdf', type: 'pdf', size: '1.1 MB', modified: 'Jan 3, 2026', shared: false },
  { id: '8', name: 'Forms & Templates', type: 'folder', modified: 'Dec 28, 2025', shared: true },
];

const typeIcons = {
  folder: FolderOpen,
  pdf: FileText,
  doc: FileText,
  image: Image,
  spreadsheet: FileSpreadsheet,
};

const typeColors = {
  folder: 'text-accent',
  pdf: 'text-destructive',
  doc: 'text-primary',
  image: 'text-success',
  spreadsheet: 'text-success',
};

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

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
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              New Folder
            </Button>
            <Button variant="accent" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>
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
                <DocumentCard key={doc.id} doc={doc} viewMode={viewMode} />
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
                <DocumentCard key={doc.id} doc={doc} viewMode={viewMode} />
              ))}
            </div>
          </div>
        )}

        {filteredDocs.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No documents found</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function DocumentCard({ doc, viewMode }: { doc: Document; viewMode: 'grid' | 'list' }) {
  const Icon = typeIcons[doc.type];

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm hover:shadow-card transition-shadow">
        <Icon className={cn("h-8 w-8", typeColors[doc.type])} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-card-foreground truncate">{doc.name}</p>
          <p className="text-xs text-muted-foreground">
            {doc.size ? `${doc.size} • ` : ''}{doc.modified}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {doc.shared && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Shared
            </span>
          )}
          <Button variant="ghost" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-xl bg-card p-4 shadow-card transition-all hover:shadow-card-hover cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <Icon className={cn("h-10 w-10", typeColors[doc.type])} />
        <Button 
          variant="ghost" 
          size="icon" 
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
      <p className="font-medium text-card-foreground truncate mb-1">{doc.name}</p>
      <p className="text-xs text-muted-foreground">
        {doc.size ? `${doc.size} • ` : ''}{doc.modified}
      </p>
      {doc.shared && (
        <span className="inline-block mt-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          Shared
        </span>
      )}
    </div>
  );
}
