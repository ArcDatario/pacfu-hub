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
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Election, ElectionPosition, Vote, CreateElectionData, ElectionWithVotes } from '@/types/election';

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

// Convert Date to Firestore timestamp
const toTimestamp = (value: Date | string): Timestamp => {
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  if (typeof value === 'string') {
    return Timestamp.fromDate(new Date(value));
  }
  return Timestamp.now();
};

// Get election status based on dates
const getElectionStatus = (startDate: Date, endDate: Date): 'active' | 'upcoming' | 'ended' => {
  const now = new Date();
  if (now < startDate) return 'upcoming';
  if (now > endDate) return 'ended';
  return 'active';
};

// Create a new election
export const createElection = async (data: CreateElectionData, createdBy: string): Promise<string | null> => {
  try {
    const electionsRef = collection(db, 'elections');
    
    const positions: ElectionPosition[] = data.positions.map((pos, index) => ({
      id: `pos_${Date.now()}_${index}`,
      title: pos.title,
      numberOfWinners: pos.numberOfWinners,
      candidateIds: pos.candidateIds,
    }));

    const electionData = {
      title: data.title,
      description: data.description,
      startDate: toTimestamp(data.startDate),
      endDate: toTimestamp(data.endDate),
      status: getElectionStatus(data.startDate, data.endDate),
      positions,
      createdAt: Timestamp.now(),
      createdBy,
    };

    const docRef = await addDoc(electionsRef, electionData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating election:', error);
    return null;
  }
};

// Get all elections
export const getAllElections = async (): Promise<Election[]> => {
  try {
    const electionsRef = collection(db, 'elections');
    const q = query(electionsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const startDate = toDate(data.startDate);
      const endDate = toDate(data.endDate);
      
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        startDate,
        endDate,
        status: getElectionStatus(startDate, endDate),
        positions: data.positions || [],
        createdAt: toDate(data.createdAt),
        createdBy: data.createdBy,
      } as Election;
    });
  } catch (error) {
    console.error('Error fetching elections:', error);
    return [];
  }
};

// Get election by ID
export const getElectionById = async (electionId: string): Promise<Election | null> => {
  try {
    const electionRef = doc(db, 'elections', electionId);
    const electionSnap = await getDoc(electionRef);

    if (!electionSnap.exists()) {
      return null;
    }

    const data = electionSnap.data();
    const startDate = toDate(data.startDate);
    const endDate = toDate(data.endDate);

    return {
      id: electionSnap.id,
      title: data.title,
      description: data.description,
      startDate,
      endDate,
      status: getElectionStatus(startDate, endDate),
      positions: data.positions || [],
      createdAt: toDate(data.createdAt),
      createdBy: data.createdBy,
    } as Election;
  } catch (error) {
    console.error('Error fetching election:', error);
    return null;
  }
};

// Subscribe to elections with real-time updates
export const subscribeElections = (
  callback: (elections: Election[]) => void
): (() => void) => {
  const electionsRef = collection(db, 'elections');
  const q = query(electionsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const elections = snapshot.docs.map((doc) => {
      const data = doc.data();
      const startDate = toDate(data.startDate);
      const endDate = toDate(data.endDate);

      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        startDate,
        endDate,
        status: getElectionStatus(startDate, endDate),
        positions: data.positions || [],
        createdAt: toDate(data.createdAt),
        createdBy: data.createdBy,
      } as Election;
    });
    callback(elections);
  });
};

// Get votes for an election
export const getElectionVotes = async (electionId: string): Promise<Vote[]> => {
  try {
    const votesRef = collection(db, 'votes');
    const q = query(
      votesRef,
      where('electionId', '==', electionId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        electionId: data.electionId,
        userId: data.userId,
        positionId: data.positionId,
        candidateId: data.candidateId,
        timestamp: toDate(data.timestamp),
      } as Vote;
    });
  } catch (error: any) {
    // If error is about missing index, try without orderBy
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      console.warn('Composite index may not exist. Using simple query. Create index: votes(electionId, timestamp)');
      try {
        const votesRef = collection(db, 'votes');
        const q = query(votesRef, where('electionId', '==', electionId));
        const snapshot = await getDocs(q);
        
        const votes = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            electionId: data.electionId,
            userId: data.userId,
            positionId: data.positionId,
            candidateId: data.candidateId,
            timestamp: toDate(data.timestamp),
          } as Vote;
        });

        // Sort manually
        return votes.sort((a, b) => {
          const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
          const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
          return bTime - aTime;
        });
      } catch (fallbackError) {
        console.error('Error fetching votes (fallback):', fallbackError);
        return [];
      }
    }
    console.error('Error fetching votes:', error);
    return [];
  }
};

