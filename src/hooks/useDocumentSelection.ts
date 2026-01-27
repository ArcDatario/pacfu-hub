import { useState, useCallback } from 'react';
import { Document } from '@/types/document';

export function useDocumentSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((docId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((documents: Document[]) => {
    setSelectedIds(new Set(documents.map(d => d.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((docId: string) => {
    return selectedIds.has(docId);
  }, [selectedIds]);

  const getSelectedDocuments = useCallback((documents: Document[]) => {
    return documents.filter(d => selectedIds.has(d.id));
  }, [selectedIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    getSelectedDocuments,
  };
}
