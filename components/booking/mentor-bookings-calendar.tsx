"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Video, MessageSquare, Headphones, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { addDays, eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { SessionActions } from './session-actions';
import { SessionLobbyModal } from './SessionLobbyModal';

interface Session {
  id: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  scheduledAt: string;
  duration: number;
  meetingType: 'video' | 'audio' | 'chat';
  meetingUrl?: string;
  mentorId?: string;
  menteeId: string;
  menteeName?: string;
  menteeAvatar?: string;
  rate?: number;
  currency?: string;
  // Pending reschedule fields
  pendingRescheduleBy?: 'mentor' | 'mentee';
  pendingRescheduleTime?: string;
  pendingRescheduleRequestId?: string;
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
  no_show: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  reschedule_pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

// Helper to get display status color
const getSessionStatusColor = (sessionData: Session) => {
  if (sessionData.pendingRescheduleBy) {
    return STATUS_COLORS.reschedule_pending;
  }
  return STATUS_COLORS[sessionData.status] || STATUS_COLORS.scheduled;
};

export function MentorBookingsCalendar() {
  const { session } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [lobbySessionId, setLobbySessionId] = useState<string | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const fetchSessions = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const response = await fetch('/api/bookings?role=mentor');
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

  const getSessionsForDate = (date: Date) => {
    return sessions
      .filter(session => isSameDay(new Date(session.scheduledAt), date))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = addDays(currentWeek, direction === 'next' ? 7 : -7);
    setCurrentWeek(newWeek);
  };

  const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  useEffect(() => {
    fetchSessions();
  }, [session]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Schedule</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your mentoring sessions and availability</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Availability
        </Button>
      </div>

      {loading && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Loading your schedule...
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Sessions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
            {weekDays.map((day) => {
              const daySessions = getSessionsForDate(day);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-xl border p-3 transition hover:border-primary/50 ${isToday(day)
                    ? 'border-primary/40 bg-primary/5'
                    : isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 dark:border-gray-800'
                    }`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-gray-500 dark:text-gray-400">{format(day, 'EEE')}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{format(day, 'd')}</p>
                    </div>
                    {isToday(day) && (
                      <Badge variant="outline" className="text-xs">
                        Today
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    {daySessions.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">No sessions</p>
                    )}
                    {daySessions.map((bookingSession) => {
                      const MeetingIcon = MEETING_TYPE_ICONS[bookingSession.meetingType];

                      return (
                        <div key={bookingSession.id} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                          <div className="mb-1 flex items-start justify-between">
                            <div className="flex items-center gap-1">
                              <MeetingIcon className="h-3 w-3 text-gray-500" />
                              <span className="text-xs font-medium text-gray-900 dark:text-white">
                                {format(new Date(bookingSession.scheduledAt), 'HH:mm')}
                              </span>
                            </div>
                            <Badge className={`h-4 px-1 py-0 text-xs ${getSessionStatusColor(bookingSession)}`}>
                              {bookingSession.pendingRescheduleBy ? '⏳ Reschedule' : bookingSession.status}
                            </Badge>
                          </div>

                          <h4 className="mb-1 line-clamp-2 text-xs font-medium text-gray-900 dark:text-white">
                            {bookingSession.title}
                          </h4>

                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{bookingSession.duration} min</span>
                          </div>

                          {bookingSession.rate && (
                            <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                              {formatCurrency(bookingSession.rate, bookingSession.currency)}
                            </div>
                          )}

                          {session?.user?.id && (
                            <div className="mt-2">
                              <SessionActions
                                session={{
                                  ...bookingSession,
                                  scheduledAt: new Date(bookingSession.scheduledAt),
                                  mentorId: session.user.id,
                                }}
                                userId={session.user.id}
                                userRole="mentor"
                                onUpdate={fetchSessions}
                                onJoin={(actionSession) => setLobbySessionId(actionSession.id)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {sessions.filter(s => {
                    const sessionDate = new Date(s.scheduledAt)
                    return sessionDate >= weekStart && sessionDate <= weekEnd
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{sessions.filter(s => s.status === 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Mentees</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{new Set(sessions.map(s => s.menteeId)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {sessions.filter(s => s.status === 'scheduled' && new Date(s.scheduledAt) > new Date()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <SessionLobbyModal
        sessionId={lobbySessionId}
        isOpen={!!lobbySessionId}
        viewerRole="mentor"
        onClose={() => setLobbySessionId(null)}
      />
    </div>
  );
}

