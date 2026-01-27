// In documentService.ts, find uploadFile function and update:



// Also update deleteDocument function:
export const deleteDocument = async (document: Document): Promise<void> => {
  if (document.type === 'folder') {
    const childrenQuery = query(
      collection(db, COLLECTION_NAME),
      where('parentId', '==', document.id)
    );
    const childrenSnapshot = await getDocs(childrenQuery);
    
    for (const childDoc of childrenSnapshot.docs) {
      const childData = childDoc.data();
      await deleteDocument({
        ...childData,
        id: childDoc.id,
        createdAt: childData.createdAt?.toDate() || new Date(),
        updatedAt: childData.updatedAt?.toDate() || new Date(),
      } as Document);
    }
  }

  if (document.storagePath) {
    try {
      // CHANGE THIS LINE - use full URL
      await fetch('http://localhost:3001/api/delete-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath: document.storagePath }),
      });
    } catch (error) {
      console.error('Error deleting file from storage:', error);
    }
  }

  await deleteDoc(doc(db, COLLECTION_NAME, document.id));
};