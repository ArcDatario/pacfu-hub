import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Megaphone, 
  MessageSquare, 
  FileUp, 
  BarChart3, 
  Vote,
  Users
} from 'lucide-react';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  adminOnly?: boolean;
}

const quickActions: QuickAction[] = [
  {
    label: 'Announcement',
    href: '/announcements',
    icon: Megaphone,
    description: 'Post an announcement',
    adminOnly: true,
  },
  {
    label: 'Create Poll',
    href: '/polls',
    icon: BarChart3,
    description: 'Start a new poll',
    adminOnly: true,
  },
  {
    label: 'Document',
    href: '/documents',
    icon: FileUp,
    description: 'Submit files',
  },
  {
    label: 'Chats',
    href: '/messages',
    icon: MessageSquare,
    description: 'Messages',
  },
  {
    label: 'Elections',
    href: '/elections',
    icon: Vote,
    description: 'Create Eelection',
  },
  {
    label: 'Manage Faculty',
    href: '/faculty',
    icon: Users,
    description: 'View members',
    adminOnly: true,
  },
];

export function QuickActions() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const filteredActions = quickActions.filter(action => !action.adminOnly || isAdmin);

  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <h3 className="font-display text-lg font-semibold text-card-foreground mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {filteredActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} to={action.href}>
              <Button
                variant="outline"
                className="h-auto w-full flex-col items-start gap-2 p-4 hover:border-accent hover:bg-accent/5"
              >
                <Icon className="h-5 w-5 text-accent" />
                <div className="text-left">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
