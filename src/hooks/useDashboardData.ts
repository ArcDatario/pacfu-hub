import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalFaculty: number;
  activeChats: number;
  totalAnnouncements: number;
  totalDocuments: number;
  activePolls: number;
  activeElections: number;
  totalFunds: number;
  // Faculty-specific
  myGroups: number;
  unreadMessages: number;
  pendingPolls: number;
  pendingElections: number;
}

interface Activity {
  id: string;
  type: 'announcement' | 'chat' | 'document' | 'poll' | 'election' | 'finance';
  title: string;
  description: string;
  time: Date;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: Date;
  type: 'election' | 'poll' | 'announcement';
}

export function useDashboardData() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalFaculty: 0,
    activeChats: 0,
    totalAnnouncements: 0,
    totalDocuments: 0,
    activePolls: 0,
    activeElections: 0,
    totalFunds: 0,
    myGroups: 0,
    unreadMessages: 0,
    pendingPolls: 0,
    pendingElections: 0,
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch faculty count
        const facultyQuery = query(collection(db, 'users'), where('role', '==', 'faculty'));
        const facultySnapshot = await getDocs(facultyQuery);
        const totalFaculty = facultySnapshot.size;

        // Fetch chats for current user
        const chatsQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', user.id)
        );
        const chatsSnapshot = await getDocs(chatsQuery);
        const activeChats = chatsSnapshot.size;

        // Count unread messages
        let unreadMessages = 0;
        for (const chatDoc of chatsSnapshot.docs) {
          const chatData = chatDoc.data();
          if (chatData.lastMessageSenderId !== user.id) {
            // Simple check - if user hasn't read the last message
            const messagesQuery = query(
              collection(db, 'chats', chatDoc.id, 'messages'),
              orderBy('timestamp', 'desc'),
              limit(10)
            );
            try {
              const messagesSnapshot = await getDocs(messagesQuery);
              messagesSnapshot.docs.forEach(msgDoc => {
                const msgData = msgDoc.data();
                if (!msgData.readBy?.includes(user.id) && msgData.senderId !== user.id) {
                  unreadMessages++;
                }
              });
            } catch (e) {
              // Ignore index errors
            }
          }
        }

        // Fetch announcements count
        const announcementsQuery = query(collection(db, 'announcements'));
        const announcementsSnapshot = await getDocs(announcementsQuery);
        const totalAnnouncements = announcementsSnapshot.size;

        // Fetch documents count from Supabase
        const { count: totalDocuments } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true });

        // Fetch polls
        const pollsQuery = query(collection(db, 'polls'));
        const pollsSnapshot = await getDocs(pollsQuery);
        const activePolls = pollsSnapshot.docs.filter(
          doc => doc.data().status === 'active'
        ).length;

        // Count pending polls for faculty (polls user hasn't voted in)
        let pendingPolls = 0;
        if (user.role === 'faculty') {
          for (const pollDoc of pollsSnapshot.docs) {
            const pollData = pollDoc.data();
            if (pollData.status === 'active') {
              const responsesQuery = query(
                collection(db, 'polls', pollDoc.id, 'responses'),
                where('respondentId', '==', user.id)
              );
              const responsesSnapshot = await getDocs(responsesQuery);
              if (responsesSnapshot.empty) {
                pendingPolls++;
              }
            }
          }
        }

        // Fetch elections
        const electionsQuery = query(collection(db, 'elections'));
        const electionsSnapshot = await getDocs(electionsQuery);
        const now = new Date();
        const activeElections = electionsSnapshot.docs.filter(doc => {
          const data = doc.data();
          const startDate = data.startDate?.toDate?.() || new Date(data.startDate);
          const endDate = data.endDate?.toDate?.() || new Date(data.endDate);
          return now >= startDate && now <= endDate;
        }).length;

        // Count pending elections for faculty
        let pendingElections = 0;
        if (user.role === 'faculty') {
          for (const electionDoc of electionsSnapshot.docs) {
            const electionData = electionDoc.data();
            const startDate = electionData.startDate?.toDate?.() || new Date(electionData.startDate);
            const endDate = electionData.endDate?.toDate?.() || new Date(electionData.endDate);
            if (now >= startDate && now <= endDate) {
              const votesQuery = query(
                collection(db, 'elections', electionDoc.id, 'votes'),
                where('odterId', '==', user.id)
              );
              const votesSnapshot = await getDocs(votesQuery);
              if (votesSnapshot.empty) {
                pendingElections++;
              }
            }
          }
        }

        // Fetch financial records for total funds (admin only)
        let totalFunds = 0;
        if (user.role === 'admin') {
          const { data: financialRecords } = await supabase
            .from('financial_records')
            .select('amount, type');
          
          if (financialRecords) {
            financialRecords.forEach(record => {
              if (record.type === 'income' || record.type === 'fund') {
                totalFunds += Number(record.amount);
              } else if (record.type === 'expense') {
                totalFunds -= Number(record.amount);
              }
            });
          }
        }

        // Get user's groups count
        const myGroups = user.groups?.length || 0;

        setStats({
          totalFaculty,
          activeChats,
          totalAnnouncements,
          totalDocuments: totalDocuments || 0,
          activePolls,
          activeElections,
          totalFunds,
          myGroups,
          unreadMessages,
          pendingPolls,
          pendingElections,
        });

        // Fetch recent activity
        const activities: Activity[] = [];

        // Recent announcements
        const recentAnnouncementsQuery = query(
          collection(db, 'announcements'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const recentAnnouncements = await getDocs(recentAnnouncementsQuery);
        recentAnnouncements.docs.forEach(doc => {
          const data = doc.data();
          activities.push({
            id: doc.id,
            type: 'announcement',
            title: data.title,
            description: `Posted by ${data.author}`,
            time: data.createdAt?.toDate?.() || new Date(),
          });
        });

        // Recent polls
        const recentPollsQuery = query(
          collection(db, 'polls'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        try {
          const recentPolls = await getDocs(recentPollsQuery);
          recentPolls.docs.forEach(doc => {
            const data = doc.data();
            activities.push({
              id: doc.id,
              type: 'poll',
              title: data.title,
              description: data.status === 'active' ? 'Active poll' : 'Poll ended',
              time: data.createdAt?.toDate?.() || new Date(),
            });
          });
        } catch (e) {
          // Ignore index errors
        }

        // Recent elections
        electionsSnapshot.docs.slice(0, 3).forEach(doc => {
          const data = doc.data();
          activities.push({
            id: doc.id,
            type: 'election',
            title: data.title,
            description: `${data.positions?.length || 0} positions`,
            time: data.createdAt?.toDate?.() || new Date(),
          });
        });

        // Sort by time and take top 6
        activities.sort((a, b) => b.time.getTime() - a.time.getTime());
        setRecentActivity(activities.slice(0, 6));

        // Fetch upcoming events (active elections and polls)
        const events: UpcomingEvent[] = [];

        // Active/upcoming elections
        electionsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const endDate = data.endDate?.toDate?.() || new Date(data.endDate);
          if (endDate > now) {
            events.push({
              id: doc.id,
              title: data.title,
              date: endDate,
              type: 'election',
            });
          }
        });

        // Active polls
        pollsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'active') {
            events.push({
              id: doc.id,
              title: data.title,
              date: data.createdAt?.toDate?.() || new Date(),
              type: 'poll',
            });
          }
        });

        // Sort by date
        events.sort((a, b) => a.date.getTime() - b.date.getTime());
        setUpcomingEvents(events.slice(0, 5));

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return { stats, recentActivity, upcomingEvents, loading };
}
