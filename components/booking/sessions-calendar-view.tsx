"use client"

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Clock,
  User,
  Video,
  MessageSquare,
  Headphones,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  MapPin,
  DollarSign,
  CalendarDays
} from 'lucide-react';
import {
  format,
  addDays,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isPast,
  isSameMonth,
  addMinutes,
  getDay,
  setHours,
  setMinutes as setMin,
  isWithinInterval,
  addWeeks,
  subMonths,
  subWeeks
} from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SessionLobbyModal } from './SessionLobbyModal';
import { SessionActions } from './session-actions';

interface Session {
  id: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  scheduledAt: string;
  duration: number;
  meetingType: 'video' | 'audio' | 'chat';
  meetingUrl?: string;
  location?: string;
  mentorId: string;
  menteeId?: string;
  mentorName?: string;
  mentorAvatar?: string;
  rate?: number;
  currency?: string;
  rescheduleCount?: number;
}

type ViewType = 'month' | 'week' | 'day' | 'agenda';

const MEETING_TYPE_ICONS = {
  video: Video,
  audio: Headphones,
  chat: MessageSquare,
};

const STATUS_COLORS = {
  scheduled: {
    bg: 'bg-blue-200/50 hover:bg-blue-200/40 dark:bg-blue-400/25 dark:hover:bg-blue-400/20',
    text: 'text-blue-900/90 dark:text-blue-200',
    border: 'shadow-blue-700/8'
  },
  in_progress: {
    bg: 'bg-emerald-200/50 hover:bg-emerald-200/40 dark:bg-emerald-400/25 dark:hover:bg-emerald-400/20',
    text: 'text-emerald-900/90 dark:text-emerald-200',
    border: 'shadow-emerald-700/8'
  },
  completed: {
    bg: 'bg-gray-200/50 hover:bg-gray-200/40 dark:bg-gray-400/25 dark:hover:bg-gray-400/20',
    text: 'text-gray-900/90 dark:text-gray-200',
    border: 'shadow-gray-700/8'
  },
  cancelled: {
    bg: 'bg-rose-200/50 hover:bg-rose-200/40 dark:bg-rose-400/25 dark:hover:bg-rose-400/20',
    text: 'text-rose-900/90 dark:text-rose-200',
    border: 'shadow-rose-700/8'
  },
  no_show: {
    bg: 'bg-orange-200/50 hover:bg-orange-200/40 dark:bg-orange-400/25 dark:hover:bg-orange-400/20',
    text: 'text-orange-900/90 dark:text-orange-200',
    border: 'shadow-orange-700/8'
  }
};

