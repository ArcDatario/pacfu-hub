import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Users, MessageSquare, FileText, Vote, Megaphone, DollarSign, CheckSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user } = useAuth();
  const { stats, recentActivity, upcomingEvents, loading } = useDashboardData();
  const isAdmin = user?.role === 'admin';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const adminStats = [
    { title: 'Total Faculty', value: stats.totalFaculty, icon: Users },
    { title: 'Announcements', value: stats.totalAnnouncements, icon: Megaphone },
    { title: 'Documents', value: stats.totalDocuments, icon: FileText },
    { title: 'Active Polls', value: stats.activePolls, icon: Vote },
    { title: 'Active Elections', value: stats.activeElections, icon: CheckSquare },
    { title: 'Total Funds', value: formatCurrency(stats.totalFunds), icon: DollarSign },
  ];

  const facultyStats = [
    { title: 'Unread Messages', value: stats.unreadMessages, icon: MessageSquare, description: 'Across all chats' },
    { title: 'Active Chats', value: stats.activeChats, icon: MessageSquare },
    { title: 'Pending Polls', value: stats.pendingPolls, icon: Vote, description: 'Awaiting your vote' },
    { title: 'Pending Elections', value: stats.pendingElections, icon: CheckSquare, description: 'Cast your vote' },
  ];

  const displayStats = isAdmin ? adminStats : facultyStats;

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
          {loading ? (
            Array.from({ length: isAdmin ? 6 : 4 }).map((_, index) => (
              <div key={index} className="animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
                <Skeleton className="h-[120px] rounded-xl" />
              </div>
            ))
          ) : (
            displayStats.map((stat, index) => (
              <div 
                key={stat.title} 
                className="animate-fade-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <StatCard {...stat} />
              </div>
            ))
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <RecentActivity activities={recentActivity} loading={loading} />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="animate-fade-up" style={{ animationDelay: '0.25s' }}>
              <QuickActions />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <UpcomingEvents events={upcomingEvents} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
