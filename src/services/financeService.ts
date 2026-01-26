import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  where,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FinancialRecord, TransactionType } from '@/types/finance';

const COLLECTION_NAME = 'financial_records';

export const subscribeToFinancialRecords = (
  callback: (records: FinancialRecord[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('transactionDate', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: FinancialRecord[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type as TransactionType,
          description: data.description,
          amount: data.amount,
          category: data.category,
          transactionDate: data.transactionDate?.toDate() || new Date(),
          referenceNumber: data.referenceNumber,
          recordedBy: data.recordedBy,
          recordedByName: data.recordedByName,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      });
      callback(records);
    },
    (error) => {
      console.error('Error fetching financial records:', error);
      if (onError) onError(error);
    }
  );
};

export const getRecordsByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<FinancialRecord[]> => {
  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  const q = query(
    collection(db, COLLECTION_NAME),
    where('transactionDate', '>=', startTimestamp),
    where('transactionDate', '<=', endTimestamp),
    orderBy('transactionDate', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type as TransactionType,
      description: data.description,
      amount: data.amount,
      category: data.category,
      transactionDate: data.transactionDate?.toDate() || new Date(),
      referenceNumber: data.referenceNumber,
      recordedBy: data.recordedBy,
      recordedByName: data.recordedByName,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
};

export const addFinancialRecord = async (
  record: Omit<FinancialRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  // Build the document data, excluding undefined values (Firestore doesn't accept undefined)
  const docData: Record<string, unknown> = {
    type: record.type,
    description: record.description,
    amount: record.amount,
    category: record.category,
    transactionDate: Timestamp.fromDate(record.transactionDate),
    recordedBy: record.recordedBy,
    recordedByName: record.recordedByName,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  // Only add referenceNumber if it has a value
  if (record.referenceNumber) {
    docData.referenceNumber = record.referenceNumber;
  }
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
  return docRef.id;
};

export const updateFinancialRecord = async (
  id: string,
  updates: Partial<Omit<FinancialRecord, 'id' | 'createdAt'>>
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  
  // Build update data, excluding undefined values
  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };
  
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.recordedBy !== undefined) updateData.recordedBy = updates.recordedBy;
  if (updates.recordedByName !== undefined) updateData.recordedByName = updates.recordedByName;
  
  // Handle referenceNumber - set to null if empty string, otherwise use the value
  if (updates.referenceNumber !== undefined) {
    updateData.referenceNumber = updates.referenceNumber || null;
  }
  
  if (updates.transactionDate) {
    updateData.transactionDate = Timestamp.fromDate(updates.transactionDate);
  }
  
  await updateDoc(docRef, updateData);
};

export const deleteFinancialRecord = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};
