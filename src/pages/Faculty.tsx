import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Mail, 
  Building2,
  UserCheck,
  UserX,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FacultyMember {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  isActive: boolean;
  joinedDate: string;
  groups: string[];
}

const facultyMembers: FacultyMember[] = [
  {
    id: '1',
    name: 'Dr. Maria Santos',
    email: 'maria.santos@psau.edu.ph',
    department: 'College of Arts and Sciences',
    position: 'Professor III',
    isActive: true,
    joinedDate: 'Jan 2020',
    groups: ['Research Committee', 'PACFU Officers'],
  },
  {
    id: '2',
    name: 'Prof. Juan Dela Cruz',
    email: 'juan.delacruz@psau.edu.ph',
    department: 'College of Engineering',
    position: 'Associate Professor',
    isActive: true,
    joinedDate: 'Jun 2019',
    groups: ['Curriculum Committee'],
  },
  {
    id: '3',
    name: 'Dr. Ana Reyes',
    email: 'ana.reyes@psau.edu.ph',
    department: 'College of Business',
    position: 'Professor II',
    isActive: true,
    joinedDate: 'Mar 2021',
    groups: ['Research Committee', 'Faculty Development'],
  },
  {
    id: '4',
    name: 'Prof. Pedro Lim',
    email: 'pedro.lim@psau.edu.ph',
    department: 'College of Agriculture',
    position: 'Assistant Professor',
    isActive: false,
    joinedDate: 'Sep 2022',
    groups: [],
  },
  {
    id: '5',
    name: 'Dr. Elena Cruz',
    email: 'elena.cruz@psau.edu.ph',
    department: 'Graduate Studies',
    position: 'Professor IV',
    isActive: true,
    joinedDate: 'Aug 2018',
    groups: ['Research Committee', 'PACFU Officers', 'Curriculum Committee'],
  },
];

export default function Faculty() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredFaculty = facultyMembers.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterActive === 'all' ||
      (filterActive === 'active' && member.isActive) ||
      (filterActive === 'inactive' && !member.isActive);
    
    return matchesSearch && matchesFilter;
  });

  const activeCount = facultyMembers.filter(m => m.isActive).length;
  const inactiveCount = facultyMembers.filter(m => !m.isActive).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Faculty Members</h1>
            <p className="mt-1 text-muted-foreground">
              Manage faculty accounts and group assignments
            </p>
          </div>
          <Button variant="accent" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Faculty
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Total Faculty</p>
            <p className="text-2xl font-semibold text-card-foreground">{facultyMembers.length}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold text-success">{activeCount}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="text-2xl font-semibold text-muted-foreground">{inactiveCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterActive === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilterActive('all')}
            >
              All
            </Button>
            <Button
              variant={filterActive === 'active' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilterActive('active')}
              className="gap-1"
            >
              <UserCheck className="h-4 w-4" />
              Active
            </Button>
            <Button
              variant={filterActive === 'inactive' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilterActive('inactive')}
              className="gap-1"
            >
              <UserX className="h-4 w-4" />
              Inactive
            </Button>
          </div>
        </div>

        {/* Faculty List */}
        <div className="rounded-xl bg-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Department</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Groups</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Joined</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.map((member) => (
                  <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-card-foreground">{member.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        {member.department}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{member.position}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {member.groups.length > 0 ? (
                          member.groups.slice(0, 2).map((group, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                            >
                              {group}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No groups</span>
                        )}
                        {member.groups.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{member.groups.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        member.isActive 
                          ? "bg-success/10 text-success" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {member.joinedDate}
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredFaculty.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No faculty members found</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
