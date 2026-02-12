import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Loader2, Camera, User, Eye, EyeOff } from 'lucide-react';
import { 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  updatePassword,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/lib/firebase';
import { Separator } from '@/components/ui/separator';
import { deleteDoc, setDoc, getDoc } from 'firebase/firestore';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { user, refreshUser, login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user && open) {
      setName(user.name);
      setEmail(user.email);
      setAvatar(user.avatar);
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setEmailPassword('');
      setShowEmailPassword(false);
    }
  }, [user, open]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatar(result);
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      toast.error('No authenticated user found');
      return;
    }

    setPasswordLoading(true);

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      toast.success('Password updated successfully');
      
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        toast.error('New password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log in again before changing your password');
      } else {
        toast.error('Failed to update password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !user) {
      toast.error('Please enter your name');
      return;
    }

    if (isAdmin && !email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    const hasNameChange = name !== user.name;
    const hasAvatarChange = avatar !== user.avatar;
    const hasEmailChange = isAdmin && email !== user.email;

    if (!hasNameChange && !hasAvatarChange && !hasEmailChange) {
      toast.info('No changes to save');
      onOpenChange(false);
      return;
    }

    // Validate password is required when email changes
    if (hasEmailChange && emailPassword.length < 6) {
      toast.error('Please enter a password with at least 6 characters for the new email account');
      return;
    }

    setLoading(true);
    
    try {
      if (hasEmailChange) {
        // Use the same UID migration workflow as faculty email update
        const secondaryApp = initializeApp(firebaseConfig, 'admin-email-update-' + Date.now());
        const secondaryAuth = getAuth(secondaryApp);
        
        // Create new auth account with new email
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          email.trim(),
          emailPassword
        );
        
        const newUserId = userCredential.user.uid;
        
        // Sign out from secondary auth and delete the secondary app
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);
        
        // Get old user document data
        const oldUserRef = doc(db, 'users', user.id);
        const oldUserDoc = await getDoc(oldUserRef);
        
        if (oldUserDoc.exists()) {
          const oldUserData = oldUserDoc.data();
          
          // Create new user document with new UID
          const newUserRef = doc(db, 'users', newUserId);
          await setDoc(newUserRef, {
            ...oldUserData,
            email: email.trim(),
            name: hasNameChange ? name.trim() : oldUserData.name,
            avatar: hasAvatarChange ? (avatar || null) : oldUserData.avatar,
          });
          
          // Update all chat participants to use new UID
          const chatsRef = collection(db, 'chats');
          const chatsSnapshot = await getDocs(chatsRef);
          
          for (const chatDoc of chatsSnapshot.docs) {
            const chatData = chatDoc.data();
            
            if (chatData.participants && chatData.participants.includes(user.id)) {
              const newParticipants = chatData.participants.map((p: string) =>
                p === user.id ? newUserId : p
              );
              
              const newParticipantNames = { ...chatData.participantNames };
              const newParticipantAvatars = { ...chatData.participantAvatars };
              
              if (newParticipantNames[user.id]) {
                newParticipantNames[newUserId] = hasNameChange ? name.trim() : newParticipantNames[user.id];
                delete newParticipantNames[user.id];
              }
              
              if (newParticipantAvatars && newParticipantAvatars[user.id]) {
                newParticipantAvatars[newUserId] = hasAvatarChange ? (avatar || null) : newParticipantAvatars[user.id];
                delete newParticipantAvatars[user.id];
              }
              
              await updateDoc(chatDoc.ref, {
                participants: newParticipants,
                participantNames: newParticipantNames,
                participantAvatars: newParticipantAvatars,
              });
            }
          }
          
          // Delete the old user document
          await deleteDoc(oldUserRef);
        }
        
        // Delete the old Firebase Auth account (admin is still signed in)
        const oldAuthUser = auth.currentUser;
        if (oldAuthUser) {
          try {
            await oldAuthUser.delete();
            console.log('Old auth account deleted successfully');
          } catch (deleteError: any) {
            console.error('Error deleting old auth account:', deleteError);
            // If requires recent login, re-authenticate first then delete
            if (deleteError.code === 'auth/requires-recent-login' && emailPassword) {
              try {
                const credential = EmailAuthProvider.credential(oldAuthUser.email!, emailPassword);
                await reauthenticateWithCredential(oldAuthUser, credential);
                await oldAuthUser.delete();
                console.log('Old auth account deleted after re-auth');
              } catch (reAuthError) {
                console.error('Could not delete old auth account after re-auth:', reAuthError);
              }
            }
          }
        }
        
        // Sign in with the new credentials so admin stays logged in
        await login(email.trim(), emailPassword);
        
        toast.success('Profile and login email updated successfully');
        toast.info(`Your new login email is: ${email.trim()}`);
        onOpenChange(false);
      } else {
        // No email change - just update Firestore fields
        const userRef = doc(db, 'users', user.id);
        const updateData: Record<string, any> = {};
        
        if (hasNameChange) updateData.name = name.trim();
        if (hasAvatarChange) updateData.avatar = avatar || null;

        await updateDoc(userRef, updateData);

        // Update participant names/avatars in chats
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('participants', 'array-contains', user.id));
        const chatsSnapshot = await getDocs(q);
        
        for (const chatDoc of chatsSnapshot.docs) {
          const chatData = chatDoc.data();
          const chatUpdateData: Record<string, any> = {};
          
          if (hasNameChange) {
            chatUpdateData.participantNames = {
              ...chatData.participantNames,
              [user.id]: name.trim(),
            };
          }
          if (hasAvatarChange) {
            chatUpdateData.participantAvatars = {
              ...(chatData.participantAvatars || {}),
              [user.id]: avatar || null,
            };
          }
          
          if (Object.keys(chatUpdateData).length > 0) {
            await updateDoc(chatDoc.ref, chatUpdateData);
          }
        }

        await refreshUser();
        toast.success('Profile updated successfully');
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists');
      } else {
        toast.error('Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatar(user.avatar);
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setEmailPassword('');
    setShowEmailPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. Changes will be reflected across the platform.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
                {avatar ? (
                  <img 
                    src={avatar} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Click the camera icon to change your photo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            {isAdmin ? (
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
              />
            ) : (
              <>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </>
            )}
          </div>

          {isAdmin && email !== user?.email && (
            <div className="space-y-2 p-3 bg-accent/50 border border-border rounded-md">
              <Label htmlFor="emailPassword" className="text-foreground">
                New Password (required for new email)
              </Label>
              <div className="relative">
                <Input
                  id="emailPassword"
                  type={showEmailPassword ? 'text' : 'password'}
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Enter password for new account"
                  required
                  minLength={6}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                >
                  {showEmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A new login account will be created with this email and password. You will be automatically signed in with the new credentials.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={user?.role || ''}
              disabled
              className="bg-muted capitalize"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>

        <Separator className="my-4" />

        {/* Password Change Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Change Password</h3>
            <p className="text-xs text-muted-foreground">
              Update your login password
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={passwordLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={passwordLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={passwordLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handlePasswordChange}
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