// Subscribe to votes for real-time updates
export const subscribeElectionVotes = (
  electionId: string,
  callback: (votes: Vote[]) => void
): (() => void) => {
  const votesRef = collection(db, 'votes');
  
  // Use simple query to avoid index requirement
  // Note: For better performance, create a composite index: votes(electionId, timestamp)
  const q = query(votesRef, where('electionId', '==', electionId));

  return onSnapshot(
    q,
    (snapshot) => {
      const votes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          electionId: data.electionId,
          userId: data.userId,
          positionId: data.positionId,
          candidateId: data.candidateId,
          timestamp: toDate(data.timestamp),
        } as Vote;
      });

      // Sort manually by timestamp (descending)
      const sortedVotes = votes.sort((a, b) => {
        const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
        const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
        return bTime - aTime;
      });
      
      callback(sortedVotes);
    },
    (error) => {
      console.error('Error in vote subscription:', error);
      callback([]);
    }
  );
};

// Check if user has voted in an election
export const hasUserVoted = async (electionId: string, userId: string): Promise<boolean> => {
  try {
    const votesRef = collection(db, 'votes');
    const q = query(
      votesRef,
      where('electionId', '==', electionId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking vote:', error);
    return false;
  }
};

// Cast votes for an election (one vote per position)
export const castVotes = async (
  electionId: string,
  userId: string,
  votes: { positionId: string; candidateId: string }[]
): Promise<boolean> => {
  try {
    // Check if user already voted
    const alreadyVoted = await hasUserVoted(electionId, userId);
    if (alreadyVoted) {
      throw new Error('You have already voted in this election');
    }

    // Use batch write for atomicity
    const batch = writeBatch(db);
    const votesRef = collection(db, 'votes');

    votes.forEach((vote) => {
      const voteRef = doc(votesRef);
      batch.set(voteRef, {
        electionId,
        userId,
        positionId: vote.positionId,
        candidateId: vote.candidateId,
        timestamp: Timestamp.now(),
      });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error casting votes:', error);
    throw error;
  }
};

// Calculate vote counts for an election
export const calculateVoteCounts = (votes: Vote[]): Record<string, Record<string, number>> => {
  const counts: Record<string, Record<string, number>> = {};

  votes.forEach((vote) => {
    if (!counts[vote.positionId]) {
      counts[vote.positionId] = {};
    }
    if (!counts[vote.positionId][vote.candidateId]) {
      counts[vote.positionId][vote.candidateId] = 0;
    }
    counts[vote.positionId][vote.candidateId]++;
  });

  return counts;
};

// Calculate winners for each position
export const calculateWinners = (
  positions: ElectionPosition[],
  voteCounts: Record<string, Record<string, number>>
): Record<string, string[]> => {
  const winners: Record<string, string[]> = {};

  positions.forEach((position) => {
    const counts = voteCounts[position.id] || {};
    const sortedCandidates = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, position.numberOfWinners)
      .map(([candidateId]) => candidateId);

    winners[position.id] = sortedCandidates;
  });

  return winners;
};

// Get election with votes and statistics
export const getElectionWithVotes = async (
  electionId: string,
  userId?: string
): Promise<ElectionWithVotes | null> => {
  try {
    const election = await getElectionById(electionId);
    if (!election) return null;

    const votes = await getElectionVotes(electionId);
    const voteCounts = calculateVoteCounts(votes);
    const winners = calculateWinners(election.positions, voteCounts);

    let hasVoted = false;
    if (userId) {
      hasVoted = await hasUserVoted(electionId, userId);
    }

    // Get total eligible voters (all active faculty)
    const { getAllFaculty } = await import('./facultyService');
    const faculty = await getAllFaculty();
    const totalVoters = faculty.filter((f) => f.isActive).length;

    return {
      ...election,
      votes,
      hasVoted,
      voteCounts,
      winners,
      totalVoters,
    };
  } catch (error) {
    console.error('Error getting election with votes:', error);
    return null;
  }
};

// Update election status (called periodically or on date changes)
export const updateElectionStatus = async (electionId: string): Promise<void> => {
  try {
    const election = await getElectionById(electionId);
    if (!election) return;

    const newStatus = getElectionStatus(
      election.startDate instanceof Date ? election.startDate : new Date(election.startDate),
      election.endDate instanceof Date ? election.endDate : new Date(election.endDate)
    );

    if (newStatus !== election.status) {
      const electionRef = doc(db, 'elections', electionId);
      await updateDoc(electionRef, { status: newStatus });
    }
  } catch (error) {
    console.error('Error updating election status:', error);
  }
};

// End election manually (admin only)
export const endElection = async (electionId: string): Promise<boolean> => {
  try {
    const election = await getElectionById(electionId);
    if (!election) return false;

    const electionRef = doc(db, 'elections', electionId);
    await updateDoc(electionRef, { 
      status: 'ended',
      endedAt: Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.error('Error ending election:', error);
    return false;
  }
};
