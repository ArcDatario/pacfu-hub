import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDocs,
  getDoc,
  Unsubscribe,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Chat, Message } from '@/types/chat';

// Subscribe to user's chats (without orderBy to avoid composite index requirement)
export const subscribeToChats = (userId: string, callback: (chats: Chat[]) => void): Unsubscribe => {
  const chatsRef = collection(db, 'chats');
  // Only filter by participants - sorting done client-side to avoid needing composite index
  const q = query(
    chatsRef,
    where('participants', 'array-contains', userId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        name: data.name,
        description: data.description,
        participants: data.participants,
        participantNames: data.participantNames || {},
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastMessage: data.lastMessage,
        lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
        lastMessageSenderId: data.lastMessageSenderId,
        avatar: data.avatar,
      } as Chat;
    });
    
    // Sort client-side by lastMessageTime (newest first)
    const sortedChats = chats.sort((a, b) => {
      const timeA = a.lastMessageTime?.getTime() || a.createdAt.getTime();
      const timeB = b.lastMessageTime?.getTime() || b.createdAt.getTime();
      return timeB - timeA;
    });
    
    callback(sortedChats);
  }, (error) => {
    console.error('Error subscribing to chats:', error);
    // On error, try to fetch without realtime for fallback
    callback([]);
  });
};

// Delete a direct chat conversation
export const deleteDirectChat = async (chatId: string): Promise<boolean> => {
  try {
    // First delete all messages in the subcollection
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    
    // Delete each message
    const deletePromises = messagesSnapshot.docs.map(messageDoc => 
      deleteDoc(doc(db, 'chats', chatId, 'messages', messageDoc.id))
    );
    await Promise.all(deletePromises);
    
    // Then delete the chat document
    await deleteDoc(doc(db, 'chats', chatId));
    console.log('Deleted chat:', chatId);
    return true;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
};

// Subscribe to messages in a chat
export const subscribeToMessages = (chatId: string, callback: (messages: Message[]) => void): Unsubscribe => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        chatId,
        senderId: data.senderId,
        senderName: data.senderName,
        content: data.content,
        type: data.type || 'text',
        timestamp: data.timestamp?.toDate() || new Date(),
        readBy: data.readBy || [],
      } as Message;
    });
    callback(messages);
  }, (error) => {
    console.error('Error subscribing to messages:', error);
  });
};

// Send a message
export const sendMessage = async (
  chatId: string, 
  senderId: string, 
  senderName: string, 
  content: string
): Promise<boolean> => {
  try {
    // Add message to subcollection
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId,
      senderName,
      content,
      type: 'text',
      timestamp: serverTimestamp(),
      readBy: [senderId],
    });
    
    // Update chat's last message
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: content,
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: senderId,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
};

// Create a direct chat
// In chatService.ts - Update the createDirectChat function:
export const createDirectChat = async (
  userId1: string,
  userName1: string,
  userId2: string,
  userName2: string
): Promise<string | null> => {
  try {
    // Check if chat already exists
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('type', '==', 'direct'),
      where('participants', 'array-contains', userId1)
    );
    const snapshot = await getDocs(q);
    
    const existingChat = snapshot.docs.find(doc => {
      const participants = doc.data().participants;
      return participants.includes(userId2);
    });
    
    if (existingChat) {
      return existingChat.id;
    }
    
    // Create new chat with proper data
    const newChat = await addDoc(chatsRef, {
      type: 'direct',
      name: `${userName1} & ${userName2}`, // Set a display name
      participants: [userId1, userId2],
      participantNames: {
        [userId1]: userName1,
        [userId2]: userName2,
      },
      createdBy: userId1,
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: '',
      avatar: userName2.charAt(0).toUpperCase(),
    });
    
    console.log('Created new direct chat:', newChat.id);
    return newChat.id;
  } catch (error) {
    console.error('Error creating direct chat:', error);
    return null;
  }
};

// Create a group chat
export const createGroupChat = async (
  name: string,
  description: string,
  creatorId: string,
  creatorName: string,
  participants: string[],
  participantNames: Record<string, string>
): Promise<string | null> => {
  try {
    const chatsRef = collection(db, 'chats');
    const allParticipants = [creatorId, ...participants];
    const allParticipantNames = {
      ...participantNames,
      [creatorId]: creatorName,
    };

    const newChat = await addDoc(chatsRef, {
      type: 'group',
      name,
      description,
      participants: allParticipants,
      participantNames: allParticipantNames,
      createdBy: creatorId,
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      avatar: name.charAt(0).toUpperCase(),
    });
    
    return newChat.id;
  } catch (error) {
    console.error('Error creating group chat:', error);
    return null;
  }
};

