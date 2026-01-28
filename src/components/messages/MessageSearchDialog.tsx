import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, Loader2, MessageSquare, X } from 'lucide-react';
import { searchMessagesInChat } from '@/services/messageFileService';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  content: string;
  senderName: string;
  timestamp: Date;
}

interface MessageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  onMessageSelect?: (messageId: string) => void;
}

export function MessageSearchDialog({
  open,
  onOpenChange,
  chatId,
  onMessageSelect,
}: MessageSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !chatId) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const searchResults = await searchMessagesInChat(chatId, searchQuery.trim());
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, chatId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    setHasSearched(false);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-primary/30 text-primary-foreground rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Messages
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search in this conversation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 pr-10"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </div>

          <ScrollArea className="h-[350px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : hasSearched && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                <p>No messages found for "{searchQuery}"</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                {results.map(result => (
                  <button
                    key={result.id}
                    onClick={() => {
                      onMessageSelect?.(result.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border",
                      "hover:bg-muted/50 transition-colors"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{result.senderName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(result.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {highlightText(result.content, searchQuery)}
                    </p>
                  </button>
                ))}
              </div>
            ) : !hasSearched ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Search className="h-12 w-12 mb-4 opacity-50" />
                <p>Enter a search term to find messages</p>
              </div>
            ) : null}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
