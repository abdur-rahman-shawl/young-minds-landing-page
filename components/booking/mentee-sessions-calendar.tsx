"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, User, Video, MessageSquare, Headphones, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isPast, isFuture } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

import { SessionViewModal } from './SessionViewModal';

interface Session {
  id: string;
  title: string;
  description?: string;
  status: string;
  scheduledAt: string;
  duration: number;
  meetingType: string;
  meetingUrl?: string;
  location?: string;
  mentorId: string;
  mentorName?: string;
  mentorAvatar?: string;
  rate?: number;
  currency?: string;
}

const MEETING_TYPE_ICONS = {
  video: Video,
  audio: Headphones,
  chat: MessageSquare,
};

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  in_progress: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function MenteeSessionsCalendar() {
  const { session } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionToJoin, setSessionToJoin] = useState<Session | null>(null);

  // Get days of the current week
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch mentee's sessions
  const fetchSessions = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const response = await fetch('/api/bookings?role=mentee');
      const data = await response.json();

      if (response.ok) {
        setSessions(data.bookings || []);
      } else {
        toast.error('Failed to fetch sessions');
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  // Get sessions for a specific date
  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session =>
      isSameDay(new Date(session.scheduledAt), date)
    ).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  };

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = addDays(currentWeek, direction === 'next' ? 7 : -7);
    setCurrentWeek(newWeek);
  };

  // Format currency
  const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  useEffect(() => {
    fetchSessions();
  }, [session]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Sessions
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your upcoming and past mentoring sessions
          </p>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map((day, index) => {
                const daySessions = getSessionsForDate(day);
                const isCurrentDay = isToday(day);

                return (
                  <div key={index} className="space-y-2">
                    {/* Day Header */}
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {format(day, 'EEE')}
                      </div>
                      <div
                        className={`text-lg font-semibold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                          isCurrentDay
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {format(day, 'd')}
                      </div>
                    </div>

                    {/* Sessions */}
                    <div className="space-y-1 min-h-[200px]">
                      {daySessions.map((sessionData) => {
                        const MeetingIcon = MEETING_TYPE_ICONS[sessionData.meetingType as keyof typeof MEETING_TYPE_ICONS] || Video;
                        const statusColor = STATUS_COLORS[sessionData.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.scheduled;
                        const sessionTime = new Date(sessionData.scheduledAt);
                        const canJoin = sessionData.status === 'scheduled' && 
                                       Math.abs(sessionTime.getTime() - new Date().getTime()) < 30 * 60 * 1000; // Can join 30 mins before/after

                        return (
                          <div
                            key={sessionData.id}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <MeetingIcon className="w-3 h-3 text-gray-500" />
                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                  {format(sessionTime, 'HH:mm')}
                                </span>
                              </div>
                              <Badge className={`text-xs px-1 py-0 h-4 ${statusColor}`}>
                                {sessionData.status}
                              </Badge>
                            </div>
                            
                            <h4 className="text-xs font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                              {sessionData.title}
                            </h4>
                            
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                              <Clock className="w-3 h-3" />
                              <span>{sessionData.duration} min</span>
                            </div>

                            {/* Mentor Info */}
                            <div className="flex items-center gap-1 mb-1">
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={sessionData.mentorAvatar} />
                                <AvatarFallback className="text-xs">
                                  {sessionData.mentorName?.charAt(0) || 'M'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {sessionData.mentorName}
                              </span>
                            </div>
                            
                            {canJoin && (
                              <Button
                                size="sm"
                                className="w-full h-6 text-xs mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSessionToJoin(sessionData);
                                }}
                              >
                                Join Now
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {sessions.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {sessions.filter(s => s.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Mentors</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {new Set(sessions.map(s => s.mentorId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {sessions.filter(s => 
                    s.status === 'scheduled' && 
                    new Date(s.scheduledAt) > new Date()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <SessionLobbyModal 
        isOpen={!!lobbySession}
        onClose={() => setLobbySession(null)}
        session={lobbySession}
      />
    </div>
  );
});
}