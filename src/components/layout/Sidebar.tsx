import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMobile } from '@/contexts/MobileContext'; // Add this import
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Megaphone, 
  BarChart3, 
  Vote, 
  FileText, 
  DollarSign,
  LogOut,
  FolderOpen,
  Edit2,
  Menu,
  X,
  ClipboardList
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
  { label: 'Registrations', href: '/registrations', icon: ClipboardList, adminOnly: true },
  { label: 'Activity Logs', href: '/logs', icon: FileText, adminOnly: true },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isMobile } = useMobile(); // Use mobile context
  const isAdmin = user?.role === 'admin';
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const handleLinkClick = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = () => {
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-sidebar border-b border-sidebar-border px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-sidebar-foreground"
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1">
                <img 
                  src="/psau-logo.png" 
                  alt="PSAU Logo" 
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h1 className="font-display text-sm font-semibold text-sidebar-foreground">PACFU</h1>
                <p className="text-xs text-sidebar-foreground/60">PSAU Portal</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        </div>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out",
        !isMobile && "translate-x-0", // Always visible on desktop
        isMobile && (isSidebarOpen ? "translate-x-0" : "-translate-x-full") // Toggle on mobile
      )}>
        <div className="flex h-full flex-col pt-16 lg:pt-0">
          {/* Logo - Hidden on mobile since it's in header */}
          {!isMobile && (
            <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1">
                <img 
                  src="/psau-logo.png" 
                  alt="PSAU Logo" 
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h1 className="font-display text-lg font-semibold text-sidebar-foreground">PACFU</h1>
                <p className="text-xs text-sidebar-foreground/60">PSAU Portal</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {filteredItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.href} 
                  to={item.href} 
                  onClick={handleLinkClick}
                  className="block"
                >
                  <Button
                    variant={isActive ? 'sidebar-active' : 'sidebar'}
                    className={cn(
                      'w-full justify-start gap-3 px-3 py-4 lg:py-3',
                      isActive && 'border-l-2 border-accent rounded-l-none',
                      'hover:bg-sidebar-accent/10'
                    )}
                  >
                    <Icon className="h-5 w-5 lg:h-4 lg:w-4" />
                    <span className="text-sm lg:text-base">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* User Section - Hidden on mobile header */}
          {!isMobile && (
            <div className="border-t border-sidebar-border p-4">
              <div className="mb-3 flex items-center gap-3 px-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent overflow-hidden">
                  {user?.avatar ? (
                    <img 
                      key={user.avatar}
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
                  className="group gap-2 bg-transparent text-white hover:bg-transparent w-full"
                >
                  <LogOut className="h-4 w-4 text-red-400 group-hover:text-red-500" />
                  <span className="group-hover:text-red-400">Logout</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={handleOverlayClick}
        />
      )}

      {/* Edit Profile Dialog */}
      <EditProfileDialog open={showEditProfile} onOpenChange={setShowEditProfile} />
    </>
  );
}