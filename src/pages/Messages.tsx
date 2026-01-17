import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useFaculty } from '@/contexts/FacultyContext';
import { 
  Plus, 
  Search, 
  Users, 
  MessageSquare, 
  MoreVertical,
  Send,
  User,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  subscribeToChats, 
  subscribeToMessages, 
  sendMessage, 
  createDirectChat 
} from '@/services/chatService';
import { Chat, Message } from '@/types/chat';

export default function Messages() {
  const { user } = useAuth();
  const { facultyMembers } = useFaculty();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [conversations, setConversations] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeChatsRef = useRef<(() => void) | null>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);

  // Subscribe to chats
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    const unsubscribe = subscribeToChats(user.id, (chats) => {
      setConversations(chats);
      setLoadingChats(false);
    });

    unsubscribeChatsRef.current = unsubscribe;
    return () => {
      if (unsubscribeChatsRef.current) {
        unsubscribeChatsRef.current();
      }
    };
  }, [user]);

  // Subscribe to messages when chat is selected
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const unsubscribe = subscribeToMessages(selectedChat.id, (msgs) => {
      setMessages(msgs);
      setLoadingMessages(false);
    });

    unsubscribeMessagesRef.current = unsubscribe;
    return () => {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }
    };
  }, [selectedChat]);

  // Handle deep link to specific user
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId && user && !selectedChat) {
      const member = facultyMembers.find(m => m.id === userId);
      if (member) {
        startNewDirectChat(userId);
      }
    }
  }, [searchParams, facultyMembers, user, selectedChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || !user) return;

    setSendingMessage(true);
    const success = await sendMessage(
      selectedChat.id,
      user.id,
      user.name,
      messageInput.trim()
    );

    if (success) {
      setMessageInput('');
    }
    setSendingMessage(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const availableFaculty = facultyMembers.filter(
    m => m.id !== user?.id && m.isActive
  );

  const startNewDirectChat = async (memberId: string) => {
    const member = facultyMembers.find(m => m.id === memberId);
    if (!member || !user) return;

    // Check if conversation exists
    const existing = conversations.find(
      c => c.type === 'direct' && c.participants.includes(memberId)
    );
    
    if (existing) {
      setSelectedChat(existing);
    } else {
      // Create new direct chat in Firebase
      const chatId = await createDirectChat(user.id, user.name, memberId, member.name);
      if (chatId) {
        // Don't manually add to state - let Firebase subscription handle it
        // Just select the chat and close the dialog
        // The subscription will pick it up automatically
        const newChat: Chat = {
          id: chatId,
          type: 'direct',
          name: member.name,
          participants: [user.id, memberId],
          participantNames: {
            [user.id]: user.name,
            [memberId]: member.name,
          },
          createdBy: user.id,
          createdAt: new Date(),
          avatar: member.name.charAt(0).toUpperCase(),
        };
        setSelectedChat(newChat);
        // Add to conversations state so it appears immediately
        setConversations(prev => {
          // Check if it already exists (in case subscription updates during creation)
          const exists = prev.some(c => c.id === chatId);
          return exists ? prev : [newChat, ...prev];
        });
      }
    }
    setShowNewChat(false);
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-7rem)] gap-6">
        {/* Conversation List */}
        <div className={cn(
          "w-80 flex-shrink-0 flex flex-col rounded-xl bg-card shadow-card overflow-hidden",
          selectedChat && "hidden md:flex"
        )}>
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Messages</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewChat(!showNewChat)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {showNewChat && (
            <div className="p-4 border-b bg-muted/50">
              <p className="text-sm font-medium mb-3">Start new chat with:</p>
              <ScrollArea className="h-40">
                <div className="space-y-1">
                  {availableFaculty.map(member => (
                    <button
                      key={member.id}
                      onClick={() => startNewDirectChat(member.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {member.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.department}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          
          <ScrollArea className="flex-1">
            {loadingChats ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedChat(conv)}
                  className={cn(
                    "w-full p-4 text-left transition-colors hover:bg-muted/50 border-b",
                    selectedChat?.id === conv.id && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full font-medium",
                      conv.type === 'group' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-accent text-accent-foreground"
                    )}>
                      {conv.type === 'group' ? <Users className="h-5 w-5" /> : conv.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-card-foreground truncate">
                          {conv.name}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conv.lastMessageTime)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col rounded-xl bg-card shadow-card overflow-hidden",
          !selectedChat && "hidden md:flex"
        )}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden"
                    onClick={() => setSelectedChat(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full font-medium",
                    selectedChat.type === 'group'
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground"
                  )}>
                    {selectedChat.type === 'group' 
                      ? <Users className="h-5 w-5" /> 
                      : selectedChat.avatar
                    }
                  </div>
                  <div>
                    <h3 className="font-medium text-card-foreground">
                      {selectedChat.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedChat.type === 'group' 
                        ? `${selectedChat.participants.length} members`
                        : 'Direct message'
                      }
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        No messages yet
                      </p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        Start the conversation!
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.senderId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            isOwn ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2",
                            isOwn 
                              ? "bg-primary text-primary-foreground rounded-br-md" 
                              : "bg-muted rounded-bl-md"
                          )}>
                            {!isOwn && selectedChat.type === 'group' && (
                              <p className="text-xs font-medium mb-1 opacity-70">
                                {message.senderName}
                              </p>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p className={cn(
                              "text-xs mt-1",
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sendingMessage}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!messageInput.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-card-foreground mb-2">
                Select a Conversation
              </h3>
              <p className="text-muted-foreground max-w-sm">
                Choose a conversation from the list or start a new chat to message your colleagues.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
