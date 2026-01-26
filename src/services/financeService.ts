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
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...record,
    transactionDate: Timestamp.fromDate(record.transactionDate),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateFinancialRecord = async (
  id: string,
  updates: Partial<Omit<FinancialRecord, 'id' | 'createdAt'>>
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: Timestamp.now(),
  };
  
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
