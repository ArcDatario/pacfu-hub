import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Users, 
  Vote, 
  BarChart3, 
  DollarSign, 
  Megaphone,
  FolderOpen,
  Search,
  Clock
} from 'lucide-react';
import { ActivityLog, LogCategory } from '@/types/log';
import { subscribeToLogs } from '@/services/logService';
import { format } from 'date-fns';

const categoryConfig: Record<LogCategory, { label: string; icon: React.ElementType; color: string }> = {
  faculty: { label: 'Faculty', icon: Users, color: 'bg-blue-500' },
  election: { label: 'Election', icon: Vote, color: 'bg-purple-500' },
  poll: { label: 'Poll', icon: BarChart3, color: 'bg-green-500' },
  finance: { label: 'Finance', icon: DollarSign, color: 'bg-yellow-500' },
  announcement: { label: 'Announcement', icon: Megaphone, color: 'bg-red-500' },
  document: { label: 'Document', icon: FolderOpen, color: 'bg-cyan-500' },
};

export default function Logs() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else if (user?.role !== 'admin') {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, authLoading, user, navigate]);

  // Subscribe to logs
  useEffect(() => {
    const unsubscribe = subscribeToLogs(
      (fetchedLogs) => {
        setLogs(fetchedLogs);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading logs:', error);
        setIsLoading(false);
      },
      200
    );

    return () => unsubscribe();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.adminName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((groups, log) => {
    const date = format(log.createdAt, 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as Record<string, ActivityLog[]>);

  if (authLoading || !isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Activity Logs</h1>
          <p className="text-muted-foreground">Track all administrative actions in the system</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon;
            const count = logs.filter(log => log.category === key).length;
            return (
              <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCategoryFilter(key)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Activity
              <Badge variant="secondary" className="ml-2">
                {filteredLogs.length} logs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity logs found</p>
                {searchQuery || categoryFilter !== 'all' ? (
                  <p className="text-sm">Try adjusting your filters</p>
                ) : (
                  <p className="text-sm">Actions will be recorded here</p>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                    <div key={date}>
                      <div className="sticky top-0 bg-background py-2 mb-3">
                        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {dateLogs.map((log) => {
                          const config = categoryConfig[log.category];
                          const Icon = config.icon;
                          return (
                            <div
                              key={log.id}
                              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className={`p-2 rounded-lg ${config.color} shrink-0`}>
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {log.action}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(log.createdAt, 'h:mm a')}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground">{log.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  by <span className="font-medium">{log.adminName}</span>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
