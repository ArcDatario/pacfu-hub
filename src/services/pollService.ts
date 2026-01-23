import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  Timestamp,
  getDoc,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Poll, PollOption, PollResponse, PollWithResponses, CreatePollData } from '@/types/poll';

// Convert Firestore timestamp to Date
const toDate = (value: any): Date => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  return new Date();
};

// Create a new poll
export const createPoll = async (data: CreatePollData, createdBy: string): Promise<string | null> => {
  try {
    const pollsRef = collection(db, 'polls');

    const options: PollOption[] = data.options.map((label, index) => ({
      id: `opt_${Date.now()}_${index}`,
      label: label.trim(),
    }));

    const pollData = {
      title: data.title.trim(),
      description: data.description.trim(),
      status: 'active',
      options,
      createdAt: Timestamp.now(),
      createdBy,
      allowMultiple: data.allowMultiple,
    };

    const docRef = await addDoc(pollsRef, pollData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating poll:', error);
    return null;
  }
};

// Get all polls
export const getAllPolls = async (): Promise<Poll[]> => {
  try {
    const pollsRef = collection(db, 'polls');
    const q = query(pollsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        status: data.status,
        options: data.options || [],
        createdAt: toDate(data.createdAt),
        createdBy: data.createdBy,
        allowMultiple: data.allowMultiple || false,
      } as Poll;
    });
  } catch (error) {
    console.error('Error fetching polls:', error);
    return [];
  }
};

// Subscribe to polls with real-time updates
export const subscribePolls = (
  callback: (polls: Poll[]) => void
): (() => void) => {
  const pollsRef = collection(db, 'polls');
  const q = query(pollsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const polls = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        status: data.status,
        options: data.options || [],
        createdAt: toDate(data.createdAt),
        createdBy: data.createdBy,
        allowMultiple: data.allowMultiple || false,
      } as Poll;
    });
    callback(polls);
  });
};

// Get poll responses
export const getPollResponses = async (pollId: string): Promise<PollResponse[]> => {
  try {
    const responsesRef = collection(db, 'pollResponses');
    const q = query(responsesRef, where('pollId', '==', pollId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        pollId: data.pollId,
        userId: data.userId,
        selectedOptionIds: data.selectedOptionIds || [],
        timestamp: toDate(data.timestamp),
      } as PollResponse;
    });
  } catch (error) {
    console.error('Error fetching poll responses:', error);
    return [];
  }
};

// Subscribe to poll responses
export const subscribePollResponses = (
  pollId: string,
  callback: (responses: PollResponse[]) => void
): (() => void) => {
  const responsesRef = collection(db, 'pollResponses');
  const q = query(responsesRef, where('pollId', '==', pollId));

  return onSnapshot(
    q,
    (snapshot) => {
      const responses = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          pollId: data.pollId,
          userId: data.userId,
          selectedOptionIds: data.selectedOptionIds || [],
          timestamp: toDate(data.timestamp),
        } as PollResponse;
      });
      callback(responses);
    },
    (error) => {
      console.error('Error in poll responses subscription:', error);
      callback([]);
    }
  );
};

// Check if user has responded to a poll
export const hasUserResponded = async (pollId: string, userId: string): Promise<boolean> => {
  try {
    const responsesRef = collection(db, 'pollResponses');
    const q = query(
      responsesRef,
      where('pollId', '==', pollId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking poll response:', error);
    return false;
  }
};

// Get user's response for a poll
export const getUserResponse = async (pollId: string, userId: string): Promise<PollResponse | null> => {
  try {
    const responsesRef = collection(db, 'pollResponses');
    const q = query(
      responsesRef,
      where('pollId', '==', pollId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      pollId: data.pollId,
      userId: data.userId,
      selectedOptionIds: data.selectedOptionIds || [],
      timestamp: toDate(data.timestamp),
    } as PollResponse;
  } catch (error) {
    console.error('Error getting user response:', error);
    return null;
  }
};

// Submit poll response
export const submitPollResponse = async (
  pollId: string,
  userId: string,
  selectedOptionIds: string[]
): Promise<boolean> => {
  try {
    // Check if user already responded
    const alreadyResponded = await hasUserResponded(pollId, userId);
    if (alreadyResponded) {
      throw new Error('You have already responded to this poll');
    }

    const responsesRef = collection(db, 'pollResponses');
    await addDoc(responsesRef, {
      pollId,
      userId,
      selectedOptionIds,
      timestamp: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error('Error submitting poll response:', error);
    throw error;
  }
};

// Calculate vote counts for a poll
export const calculateVoteCounts = (responses: PollResponse[]): Record<string, number> => {
  const counts: Record<string, number> = {};

  responses.forEach((response) => {
    response.selectedOptionIds.forEach((optionId) => {
      if (!counts[optionId]) {
        counts[optionId] = 0;
      }
      counts[optionId]++;
    });
  });

  return counts;
};

// Get poll with responses and statistics
export const getPollWithResponses = async (
  pollId: string,
  userId?: string
): Promise<PollWithResponses | null> => {
  try {
    const pollRef = doc(db, 'polls', pollId);
    const pollSnap = await getDoc(pollRef);

    if (!pollSnap.exists()) {
      return null;
    }

    const data = pollSnap.data();
    const poll: Poll = {
      id: pollSnap.id,
      title: data.title,
      description: data.description,
      status: data.status,
      options: data.options || [],
      createdAt: toDate(data.createdAt),
      createdBy: data.createdBy,
      allowMultiple: data.allowMultiple || false,
    };

    const responses = await getPollResponses(pollId);
    const voteCounts = calculateVoteCounts(responses);

    let hasVoted = false;
    let userResponse: PollResponse | undefined;
    if (userId) {
      userResponse = (await getUserResponse(pollId, userId)) || undefined;
      hasVoted = !!userResponse;
    }

    return {
      ...poll,
      responses,
      hasVoted,
      voteCounts,
      totalVotes: responses.length,
      userResponse,
    };
  } catch (error) {
    console.error('Error getting poll with responses:', error);
    return null;
  }
};

// End poll (admin only)
export const endPoll = async (pollId: string): Promise<boolean> => {
  try {
    const pollRef = doc(db, 'polls', pollId);
    await updateDoc(pollRef, {
      status: 'ended',
      endedAt: Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.error('Error ending poll:', error);
    return false;
  }
};

// Delete poll and its responses (admin only)
export const deletePoll = async (pollId: string): Promise<boolean> => {
  try {
    const batch = writeBatch(db);

    // Delete all responses first
    const responsesRef = collection(db, 'pollResponses');
    const q = query(responsesRef, where('pollId', '==', pollId));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Delete the poll
    const pollRef = doc(db, 'polls', pollId);
    batch.delete(pollRef);

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error deleting poll:', error);
    return false;
  }
};

// Reactivate poll (admin only)
export const reactivatePoll = async (pollId: string): Promise<boolean> => {
  try {
    const pollRef = doc(db, 'polls', pollId);
    await updateDoc(pollRef, {
      status: 'active',
    });
    return true;
  } catch (error) {
    console.error('Error reactivating poll:', error);
    return false;
  }
};
