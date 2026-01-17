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
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string;
  participants: string[];
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  messages: ChatMessage[];
}

export default function Messages() {
  const { user } = useAuth();
  const { facultyMembers } = useFaculty();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize some demo conversations
  useEffect(() => {
    const demoConversations: Conversation[] = [
      {
        id: 'group-1',
        type: 'group',
        name: 'Research Committee',
        participants: ['1', '2', '3'],
        avatar: 'R',
        lastMessage: 'The next deadline is on the 20th',
        lastMessageTime: new Date(Date.now() - 5 * 60000),
        unreadCount: 3,
        messages: [
          { id: '1', senderId: '3', senderName: 'Dr. Ana Reyes', content: 'Good morning everyone!', timestamp: new Date(Date.now() - 60 * 60000) },
          { id: '2', senderId: '1', senderName: 'Dr. Maria Santos', content: 'Hello! Ready for the meeting?', timestamp: new Date(Date.now() - 55 * 60000) },
          { id: '3', senderId: '3', senderName: 'Dr. Ana Reyes', content: 'The next deadline is on the 20th', timestamp: new Date(Date.now() - 5 * 60000) },
        ],
      },
      {
        id: 'group-2',
        type: 'group',
        name: 'PACFU Officers',
        participants: ['1', '5'],
        avatar: 'P',
        lastMessage: 'Budget proposal attached',
        lastMessageTime: new Date(Date.now() - 3 * 60 * 60000),
        unreadCount: 0,
        messages: [
          { id: '1', senderId: '5', senderName: 'Dr. Elena Cruz', content: 'Budget proposal attached', timestamp: new Date(Date.now() - 3 * 60 * 60000) },
        ],
      },
      {
        id: 'direct-2',
        type: 'direct',
        name: 'Prof. Juan Dela Cruz',
        participants: ['1', '2'],
        avatar: 'J',
        lastMessage: 'Thanks for the update!',
        lastMessageTime: new Date(Date.now() - 2 * 60 * 60000),
        unreadCount: 1,
        messages: [
          { id: '1', senderId: '2', senderName: 'Prof. Juan Dela Cruz', content: 'Hi, do you have the latest report?', timestamp: new Date(Date.now() - 3 * 60 * 60000) },
          { id: '2', senderId: '1', senderName: 'Dr. Maria Santos', content: 'Yes, I\'ll send it over.', timestamp: new Date(Date.now() - 2.5 * 60 * 60000) },
          { id: '3', senderId: '2', senderName: 'Prof. Juan Dela Cruz', content: 'Thanks for the update!', timestamp: new Date(Date.now() - 2 * 60 * 60000) },
        ],
      },
    ];
    setConversations(demoConversations);

    // Check if we should open a direct message
    const userId = searchParams.get('userId');
    if (userId) {
      const member = facultyMembers.find(m => m.id === userId);
      if (member) {
        // Check if conversation exists
        const existing = demoConversations.find(
          c => c.type === 'direct' && c.participants.includes(userId)
        );
        if (existing) {
          setSelectedConversation(existing);
        } else {
          // Create new conversation
          const newConvo: Conversation = {
            id: `direct-${userId}`,
            type: 'direct',
            name: member.name,
            participants: [user?.id || '1', userId],
            avatar: member.name.charAt(0),
            unreadCount: 0,
            messages: [],
          };
          setConversations(prev => [newConvo, ...prev]);
          setSelectedConversation(newConvo);
        }
      }
    }
  }, [searchParams, facultyMembers, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation || !user) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: user.name,
      content: messageInput.trim(),
      timestamp: new Date(),
    };

    setConversations(prev =>
      prev.map(conv =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              lastMessage: newMessage.content,
              lastMessageTime: newMessage.timestamp,
            }
          : conv
      )
    );

    setSelectedConversation(prev =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, newMessage],
            lastMessage: newMessage.content,
            lastMessageTime: newMessage.timestamp,
          }
        : null
    );

    setMessageInput('');
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

  const startNewDirectChat = (memberId: string) => {
    const member = facultyMembers.find(m => m.id === memberId);
    if (!member) return;

    // Check if conversation exists
    const existing = conversations.find(
      c => c.type === 'direct' && c.participants.includes(memberId)
    );
    
    if (existing) {
      setSelectedConversation(existing);
    } else {
      const newConvo: Conversation = {
        id: `direct-${memberId}`,
        type: 'direct',
        name: member.name,
        participants: [user?.id || '1', memberId],
        avatar: member.name.charAt(0),
        unreadCount: 0,
        messages: [],
      };
      setConversations(prev => [newConvo, ...prev]);
      setSelectedConversation(newConvo);
    }
    setShowNewChat(false);
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-7rem)] gap-6">
        {/* Conversation List */}
        <div className={cn(
          "w-80 flex-shrink-0 flex flex-col rounded-xl bg-card shadow-card overflow-hidden",
          selectedConversation && "hidden md:flex"
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
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  "w-full p-4 text-left transition-colors hover:bg-muted/50 border-b",
                  selectedConversation?.id === conv.id && "bg-muted"
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
                    {conv.unreadCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground px-1.5 mt-1">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col rounded-xl bg-card shadow-card overflow-hidden",
          !selectedConversation && "hidden md:flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full font-medium",
                    selectedConversation.type === 'group'
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground"
                  )}>
                    {selectedConversation.type === 'group' 
                      ? <Users className="h-5 w-5" /> 
                      : selectedConversation.avatar
                    }
                  </div>
                  <div>
                    <h3 className="font-medium text-card-foreground">
                      {selectedConversation.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.type === 'group' 
                        ? `${selectedConversation.participants.length} members`
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
                  {selectedConversation.messages.length === 0 ? (
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
                    selectedConversation.messages.map((message) => {
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
                            {!isOwn && selectedConversation.type === 'group' && (
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
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                    <Send className="h-4 w-4" />
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
