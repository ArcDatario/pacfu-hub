export interface PollOption {
  id: string;
  label: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'ended';
  options: PollOption[];
  createdAt: Date | string;
  createdBy: string;
  allowMultiple: boolean; // Allow selecting multiple options
}

export interface PollResponse {
  id: string;
  pollId: string;
  userId: string;
  selectedOptionIds: string[]; // Array to support multiple selections
  timestamp: Date | string;
}

export interface PollWithResponses extends Poll {
  responses: PollResponse[];
  hasVoted?: boolean;
  voteCounts: Record<string, number>; // optionId -> count
  totalVotes: number;
  userResponse?: PollResponse;
}

export interface CreatePollData {
  title: string;
  description: string;
  options: string[]; // Just the labels
  allowMultiple: boolean;
}
