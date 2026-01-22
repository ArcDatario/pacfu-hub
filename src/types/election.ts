export interface ElectionPosition {
  id: string;
  title: string;
  numberOfWinners: number;
  candidateIds: string[]; // Array of faculty member IDs
}

export interface Election {
  id: string;
  title: string;
  description: string;
  startDate: Date | string;
  endDate: Date | string;
  status: 'active' | 'upcoming' | 'ended';
  positions: ElectionPosition[];
  createdAt: Date | string;
  createdBy: string; // Admin user ID
  totalVoters?: number;
}

export interface Vote {
  id: string;
  electionId: string;
  userId: string;
  positionId: string;
  candidateId: string;
  timestamp: Date | string;
}

export interface ElectionWithVotes extends Election {
  votes: Vote[];
  hasVoted?: boolean; // For current user
  voteCounts?: Record<string, Record<string, number>>; // positionId -> candidateId -> count
  winners?: Record<string, string[]>; // positionId -> array of winner candidate IDs
}

export interface CreateElectionData {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  positions: Omit<ElectionPosition, 'id'>[];
}