export function SessionsCalendarView() {
  const { session } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lobbySession, setLobbySession] = useState<Session | null>(null);

  // Get user info for SessionActions
  const userId = session?.user?.id || '';

  // Calculate date ranges based on view type
  const dateRange = useMemo(() => {
    switch (viewType) {
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return { start: calendarStart, end: calendarEnd };

      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return { start: weekStart, end: weekEnd };

      case 'day':
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
        return { start: dayStart, end: dayEnd };

      case 'agenda':
        // Show next 30 days for agenda view
        const agendaStart = new Date();
        const agendaEnd = addDays(agendaStart, 30);
        return { start: agendaStart, end: agendaEnd };

      default:
        return { start: new Date(), end: new Date() };
    }
  }, [currentDate, viewType]);

  // Get all days to display in the calendar
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  // Track if we're already fetching to prevent duplicates
  const [isFetching, setIsFetching] = useState(false);

  // Fetch sessions
  const fetchSessions = async () => {
    if (!session || isFetching) return;

    setIsFetching(true);
    setLoading(true);
    try {
      const response = await fetch('/api/bookings?role=mentee');
      const data = await response.json();

      if (response.ok) {
        // Add mock mentor names for better display
        const enrichedSessions = (data.bookings || []).map((booking: any) => ({
          ...booking,
          mentorName: booking.mentorName || 'Mentor',
          mentorAvatar: booking.mentorAvatar || null,
        }));
        setSessions(enrichedSessions);
      } else {
        toast.error('Failed to fetch sessions');
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  // Get sessions for a specific date
  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session =>
      isSameDay(new Date(session.scheduledAt), date)
    ).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  };

  // Navigate dates
  const navigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const increment = direction === 'next' ? 1 : -1;

    switch (viewType) {
      case 'month':
        setCurrentDate(prev => addMonths(prev, increment));
        break;
      case 'week':
        setCurrentDate(prev => addDays(prev, increment * 7));
        break;
      case 'day':
        setCurrentDate(prev => addDays(prev, increment));
        break;
    }
  };

  // Handle session click
  const handleSessionClick = (sessionData: Session) => {
    setSelectedSession(sessionData);
    setDialogOpen(true);
  };

  // Handle join session
  const handleJoinSession = (sessionData: Session) => {
    if (sessionData.meetingUrl) {
      window.open(sessionData.meetingUrl, '_blank');
    } else {
      toast.info('Meeting link will be provided by your mentor');
    }
  };

  // Format currency
  const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Get header title based on view
  const getHeaderTitle = useMemo(() => {
    if (viewType === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (viewType === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (isSameMonth(start, end)) {
        return format(start, 'MMMM yyyy');
      } else {
        return `${format(start, 'MMM')} - ${format(end, 'MMM yyyy')}`;
      }
    } else if (viewType === 'day') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    } else if (viewType === 'agenda') {
      return 'Upcoming Sessions';
    }
    return '';
  }, [currentDate, viewType]);

  useEffect(() => {
    if (session) {
      fetchSessions();
    }
  }, []);

  if (!session) return null;

  // Render month view
  const renderMonthView = () => {
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    return (
      <div data-slot="month-view" className="flex flex-col h-full">
        {/* Day headers */}
        <div className="border-border/70 grid grid-cols-7 border-y uppercase flex-shrink-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="text-muted-foreground/70 py-2 text-center text-xs"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid flex-1 auto-rows-fr overflow-hidden">
          {weeks.map((week, weekIndex) => (
            <div
              key={`week-${weekIndex}`}
              className="grid grid-cols-7 [&:last-child>*]:border-b-0"
            >
              {week.map((day, dayIndex) => {
                const daysSessions = getSessionsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isPastDay = isPast(day) && !isToday(day);

                return (
                  <div
                    key={day.toString()}
                    className="group border-border/70 data-outside-cell:bg-muted/25 data-outside-cell:text-muted-foreground/70 border-r border-b last:border-r-0"
                    data-today={isToday(day) || undefined}
                    data-outside-cell={!isCurrentMonth || undefined}
                  >
                    <div className="h-full min-h-[120px] p-2 flex flex-col">
                      <div className="group-data-today:bg-primary group-data-today:text-primary-foreground mb-1 inline-flex size-6 items-center justify-center rounded-full text-sm">
                        {format(day, 'd')}
                      </div>

                      <div className="flex-1 space-y-1 overflow-hidden">
                        {daysSessions.slice(0, 3).map((session) => {
                          const colors = STATUS_COLORS[session.status];
                          return (
                            <button
                              key={session.id}
                              onClick={() => handleSessionClick(session)}
                              className={cn(
                                "focus-visible:border-ring focus-visible:ring-ring/50 flex h-full w-full overflow-hidden px-1 text-left font-medium backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] rounded text-[10px] sm:text-[13px]",
                                colors.bg,
                                colors.text,
                                colors.border,
                                isPastDay && "line-through opacity-90"
                              )}
                            >
                              <span className="truncate">
                                <span className="truncate sm:text-xs font-normal opacity-70 uppercase">
                                  {format(new Date(session.scheduledAt), 'ha').toLowerCase()}{" "}
                                </span>
                                {session.title}
                              </span>
                            </button>
                          );
                        })}
                        {daysSessions.length > 3 && (
                          <button
                            onClick={() => {
                              setCurrentDate(day);
                              setViewType('day');
                            }}
                            className="focus-visible:border-ring focus-visible:ring-ring/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-6 w-full items-center overflow-hidden px-1 text-left text-[10px] backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] sm:text-xs"
                          >
                            + {daysSessions.length - 3}{" "}
                            <span className="max-sm:sr-only">more</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const weekDays = calendarDays.slice(0, 7);

    return (
      <div data-slot="week-view" className="flex h-full flex-col">
        <div className="bg-background/80 border-border/70 sticky top-0 z-30 grid grid-cols-8 border-y backdrop-blur-md uppercase">
          <div className="text-muted-foreground/70 py-2 text-center text-xs">
            <span className="max-[479px]:sr-only">{format(new Date(), 'O')}</span>
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toString()}
              className="data-today:text-foreground text-muted-foreground/70 py-2 text-center text-xs data-today:font-medium"
              data-today={isToday(day) || undefined}
            >
              <span className="sm:hidden" aria-hidden="true">
                {format(day, 'E')[0]} {format(day, 'd')}
              </span>
              <span className="max-sm:hidden">{format(day, 'EEE dd')}</span>
            </div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-8 overflow-hidden">
          <div className="border-border/70 border-r grid auto-cols-fr">
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="border-border/70 relative min-h-[64px] border-b last:border-b-0"
              >
                {index > 0 && (
                  <span className="bg-background text-muted-foreground/70 absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end pe-2 text-[10px] sm:pe-4 sm:text-xs">
                    {format(setHours(new Date(), hour), 'h a')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {weekDays.map((day, dayIndex) => (
            <div
              key={day.toString()}
              className="border-border/70 relative border-r last:border-r-0 grid auto-cols-fr"
              data-today={isToday(day) || undefined}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-border/70 relative min-h-[64px] border-b last:border-b-0"
                />
              ))}

              {/* Sessions */}
              {getSessionsForDate(day).map(session => {
                const sessionDate = new Date(session.scheduledAt);
                const hour = sessionDate.getHours();
                const minutes = sessionDate.getMinutes();
                const top = hour * 64 + (minutes / 60) * 64;
                const height = (session.duration / 60) * 64;
                const colors = STATUS_COLORS[session.status];

                return (
                  <div
                    key={session.id}
                    className="absolute z-10 px-0.5"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: '0',
                      width: '100%',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleSessionClick(session)}
                      className={cn(
                        "focus-visible:border-ring focus-visible:ring-ring/50 flex h-full w-full overflow-hidden px-1 text-left font-medium backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] rounded py-1 flex-col text-[10px] sm:text-[13px]",
                        colors.bg,
                        colors.text,
                        colors.border,
                        height < 45 ? "items-center" : "flex-col"
                      )}
                    >
                      {height < 45 ? (
                        <div className="truncate">
                          {session.title}{" "}
                          <span className="opacity-70">
                            {format(sessionDate, 'HH:mm')}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="truncate font-medium">{session.title}</div>
                          <div className="truncate font-normal opacity-70 sm:text-xs uppercase">
                            {format(sessionDate, 'h:mma').toLowerCase()}
                          </div>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const daysSessions = getSessionsForDate(currentDate);

    return (
      <div className="h-full overflow-auto">
        <div className="min-w-[600px]">
          {hours.map(hour => {
            const hourSessions = daysSessions.filter(session => {
              const sessionHour = new Date(session.scheduledAt).getHours();
              return sessionHour === hour;
            });

            return (
              <div key={hour} className="flex border-b border-gray-200 dark:border-gray-800">
                <div className="w-20 py-4 pr-4 text-right flex-shrink-0">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(setHours(new Date(), hour), 'ha')}
                  </span>
                </div>
                <div className="flex-1 py-4 px-4 min-h-[80px]">
                  {hourSessions.map(session => {
                    const colors = STATUS_COLORS[session.status];
                    const Icon = MEETING_TYPE_ICONS[session.meetingType];

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity mb-2",
                          colors.bg,
                          "border",
                          colors.border
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="w-4 h-4" />
                              <span className={cn("font-medium", colors.text)}>
                                {format(new Date(session.scheduledAt), 'HH:mm')} - {session.title}
                              </span>
                            </div>
                            {session.description && (
                              <p className={cn("text-sm opacity-80 mb-2", colors.text)}>
                                {session.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs">
                              {session.mentorName && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>{session.mentorName}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{session.duration} min</span>
                              </div>
                            </div>
                          </div>
                          <SessionActions
                            session={{
                              ...session,
                              scheduledAt: new Date(session.scheduledAt),
                              menteeId: session.menteeId || userId, // If menteeId is missing, use current user as mentee
                            }}
                            userId={userId}
                            userRole={session.mentorId === userId ? 'mentor' : 'mentee'}
                            onUpdate={fetchSessions}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render agenda view
  const renderAgendaView = () => {
    const upcomingSessions = sessions
      .filter(session => new Date(session.scheduledAt) >= new Date())
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const groupedSessions = upcomingSessions.reduce((groups, session) => {
      const date = format(new Date(session.scheduledAt), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
      return groups;
    }, {} as Record<string, Session[]>);

    const hasEvents = upcomingSessions.length > 0;

    return (
      <div className="border-border/70 border-t ps-4">
        {!hasEvents ? (
          <div className="flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
            <CalendarDays
              size={32}
              className="text-muted-foreground/50 mb-2"
            />
            <h3 className="text-lg font-medium">No events found</h3>
            <p className="text-muted-foreground">
              There are no events scheduled for this time period.
            </p>
          </div>
        ) : (
          Object.entries(groupedSessions).map(([date, daySessions]) => (
            <div
              key={date}
              className="border-border/70 relative my-12 border-t"
            >
              <span
                className="bg-background absolute -top-3 left-0 flex h-6 items-center pe-4 text-[10px] uppercase data-today:font-medium sm:pe-4 sm:text-xs"
                data-today={isToday(new Date(date)) || undefined}
              >
                {format(new Date(date), 'd MMM, EEEE')}
              </span>
              <div className="mt-6 space-y-2">
                {daySessions.map(session => {
                  const colors = STATUS_COLORS[session.status];
                  const Icon = MEETING_TYPE_ICONS[session.meetingType];

                  return (
                    <div
                      key={session.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded p-2 text-left transition outline-none focus-visible:ring-[3px] data-past-event:line-through data-past-event:opacity-90 cursor-pointer",
                        colors.bg,
                        colors.border
                      )}
                      data-past-event={isPast(new Date(session.scheduledAt)) || undefined}
                      onClick={() => handleSessionClick(session)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSessionClick(session)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className={cn("text-sm font-medium", colors.text)}>
                            {session.title}
                          </div>
                          <div className={cn("text-xs opacity-70", colors.text)}>
                            <span className="uppercase">
                              {format(new Date(session.scheduledAt), 'h:mma').toLowerCase()} • {session.duration} minutes
                            </span>
                            {session.mentorName && (
                              <>
                                <span className="px-1 opacity-35"> · </span>
                                <span>with {session.mentorName}</span>
                              </>
                            )}
                          </div>
                          {session.description && (
                            <div className={cn("my-1 text-xs opacity-90", colors.text)}>
                              {session.description}
                            </div>
                          )}
                        </div>
                        <SessionActions
                          session={{
                            ...session,
                            scheduledAt: new Date(session.scheduledAt),
                            menteeId: session.menteeId || userId, // If menteeId is missing, use current user as mentee
                          }}
                          userId={userId}
                          userRole={session.mentorId === userId ? 'mentor' : 'mentee'}
                          onUpdate={fetchSessions}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 px-2">
        <div className="flex sm:flex-col max-sm:items-center justify-between gap-1.5">
          <h2 className="font-semibold text-xl">
            {getHeaderTitle}
          </h2>
          <div className="text-sm text-muted-foreground/70">
            View and manage your mentoring sessions
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center sm:gap-2 max-sm:order-1">
              <Button
                variant="ghost"
                size="icon"
                className="max-sm:size-8"
                onClick={() => navigate('prev')}
                aria-label="Previous"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="max-sm:size-8"
                onClick={() => navigate('next')}
                aria-label="Next"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </div>
            <Button
              className="max-sm:h-8 max-sm:px-2.5"
              onClick={() => navigate('today')}
            >
              Today
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-1.5 max-sm:h-8 max-sm:px-2 max-sm:gap-1"
                >
                  <span className="capitalize">{viewType}</span>
                  <ChevronDown
                    className="-me-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-32">
                <DropdownMenuItem onClick={() => setViewType('month')}>
                  Month <DropdownMenuShortcut>M</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewType('week')}>
                  Week <DropdownMenuShortcut>W</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewType('day')}>
                  Day <DropdownMenuShortcut>D</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewType('agenda')}>
                  Agenda <DropdownMenuShortcut>A</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex flex-1 flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {viewType === 'month' && renderMonthView()}
            {viewType === 'week' && renderWeekView()}
            {viewType === 'day' && renderDayView()}
            {viewType === 'agenda' && renderAgendaView()}
          </>
        )}
      </div>

      {/* Session Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedSession?.title}</DialogTitle>
            <DialogDescription>
              Session details and information
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div>
                <Badge className={cn(
                  "font-medium",
                  STATUS_COLORS[selectedSession.status].bg,
                  STATUS_COLORS[selectedSession.status].text,
                  STATUS_COLORS[selectedSession.status].border
                )}>
                  {selectedSession.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              {/* Session Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    {format(new Date(selectedSession.scheduledAt), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    {format(new Date(selectedSession.scheduledAt), 'HH:mm')} • {selectedSession.duration} minutes
                  </span>
                </div>

                {selectedSession.mentorName && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      with {selectedSession.mentorName}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = MEETING_TYPE_ICONS[selectedSession.meetingType];
                    return (
                      <>
                        <Icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm capitalize">
                          {selectedSession.meetingType} Call
                        </span>
                      </>
                    );
                  })()}
                </div>

                {selectedSession.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      {selectedSession.location}
                    </span>
                  </div>
                )}

                {selectedSession.rate && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      {formatCurrency(selectedSession.rate, selectedSession.currency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedSession.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedSession.description}
                  </p>
                </div>
              )}

              {/* Actions */}
              {selectedSession.status === 'scheduled' && (
                <div className="pt-4 space-y-3">
                  {/* Join Button (only if not past) */}
                  {!isPast(new Date(selectedSession.scheduledAt)) && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setDialogOpen(false);
                        setLobbySession(selectedSession);
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Join Session
                    </Button>
                  )}

                  {/* Cancel/Reschedule Actions (via SessionActions) */}
                  <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                    <SessionActions
                      session={{
                        ...selectedSession,
                        scheduledAt: new Date(selectedSession.scheduledAt),
                        menteeId: selectedSession.menteeId || userId,
                        rescheduleCount: selectedSession.rescheduleCount || 0,
                      }}
                      userId={userId}
                      userRole={selectedSession.mentorId === userId ? 'mentor' : 'mentee'}
                      onUpdate={() => {
                        fetchSessions();
                        setDialogOpen(false);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SessionLobbyModal
        isOpen={!!lobbySession}
        onClose={() => setLobbySession(null)}
        sessionId={lobbySession?.id || null}
        viewerRole={lobbySession?.mentorId === userId ? "mentor" : "mentee"}
      />
    </div>
  );
}