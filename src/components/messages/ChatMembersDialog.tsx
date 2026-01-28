import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, Crown, User } from 'lucide-react';
import { Chat } from '@/types/chat';

interface ChatMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: Chat;
  currentUserId?: string;
  userAvatars: Record<string, string>;
}

export function ChatMembersDialog({
  open,
  onOpenChange,
  chat,
  currentUserId,
  userAvatars,
}: ChatMembersDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const members = chat.participants.map(id => ({
    id,
    name: chat.participantNames?.[id] || 'Unknown',
    avatar: userAvatars[id] || null,
    isCreator: chat.createdBy === id,
    isCurrentUser: id === currentUserId,
  }));

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Chat Members ({members.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {filteredMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    {member.avatar ? (
                      <AvatarImage src={member.avatar} alt={member.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {member.name}
                      </span>
                      {member.isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    {member.isCreator && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Crown className="h-3 w-3 text-amber-500" />
                        <span>Creator</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No members found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
