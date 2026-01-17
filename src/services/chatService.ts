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
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Chat, Message } from '@/types/chat';

// Subscribe to user's chats
export const subscribeToChats = (userId: string, callback: (chats: Chat[]) => void): Unsubscribe => {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
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
    callback(chats);
  }, (error) => {
    console.error('Error subscribing to chats:', error);
  });
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
    
    // Create new chat
    const newChat = await addDoc(chatsRef, {
      type: 'direct',
      name: '', // Direct chats use participant names
      participants: [userId1, userId2],
      participantNames: {
        [userId1]: userName1,
        [userId2]: userName2,
      },
      createdBy: userId1,
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      avatar: userName2.charAt(0).toUpperCase(),
    });
    
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
