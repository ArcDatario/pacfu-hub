import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp,
  limit,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ActivityLog, LogCategory } from '@/types/log';

const COLLECTION_NAME = 'activity_logs';

export const subscribeToLogs = (
  callback: (logs: ActivityLog[]) => void,
  onError?: (error: Error) => void,
  limitCount: number = 100
) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const logs: ActivityLog[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          action: data.action,
          category: data.category as LogCategory,
          description: data.description,
          adminId: data.adminId,
          adminName: data.adminName,
          metadata: data.metadata,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });
      callback(logs);
    },
    (error) => {
      console.error('Error fetching logs:', error);
      if (onError) onError(error);
    }
  );
};

export const getLogsByCategory = async (
  category: LogCategory,
  limitCount: number = 50
): Promise<ActivityLog[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      action: data.action,
      category: data.category as LogCategory,
      description: data.description,
      adminId: data.adminId,
      adminName: data.adminName,
      metadata: data.metadata,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
};

export const addLog = async (
  action: string,
  category: LogCategory,
  description: string,
  adminId: string,
  adminName: string,
  metadata?: Record<string, unknown>
): Promise<string> => {
  const docData: Record<string, unknown> = {
    action,
    category,
    description,
    adminId,
    adminName,
    createdAt: Timestamp.now(),
  };

  if (metadata) {
    docData.metadata = metadata;
  }

  const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
  return docRef.id;
};

// Helper functions for specific actions
export const logFacultyAction = async (
  action: 'created' | 'updated' | 'deactivated' | 'reactivated' | 'deleted',
  facultyName: string,
  adminId: string,
  adminName: string,
  metadata?: Record<string, unknown>
) => {
  const descriptions: Record<string, string> = {
    created: `Created new faculty member: ${facultyName}`,
    updated: `Updated faculty member: ${facultyName}`,
    deactivated: `Deactivated faculty member: ${facultyName}`,
    reactivated: `Reactivated faculty member: ${facultyName}`,
    deleted: `Deleted faculty member: ${facultyName}`,
  };

  return addLog(
    `Faculty ${action}`,
    'faculty',
    descriptions[action],
    adminId,
    adminName,
    metadata
  );
};

export const logElectionAction = async (
  action: 'created' | 'started' | 'ended' | 'deleted',
  electionTitle: string,
  adminId: string,
  adminName: string,
  metadata?: Record<string, unknown>
) => {
  const descriptions: Record<string, string> = {
    created: `Created new election: ${electionTitle}`,
    started: `Started election: ${electionTitle}`,
    ended: `Ended election: ${electionTitle}`,
    deleted: `Deleted election: ${electionTitle}`,
  };

  return addLog(
    `Election ${action}`,
    'election',
    descriptions[action],
    adminId,
    adminName,
    metadata
  );
};

export const logPollAction = async (
  action: 'created' | 'ended' | 'reactivated' | 'deleted',
  pollQuestion: string,
  adminId: string,
  adminName: string,
  metadata?: Record<string, unknown>
) => {
  const descriptions: Record<string, string> = {
    created: `Created new poll: ${pollQuestion}`,
    ended: `Ended poll: ${pollQuestion}`,
    reactivated: `Reactivated poll: ${pollQuestion}`,
    deleted: `Deleted poll: ${pollQuestion}`,
  };

  return addLog(
    `Poll ${action}`,
    'poll',
    descriptions[action],
    adminId,
    adminName,
    metadata
  );
};

export const logFinanceAction = async (
  action: 'income_added' | 'expense_added' | 'record_updated' | 'record_deleted',
  description: string,
  amount: number,
  adminId: string,
  adminName: string,
  metadata?: Record<string, unknown>
) => {
  const actionDescriptions: Record<string, string> = {
    income_added: `Added income: ${description} (₱${amount.toLocaleString()})`,
    expense_added: `Added expense: ${description} (₱${amount.toLocaleString()})`,
    record_updated: `Updated financial record: ${description}`,
    record_deleted: `Deleted financial record: ${description}`,
  };

  return addLog(
    action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    'finance',
    actionDescriptions[action],
    adminId,
    adminName,
    { ...metadata, amount }
  );
};

export const logAnnouncementAction = async (
  action: 'created' | 'updated' | 'deleted',
  announcementTitle: string,
  adminId: string,
  adminName: string,
  metadata?: Record<string, unknown>
) => {
  const descriptions: Record<string, string> = {
    created: `Created announcement: ${announcementTitle}`,
    updated: `Updated announcement: ${announcementTitle}`,
    deleted: `Deleted announcement: ${announcementTitle}`,
  };

  return addLog(
    `Announcement ${action}`,
    'announcement',
    descriptions[action],
    adminId,
    adminName,
    metadata
  );
};

export const logDocumentAction = async (
  action: 'uploaded' | 'created_folder' | 'renamed' | 'deleted',
  documentName: string,
  adminId: string,
  adminName: string,
  metadata?: Record<string, unknown>
) => {
  const descriptions: Record<string, string> = {
    uploaded: `Uploaded document: ${documentName}`,
    created_folder: `Created folder: ${documentName}`,
    renamed: `Renamed document: ${documentName}`,
    deleted: `Deleted document: ${documentName}`,
  };

  return addLog(
    `Document ${action.replace('_', ' ')}`,
    'document',
    descriptions[action],
    adminId,
    adminName,
    metadata
  );
};
