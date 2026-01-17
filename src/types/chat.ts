export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  readBy: string[];
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name: string;
  description?: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage?: string;
  lastMessageTime?: Date;
  lastMessageSenderId?: string;
  createdAt: Date;
  createdBy: string;
  avatar?: string;
  unreadCount?: Record<string, number>;
}

export interface DirectChat extends Chat {
  type: 'direct';
}

export interface GroupChat extends Chat {
  type: 'group';
  admins: string[];
}
