import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Users, MessageSquare, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupChat {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatar: string;
}

const groupChats: GroupChat[] = [
  {
    id: '1',
    name: 'Research Committee',
    description: 'Discussions on research initiatives and publications',
    memberCount: 15,
    lastMessage: 'The next deadline is on the 20th',
    lastMessageTime: '5m ago',
    unreadCount: 3,
    avatar: 'R',
  },
  {
    id: '2',
    name: 'College of Engineering',
    description: 'Engineering department faculty group',
    memberCount: 28,
    lastMessage: 'Meeting rescheduled to 3 PM',
    lastMessageTime: '1h ago',
    unreadCount: 0,
    avatar: 'E',
  },
  {
    id: '3',
    name: 'Curriculum Committee',
    description: 'Curriculum development and review',
    memberCount: 12,
    lastMessage: 'Please review the updated syllabus',
    lastMessageTime: '2h ago',
    unreadCount: 1,
    avatar: 'C',
  },
  {
    id: '4',
    name: 'PACFU Officers',
    description: 'Official channel for PACFU officers',
    memberCount: 8,
    lastMessage: 'Budget proposal attached',
    lastMessageTime: '3h ago',
    unreadCount: 5,
    avatar: 'P',
  },
  {
    id: '5',
    name: 'Faculty Development',
    description: 'Professional development opportunities',
    memberCount: 45,
    lastMessage: 'Workshop registration is now open',
    lastMessageTime: '1d ago',
    unreadCount: 0,
    avatar: 'F',
  },
];

export default function GroupChats() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);

  const filteredChats = groupChats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-7rem)] gap-6">
        {/* Chat List */}
        <div className="w-80 flex-shrink-0 flex flex-col rounded-xl bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Group Chats</h2>
              {isAdmin && (
                <Button variant="ghost" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={cn(
                  "w-full p-4 text-left transition-colors hover:bg-muted/50 border-b",
                  selectedChat?.id === chat.id && "bg-muted"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                    {chat.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-card-foreground truncate">
                        {chat.name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {chat.lastMessageTime}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {chat.memberCount}
                      </span>
                      {chat.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground px-1.5">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col rounded-xl bg-card shadow-card overflow-hidden">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                    {selectedChat.avatar}
                  </div>
                  <div>
                    <h3 className="font-medium text-card-foreground">
                      {selectedChat.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedChat.memberCount} members
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto bg-muted/30">
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Select a conversation to start messaging
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Messages will appear here
                  </p>
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button>Send</Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-card-foreground mb-2">
                Select a Group Chat
              </h3>
              <p className="text-muted-foreground max-w-sm">
                Choose a group from the list to start messaging with your colleagues.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
