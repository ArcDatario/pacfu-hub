import { useState, useEffect, useRef, useCallback } from 'react';
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
  Loader2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  subscribeToChats, 
  subscribeToMessages, 
  sendMessage, 
  createDirectChat,
  getChat,
  deleteDirectChat
} from '@/services/chatService';
import { Chat, Message } from '@/types/chat';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  const [creatingChat, setCreatingChat] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [deletingChat, setDeletingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeChatsRef = useRef<(() => void) | null>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);

  // Check if a user account exists in Firestore
  const checkUserExists = async (userId: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('__name__', '==', userId));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  };

  // Check if the other participant in a direct chat exists
  const isOtherParticipantDeleted = useCallback(async (chat: Chat): Promise<boolean> => {
    if (chat.type !== 'direct' || !user) return false;
    
    const otherParticipantId = chat.participants.find(id => id !== user.id);
    if (!otherParticipantId) return false;
    
    const exists = await checkUserExists(otherParticipantId);
    return !exists;
  }, [user]);

  // Get the display name for a chat
  const getChatDisplayName = useCallback((chat: Chat): string => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    }
    
    // For direct chats, show the other person's name
    if (chat.type === 'direct' && user) {
      // Find the other participant's ID
      const otherParticipantId = chat.participants.find(id => id !== user.id);
      if (otherParticipantId) {
        // Try to get name from participantNames first
        if (chat.participantNames && chat.participantNames[otherParticipantId]) {
          return chat.participantNames[otherParticipantId];
        }
        
        // Fallback: look up in faculty members
        const faculty = facultyMembers.find(m => m.id === otherParticipantId);
        if (faculty) {
          return faculty.name;
        }
      }
      
      return 'Unknown User';
    }
    
    return chat.name || 'Direct Chat';
  }, [user, facultyMembers]);

  // Get avatar for a chat (returns image URL or first letter)
  const getChatAvatar = useCallback((chat: Chat): { type: 'image' | 'text'; value: string } => {
    if (chat.type === 'group') {
      return { type: 'text', value: chat.avatar || chat.name?.charAt(0).toUpperCase() || 'G' };
    }
    
    // For direct chats, use the other person's avatar or first initial
    if (chat.type === 'direct' && user) {
      const otherParticipantId = chat.participants.find(id => id !== user.id);
      if (otherParticipantId) {
        // Check if there's a stored avatar for this participant
        const participantAvatars = (chat as any).participantAvatars;
        if (participantAvatars && participantAvatars[otherParticipantId]) {
          return { type: 'image', value: participantAvatars[otherParticipantId] };
        }
      }
      const displayName = getChatDisplayName(chat);
      return { type: 'text', value: displayName.charAt(0).toUpperCase() };
    }
    
    return { type: 'text', value: chat.avatar || 'U' };
  }, [user, getChatDisplayName]);

  // Subscribe to chats
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    
    const unsubscribe = subscribeToChats(user.id, (chats) => {
      console.log('Received chats from subscription:', chats);
      
      // Sort chats by lastMessageTime (newest first)
      const sortedChats = [...chats].sort((a, b) => {
        const timeA = a.lastMessageTime?.getTime() || a.createdAt.getTime();
        const timeB = b.lastMessageTime?.getTime() || b.createdAt.getTime();
        return timeB - timeA;
      });
      
      setConversations(sortedChats);
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
    getChatDisplayName(conv).toLowerCase().includes(searchQuery.toLowerCase())
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

    // Check if conversation already exists in local state
    const existingChat = conversations.find(chat => 
      chat.type === 'direct' && 
      chat.participants.includes(memberId) && 
      chat.participants.includes(user.id)
    );
    
    if (existingChat) {
      setSelectedChat(existingChat);
      setShowNewChat(false);
      return;
    }

    // Create new direct chat
    setCreatingChat(true);
    
    try {
      const chatId = await createDirectChat(
        user.id,
        user.name,
        memberId,
        member.name
      );
      
      if (chatId) {
        // Immediately fetch the created chat from Firebase
        const newChat = await getChat(chatId);
        
        if (newChat) {
          // Add to conversations list at the top
          setConversations(prev => {
            const exists = prev.some(c => c.id === chatId);
            if (!exists) {
              return [newChat, ...prev];
            }
            return prev;
          });
          
          setSelectedChat(newChat);
        }
      }
    } catch (error) {
      console.error('Error creating direct chat:', error);
    } finally {
      setCreatingChat(false);
      setShowNewChat(false);
    }
  };

  // Handle delete conversation
  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    
    setDeletingChat(true);
    try {
      const success = await deleteDirectChat(chatToDelete.id);
      if (success) {
        toast.success('Conversation deleted');
        // Remove from local state
        setConversations(prev => prev.filter(c => c.id !== chatToDelete.id));
        // Clear selected if it was the deleted one
        if (selectedChat?.id === chatToDelete.id) {
          setSelectedChat(null);
        }
      } else {
        toast.error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete conversation');
    } finally {
      setDeletingChat(false);
      setDeleteDialogOpen(false);
      setChatToDelete(null);
    }
  };

  const openDeleteDialog = (chat: Chat) => {
    setChatToDelete(chat);
    setDeleteDialogOpen(true);
  };

  // Check if current selected chat has deleted participant
  const [isParticipantDeleted, setIsParticipantDeleted] = useState(false);
  
  useEffect(() => {
    const checkDeleted = async () => {
      if (selectedChat && selectedChat.type === 'direct') {
        const deleted = await isOtherParticipantDeleted(selectedChat);
        setIsParticipantDeleted(deleted);
      } else {
        setIsParticipantDeleted(false);
      }
    };
    checkDeleted();
  }, [selectedChat, isOtherParticipantDeleted]);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-7rem)] gap-6">
        {/* Conversation List - LEFT SIDE */}
        <div className={cn(
          "w-80 flex-shrink-0 flex flex-col rounded-xl bg-card shadow-card overflow-hidden",
          selectedChat && "hidden md:flex"
        )}>
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Messages</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowNewChat(!showNewChat)}
                disabled={creatingChat}
              >
                {creatingChat ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
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
                      disabled={creatingChat}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setShowNewChat(true)}
                >
                  Start a conversation
                </Button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const displayName = getChatDisplayName(conv);
                const avatar = getChatAvatar(conv);
                
                return (
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
                        "flex h-10 w-10 items-center justify-center rounded-full font-medium overflow-hidden",
                        conv.type === 'group' 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-accent text-accent-foreground"
                      )}>
                        {conv.type === 'group' ? (
                          <Users className="h-5 w-5" />
                        ) : avatar.type === 'image' ? (
                          <img src={avatar.value} alt="" className="h-full w-full object-cover" />
                        ) : (
                          avatar.value
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-card-foreground truncate">
                            {displayName}
                            {conv.type === 'direct' && (
                              <span className="ml-2 text-xs text-muted-foreground">(Direct)</span>
                            )}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(conv.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* Chat Area - RIGHT SIDE */}
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
                    "flex h-10 w-10 items-center justify-center rounded-full font-medium overflow-hidden",
                    selectedChat.type === 'group'
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground"
                  )}>
                    {selectedChat.type === 'group' ? (
                      <Users className="h-5 w-5" />
                    ) : (() => {
                      const avatar = getChatAvatar(selectedChat);
                      return avatar.type === 'image' ? (
                        <img src={avatar.value} alt="" className="h-full w-full object-cover" />
                      ) : (
                        avatar.value
                      );
                    })()}
                  </div>
                  <div>
                    <h3 className="font-medium text-card-foreground">
                      {selectedChat.type === 'direct' 
                        ? getChatDisplayName(selectedChat)
                        : selectedChat.name
                      }
                      {isParticipantDeleted && (
                        <span className="ml-2 text-xs text-destructive">(Account Deleted)</span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedChat.type === 'group' 
                        ? `${selectedChat.participants.length} members`
                        : isParticipantDeleted 
                          ? 'User account no longer exists'
                          : 'Direct message'
                      }
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border shadow-md">
                    <DropdownMenuItem 
                      onClick={() => openDeleteDialog(selectedChat)}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Deleted Account Warning */}
              {isParticipantDeleted && (
                <Alert variant="destructive" className="m-4 mb-0">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      This user's account has been deleted. You can no longer send messages.
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openDeleteDialog(selectedChat)}
                      className="ml-4 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Delete Conversation
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

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
                      {!isParticipantDeleted && (
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          Start the conversation!
                        </p>
                      )}
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
                    placeholder={isParticipantDeleted ? "Cannot send messages to deleted account" : "Type a message..."}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sendingMessage || isParticipantDeleted}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!messageInput.trim() || sendingMessage || isParticipantDeleted}
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
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowNewChat(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation with{' '}
              <strong>{chatToDelete ? getChatDisplayName(chatToDelete) : ''}</strong>?
              This will permanently delete all messages and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingChat}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteChat}
              disabled={deletingChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingChat ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}