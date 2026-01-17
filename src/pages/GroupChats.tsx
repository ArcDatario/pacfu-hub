import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useFaculty } from '@/contexts/FacultyContext';
import { Plus, Search, Users, MessageSquare, MoreVertical, Loader2, ArrowLeft, Edit2, Trash2, X, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  subscribeToGroupChats,
  subscribeToChats,
  subscribeToMessages, 
  sendMessage, 
  createGroupChat,
  updateGroupChat,
  deleteGroupChat,
  addMembersToGroup,
  removeMemberFromGroup
} from '@/services/chatService';
import { Chat, Message } from '@/types/chat';

export default function GroupChats() {
  const { user } = useAuth();
  const { facultyMembers } = useFaculty();
  const isAdmin = user?.role === 'admin';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [groupChats, setGroupChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingChat, setEditingChat] = useState<Chat | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editingMembers, setEditingMembers] = useState<string[]>([]);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [showTableView, setShowTableView] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeChatsRef = useRef<(() => void) | null>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);

  // Subscribe to group chats (admin sees all, faculty sees only assigned)
  useEffect(() => {
    if (!user) {
      setGroupChats([]);
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);

    if (isAdmin) {
      // Admin sees all group chats
      const unsubscribe = subscribeToGroupChats((chats) => {
        setGroupChats(chats);
        setLoadingChats(false);
      });
      unsubscribeChatsRef.current = unsubscribe;
    } else {
      // Faculty only sees groups they are assigned to
      const unsubscribe = subscribeToChats(user.id, (chats) => {
        // Filter to only group chats
        const groupChats = chats.filter(chat => chat.type === 'group');
        setGroupChats(groupChats);
        setLoadingChats(false);
      });
      unsubscribeChatsRef.current = unsubscribe;
    }

    return () => {
      if (unsubscribeChatsRef.current) {
        unsubscribeChatsRef.current();
      }
    };
  }, [user, isAdmin]);

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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredChats = groupChats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return;

    setCreatingGroup(true);
    try {
      const participantNames = selectedMembers.reduce((acc, memberId) => {
        const member = facultyMembers.find(m => m.id === memberId);
        if (member) {
          acc[memberId] = member.name;
        }
        return acc;
      }, {} as Record<string, string>);

      const chatId = await createGroupChat(
        newGroupName,
        newGroupDescription,
        user.id,
        user.name,
        selectedMembers,
        participantNames
      );

      if (chatId) {
        setNewGroupName('');
        setNewGroupDescription('');
        setSelectedMembers([]);
        setShowCreateDialog(false);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
    setCreatingGroup(false);
  };

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

  const handleOpenEdit = (chat: Chat) => {
    setEditingChat(chat);
    setEditGroupName(chat.name);
    setEditGroupDescription(chat.description || '');
    setEditingMembers(chat.participants);
    setShowEditDialog(true);
  };

  const handleUpdateGroup = async () => {
    if (!editingChat) return;

    setUpdatingGroup(true);
    try {
      // Update group basic info
      const updated = await updateGroupChat(
        editingChat.id,
        editGroupName,
        editGroupDescription
      );

      if (updated) {
        // Add new members
        const newMembers = editingMembers.filter(
          id => !editingChat.participants.includes(id)
        );
        
        if (newMembers.length > 0) {
          const memberNames = facultyMembers
            .filter(m => newMembers.includes(m.id))
            .reduce((acc, m) => {
              acc[m.id] = m.name;
              return acc;
            }, {} as Record<string, string>);

          await addMembersToGroup(editingChat.id, newMembers, memberNames);
        }

        // Remove members
        const removedMembers = editingChat.participants.filter(
          id => !editingMembers.includes(id) && id !== editingChat.createdBy
        );
        
        for (const memberId of removedMembers) {
          await removeMemberFromGroup(editingChat.id, memberId);
        }

        setShowEditDialog(false);
        setEditingChat(null);
      }
    } catch (error) {
      console.error('Error updating group:', error);
    }
    setUpdatingGroup(false);
  };

  const handleDeleteGroup = async (chatId: string) => {
    if (!window.confirm('Are you sure you want to delete this group chat? This action cannot be undone.')) {
      return;
    }

    setDeletingGroupId(chatId);
    try {
      const deleted = await deleteGroupChat(chatId);
      if (deleted && selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
    setDeletingGroupId(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Group Chats</h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin ? 'Manage and view all group chats' : 'Your assigned group conversations'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={showTableView ? "default" : "outline"}
              onClick={() => setShowTableView(true)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Table View
            </Button>
            <Button
              variant={!showTableView ? "default" : "outline"}
              onClick={() => setShowTableView(false)}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Chat View
            </Button>
          </div>
        </div>

        {/* Table View */}
        {showTableView ? (
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {isAdmin && (
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="ml-4 gap-2">
                      <Plus className="h-4 w-4" />
                      Create Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Group Chat</DialogTitle>
                      <DialogDescription>Create a new group chat with selected members</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="group-name">Group Name</Label>
                        <Input
                          id="group-name"
                          placeholder="e.g., Research Committee"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="group-desc">Description (Optional)</Label>
                        <Input
                          id="group-desc"
                          placeholder="e.g., Discussions on research"
                          value={newGroupDescription}
                          onChange={(e) => setNewGroupDescription(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="mb-3 block">Select Members</Label>
                        <ScrollArea className="h-48 border rounded-lg p-4">
                          <div className="space-y-2">
                            {facultyMembers
                              .filter(m => m.isActive)
                              .map(member => (
                                <div key={member.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`member-${member.id}`}
                                    checked={selectedMembers.includes(member.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedMembers([...selectedMembers, member.id]);
                                      } else {
                                        setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`member-${member.id}`}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {member.name}
                                  </label>
                                </div>
                              ))}
                          </div>
                        </ScrollArea>
                      </div>
                      <Button
                        onClick={handleCreateGroup}
                        disabled={!newGroupName.trim() || selectedMembers.length === 0 || creatingGroup}
                        className="w-full"
                      >
                        {creatingGroup ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          'Create Group'
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Last Message</TableHead>
                    <TableHead>Updated</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingChats ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8">
                        <div className="flex justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : groupChats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                        No group chats yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupChats
                      .filter(chat =>
                        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(chat => (
                        <TableRow key={chat.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <button
                              onClick={() => {
                                setSelectedChat(chat);
                                setShowTableView(false);
                              }}
                              className="text-primary hover:underline"
                            >
                              {chat.avatar} {chat.name}
                            </button>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {chat.description || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span className="text-sm">{chat.participants.length}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-xs truncate">
                            {chat.lastMessage || 'No messages yet'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatTime(chat.lastMessageTime)}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEdit(chat)}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                  title="Edit group"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteGroup(chat.id)}
                                  disabled={deletingGroupId === chat.id}
                                  className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                                  title="Delete group"
                                >
                                  {deletingGroupId === chat.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>

            {isAdmin && (
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Group Chat</DialogTitle>
                    <DialogDescription>Update group name, description, and members</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-group-name">Group Name</Label>
                      <Input
                        id="edit-group-name"
                        placeholder="e.g., Research Committee"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-group-desc">Description</Label>
                      <Input
                        id="edit-group-desc"
                        placeholder="e.g., Discussions on research"
                        value={editGroupDescription}
                        onChange={(e) => setEditGroupDescription(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="mb-3 block">Members</Label>
                      <ScrollArea className="h-48 border rounded-lg p-4">
                        <div className="space-y-2">
                          {facultyMembers
                            .filter(m => m.isActive)
                            .map(member => (
                              <div key={member.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`edit-member-${member.id}`}
                                  checked={editingMembers.includes(member.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setEditingMembers([...editingMembers, member.id]);
                                    } else {
                                      setEditingMembers(
                                        editingMembers.filter(id => id !== member.id)
                                      );
                                    }
                                  }}
                                  disabled={member.id === editingChat?.createdBy}
                                />
                                <label
                                  htmlFor={`edit-member-${member.id}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {member.name}
                                  {member.id === editingChat?.createdBy && (
                                    <span className="text-xs text-muted-foreground ml-2">(Creator)</span>
                                  )}
                                </label>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowEditDialog(false)}
                        disabled={updatingGroup}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdateGroup}
                        disabled={!editGroupName.trim() || updatingGroup}
                        className="flex-1"
                      >
                        {updatingGroup ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Updating...
                          </>
                        ) : (
                          'Update Group'
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : (
          /* Chat View */
          selectedChat ? (
            <div className="rounded-lg border bg-card h-[calc(100vh-10rem)] flex flex-col overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChat(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                    {selectedChat.avatar}
                  </div>
                  <div>
                    <h3 className="font-medium text-card-foreground">{selectedChat.name}</h3>
                    <p className="text-xs text-muted-foreground">{selectedChat.participants.length} members</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(selectedChat)}
                      className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(selectedChat.id)}
                      disabled={deletingGroupId === selectedChat.id}
                      className="p-2 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                    >
                      {deletingGroupId === selectedChat.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
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
                      <p className="text-muted-foreground">No messages yet</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.senderId === user?.id;
                      return (
                        <div key={message.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-4 py-2",
                              isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                            )}
                          >
                            {!isOwn && (
                              <p className="text-xs font-medium mb-1 opacity-70">{message.senderName}</p>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={cn(
                                "text-xs mt-1",
                                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                            >
                              {message.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
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
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-card h-[calc(100vh-10rem)] flex flex-col items-center justify-center text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-xl font-semibold text-card-foreground mb-2">
                Select a Group Chat
              </h3>
              <p className="text-muted-foreground max-w-sm">
                Click on a group from the table to view messages and chat with members.
              </p>
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
