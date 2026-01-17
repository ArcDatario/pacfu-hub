import { useState, useEffect, useCallback } from 'react';
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
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Chat, Message } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';

export function useChat() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all chats for the current user
  useEffect(() => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', user.id),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData: Chat[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        chatData.push({
          id: doc.id,
          type: data.type,
          name: data.name,
          description: data.description,
          participants: data.participants,
          participantNames: data.participantNames,
          lastMessage: data.lastMessage,
          lastMessageTime: data.lastMessageTime?.toDate(),
          lastMessageSenderId: data.lastMessageSenderId,
          createdAt: data.createdAt?.toDate(),
          createdBy: data.createdBy,
          avatar: data.avatar,
          unreadCount: data.unreadCount,
        });
      });
      setChats(chatData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching chats:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Create a new group chat
  const createGroupChat = useCallback(async (
    name: string,
    description: string,
    participantIds: string[],
    participantNames: Record<string, string>
  ) => {
    if (!user) throw new Error('User not authenticated');

    const chatData = {
      type: 'group',
      name,
      description,
      participants: [...participantIds, user.id],
      participantNames: { ...participantNames, [user.id]: user.name },
      createdAt: serverTimestamp(),
      createdBy: user.id,
      admins: [user.id],
      avatar: name.charAt(0).toUpperCase(),
      unreadCount: {},
    };

    const docRef = await addDoc(collection(db, 'chats'), chatData);
    return docRef.id;
  }, [user]);

  // Create a direct chat
  const createDirectChat = useCallback(async (
    otherUserId: string,
    otherUserName: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    // Check if direct chat already exists
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('type', '==', 'direct'),
      where('participants', 'array-contains', user.id)
    );

    const snapshot = await getDocs(q);
    let existingChatId: string | null = null;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.participants.includes(otherUserId)) {
        existingChatId = doc.id;
      }
    });

    if (existingChatId) return existingChatId;

    // Create new direct chat
    const chatData = {
      type: 'direct',
      name: '', // For direct chats, name is derived from participant
      participants: [user.id, otherUserId],
      participantNames: { [user.id]: user.name, [otherUserId]: otherUserName },
      createdAt: serverTimestamp(),
      createdBy: user.id,
      unreadCount: {},
    };

    const docRef = await addDoc(collection(db, 'chats'), chatData);
    return docRef.id;
  }, [user]);

  return {
    chats,
    loading,
    createGroupChat,
    createDirectChat,
  };
}

export function useChatMessages(chatId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messageData.push({
          id: doc.id,
          chatId,
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.content,
          timestamp: data.timestamp?.toDate() || new Date(),
          type: data.type || 'text',
          readBy: data.readBy || [],
        });
      });
      setMessages(messageData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, user]);

  const sendMessage = useCallback(async (content: string) => {
    if (!chatId || !user || !content.trim()) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    
    await addDoc(messagesRef, {
      senderId: user.id,
      senderName: user.name,
      content: content.trim(),
      timestamp: serverTimestamp(),
      type: 'text',
      readBy: [user.id],
    });

    // Update the chat's last message
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: content.trim(),
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: user.id,
    });
  }, [chatId, user]);

  return {
    messages,
    loading,
    sendMessage,
  };
}
