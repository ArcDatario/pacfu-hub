import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Megaphone, 
  BarChart3, 
  Vote, 
  FileText, 
  DollarSign,
  Settings,
  LogOut,
  FolderOpen,
  Edit2
} from 'lucide-react';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Documents', href: '/documents', icon: FolderOpen },
  { label: 'Polls & Surveys', href: '/polls', icon: BarChart3 },
  { label: 'Elections', href: '/elections', icon: Vote },
  { label: 'Faculty Members', href: '/faculty', icon: Users, adminOnly: true },
  { label: 'Financial Records', href: '/finance', icon: DollarSign, adminOnly: true },
  { label: 'Reports', href: '/reports', icon: FileText, adminOnly: true },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [showEditProfile, setShowEditProfile] = useState(false);

  const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <span className="font-display text-lg font-bold text-accent-foreground">P</span>
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-sidebar-foreground">PACFU</h1>
              <p className="text-xs text-sidebar-foreground/60">PSAU Portal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {filteredItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? 'sidebar-active' : 'sidebar'}
                    className={cn(
                      'w-full justify-start gap-3 px-3',
                      isActive && 'border-l-2 border-accent rounded-l-none'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-sidebar-border p-4">
            <div className="mb-3 flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent overflow-hidden">
                {user?.avatar ? (
                  <img 
                    key={user.avatar} // Force re-render when avatar changes
                    src={user.avatar} 
                    alt={user.name} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-sidebar-accent-foreground">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60 capitalize">
                  {user?.role}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={() => setShowEditProfile(true)}
                title="Edit Profile"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="sidebar"
                size="sm"
                onClick={logout}
                className="group gap-2 bg-transparent text-white hover:bg-transparent"
              >
                <LogOut className="h-4 w-4 text-red-400 group-hover:text-red-500" />
                <span className="group-hover:text-red-400">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Edit Profile Dialog */}
      <EditProfileDialog open={showEditProfile} onOpenChange={setShowEditProfile} />
    </>
  );
}