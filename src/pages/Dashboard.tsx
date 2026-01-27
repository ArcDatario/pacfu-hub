import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { useAuth } from '@/contexts/AuthContext';
import { Users, MessageSquare, FileText, Vote, Megaphone, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const adminStats = [
    { title: 'Total Faculty', value: 124, icon: Users},
    { title: 'Active Chats', value: 18, icon: MessageSquare },
    { title: 'Announcements', value: 45, icon: Megaphone},
    { title: 'Documents', value: 892, icon: FileText },
    { title: 'Active Polls', value: 3, icon: Vote },
    { title: 'Total Funds', value: '₱245,000', icon: DollarSign },
  ];

  const facultyStats = [
    { title: 'My Groups', value: 5, icon: MessageSquare },
    { title: 'Unread Messages', value: 12, icon: MessageSquare, description: 'Across all chats' },
    { title: 'My Documents', value: 34, icon: FileText },
    { title: 'Pending Polls', value: 2, icon: Vote, description: 'Awaiting your vote' },
  ];

  const stats = isAdmin ? adminStats : facultyStats;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {isAdmin ? 'Admin Dashboard' : 'Faculty Dashboard'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, {user?.name}. Here's what's happening today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <div 
              key={stat.title} 
              className="animate-fade-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <StatCard {...stat} />
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <RecentActivity />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="animate-fade-up" style={{ animationDelay: '0.25s' }}>
              <QuickActions />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <UpcomingEvents />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