// Get a single chat
export const getChat = async (chatId: string): Promise<Chat | null> => {
  try {
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) return null;
    
    const data = chatDoc.data();
    return {
      id: chatDoc.id,
      type: data.type,
      name: data.name,
      description: data.description,
      participants: data.participants,
      participantNames: data.participantNames || {},
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastMessage: data.lastMessage,
      lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
      lastMessageSenderId: data.lastMessageSenderId,
      avatar: data.avatar,
    } as Chat;
  } catch (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
};

// Get all group chats
export const getAllGroupChats = async (): Promise<Chat[]> => {
  try {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('type', '==', 'group'),
      orderBy('lastMessageTime', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: 'group',
        name: data.name,
        description: data.description,
        participants: data.participants,
        participantNames: data.participantNames || {},
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastMessage: data.lastMessage,
        lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
        lastMessageSenderId: data.lastMessageSenderId,
        avatar: data.avatar,
      } as Chat;
    });
  } catch (error) {
    console.error('Error fetching group chats:', error);
    return [];
  }
};

// Subscribe to group chats
export const subscribeToGroupChats = (callback: (chats: Chat[]) => void): Unsubscribe => {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('type', '==', 'group'),
    orderBy('lastMessageTime', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: 'group',
        name: data.name,
        description: data.description,
        participants: data.participants,
        participantNames: data.participantNames || {},
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastMessage: data.lastMessage,
        lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
        lastMessageSenderId: data.lastMessageSenderId,
        avatar: data.avatar,
      } as Chat;
    });
    callback(chats);
  }, (error) => {
    console.error('Error subscribing to group chats:', error);
  });
};

// Get all users for chat creation
export const getAllUsers = async (): Promise<{ id: string; name: string; email: string }[]> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      email: doc.data().email,
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// ============ GROUP CHAT CRUD OPERATIONS ============

// Update group chat (admin only)
export const updateGroupChat = async (
  chatId: string,
  name: string,
  description: string
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'chats', chatId), {
      name,
      description,
    });
    return true;
  } catch (error) {
    console.error('Error updating group chat:', error);
    return false;
  }
};

// Add members to group chat (admin only)
export const addMembersToGroup = async (
  chatId: string,
  memberIds: string[],
  memberNames: Record<string, string>
): Promise<boolean> => {
  try {
    // Get current chat data
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) return false;

    const currentParticipants = chatDoc.data().participants || [];
    const currentParticipantNames = chatDoc.data().participantNames || {};

    // Filter out members already in the group
    const newMembers = memberIds.filter(id => !currentParticipants.includes(id));
    
    if (newMembers.length === 0) {
      return true; // All members already in group
    }

    // Add new members
    await updateDoc(doc(db, 'chats', chatId), {
      participants: arrayUnion(...newMembers),
      participantNames: {
        ...currentParticipantNames,
        ...Object.fromEntries(
          newMembers.map(id => [id, memberNames[id] || `User ${id}`])
        ),
      },
    });
    return true;
  } catch (error) {
    console.error('Error adding members to group:', error);
    return false;
  }
};

// Remove member from group chat (admin only)
export const removeMemberFromGroup = async (
  chatId: string,
  memberId: string
): Promise<boolean> => {
  try {
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) return false;

    const currentParticipantNames = chatDoc.data().participantNames || {};
    const newParticipantNames = { ...currentParticipantNames };
    delete newParticipantNames[memberId];

    await updateDoc(doc(db, 'chats', chatId), {
      participants: arrayRemove(memberId),
      participantNames: newParticipantNames,
    });
    return true;
  } catch (error) {
    console.error('Error removing member from group:', error);
    return false;
  }
};

// Delete group chat (admin only)
export const deleteGroupChat = async (chatId: string): Promise<boolean> => {
  try {
    // Delete the chat document
    await deleteDoc(doc(db, 'chats', chatId));
    return true;
  } catch (error) {
    console.error('Error deleting group chat:', error);
    return false;
  }
};
