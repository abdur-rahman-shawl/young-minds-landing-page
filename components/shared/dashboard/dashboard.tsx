"use client";

import { useMemo } from "react";
import Link from "next/link";
import { 
  CalendarDays, 
  MessageSquare, 
  BookOpen, 
  Clock, 
  Users, 
  ArrowRight,
  Star,
  ChevronRight,
  TrendingUp,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

// Hooks
import { useMentors } from "@/lib/hooks/use-mentors";
import { useSessions } from "@/lib/hooks/use-sessions";
import { useDashboardStats } from "@/lib/hooks/use-dashboard-stats";
import { useSession } from "@/lib/auth-client";
import { useMenteePendingReviews } from "@/hooks/use-mentee-pending-reviews";

// Components
import { WelcomeSection } from "@/components/dashboard/welcome-section";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { SessionsList } from "@/components/dashboard/session-card"; // Assuming this exists from previous context
import { MentorsList } from "@/components/dashboard/mentor-card"; // The new premium card component

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface DashboardProps {
  onMentorSelect: (mentorId: string) => void;
  onSectionChange?: (section: string) => void;
}

export function Dashboard({ onMentorSelect, onSectionChange }: DashboardProps) {
  const { data: session } = useSession();
  
  // Data Fetching
  const { mentors, loading: mentorsLoading } = useMentors();
  const { sessions, loading: sessionsLoading } = useSessions("upcoming");
  const { stats: dashboardStats, loading: statsLoading } = useDashboardStats();
  const { sessionsToReview, isLoading: reviewsLoading, error: reviewsError } = useMenteePendingReviews(session?.user);

  // Memoized Data Slices
  const topMentors = useMemo(() => mentors.slice(0, 3), [mentors]);
  const upcomingSessions = useMemo(() => sessions.slice(0, 3), [sessions]);

  // Construct Stats Objects
  const stats = useMemo(() => dashboardStats
    ? [
        {
          title: "Sessions Booked",
          value: dashboardStats.sessionsBooked.value.toString(),
          description: dashboardStats.sessionsBooked.description,
          icon: CalendarDays,
          trend: dashboardStats.sessionsBooked.trend,
        },
        {
          title: "Hours Learned",
          value: dashboardStats.hoursLearned.value.toString(),
          description: dashboardStats.hoursLearned.description,
          icon: Clock,
          trend: dashboardStats.hoursLearned.trend,
        },
        {
          title: "Mentors Connected",
          value: dashboardStats.mentorsConnected.value.toString(),
          description: dashboardStats.mentorsConnected.description,
          icon: Users,
          trend: dashboardStats.mentorsConnected.trend,
        },
      ]
    : [], [dashboardStats]);

  // Animation Config
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 pb-12"
    >
      {/* 1. Welcome Header */}
      <motion.div variants={itemVariants}>
        <WelcomeSection 
          userName={session?.user?.name} 
          onExploreClick={() => onSectionChange?.("explore")} 
        />
      </motion.div>

      {/* 2. Key Statistics */}
      <motion.div variants={itemVariants}>
        <StatsGrid stats={stats} loading={statsLoading} />
      </motion.div>

      {/* 3. Main Split View: Sessions & Mentors */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Left Column: Upcoming Sessions */}
        <motion.div variants={itemVariants} className="flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Upcoming Sessions
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your schedule for the week
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSectionChange?.("sessions")}
              className="text-primary hover:text-primary/80 hover:bg-primary/5 group"
            >
              View Schedule <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1 shadow-sm">
            <SessionsList
              sessions={upcomingSessions}
              loading={sessionsLoading}
              onSessionClick={(session) => console.log("Session clicked:", session)}
              onViewAllClick={() => onSectionChange?.("sessions")}
              onBookSessionClick={() => onSectionChange?.("explore")}
            />
          </div>
        </motion.div>

        {/* Right Column: Recommended Mentors (NEW DESIGN) */}
        <motion.div variants={itemVariants} className="flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Recommended Mentors
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Experts curated for your goals
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSectionChange?.("explore")}
              className="text-primary hover:text-primary/80 hover:bg-primary/5 group"
            >
              Explore All <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {/* This uses the new MentorList component from mentor-card.tsx */}
          <div className="flex-1 space-y-4">
            <MentorsList
              mentors={topMentors}
              loading={mentorsLoading}
              onMentorClick={(mentor) => onMentorSelect(mentor.id)} 
              onExploreClick={() => onSectionChange?.("explore")}
            />
          </div>
        </motion.div>
      </div>

      {/* 4. Pending Reviews Action Area */}
      {(sessionsToReview && sessionsToReview.length > 0) && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-md text-amber-600 dark:text-amber-400">
               <Star className="w-4 h-4 fill-amber-600 dark:fill-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pending Feedback</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewsLoading ? (
              [1, 2].map((i) => (
                <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))
            ) : reviewsError ? (
              <div className="col-span-full p-4 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 text-sm">
                Error loading reviews: {reviewsError.message}
              </div>
            ) : (
              sessionsToReview.map((session) => {
                const sessionEndedAt = session.sessionEndedAt ? new Date(session.sessionEndedAt) : null;
                return (
                  <Card key={session.sessionId} className="group overflow-hidden border-l-4 border-l-amber-400 border-y border-r border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                          <AvatarImage src={session.mentor.avatar || undefined} />
                          <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                            {session.mentor.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors">
                            {session.mentor.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {sessionEndedAt ? formatDistanceToNow(sessionEndedAt, { addSuffix: true }) : "Recent session"}
                          </p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 shrink-0 font-medium">
                        <Link href={`/review-session/${session.sessionId}`}>Rate Session</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </motion.div>
      )}

      {/* 5. Quick Actions Grid */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="px-1">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Quick Actions</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Jump straight into productivity</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickActionCard 
            icon={Users}
            title="Find Mentors"
            description="Connect with top experts"
            color="blue"
            onClick={() => onSectionChange?.("explore")}
          />
          <QuickActionCard 
            icon={MessageSquare}
            title="Messages"
            description="Chat with your network"
            color="violet"
            onClick={() => onSectionChange?.("messages")}
          />
          <QuickActionCard 
            icon={BookOpen}
            title="Learning Hub"
            description="Explore courses & resources"
            color="emerald"
            onClick={() => onSectionChange?.("courses")}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Sub-component: Quick Action Card ---
interface QuickActionCardProps {
  icon: any;
  title: string;
  description: string;
  color: "blue" | "violet" | "emerald";
  onClick: () => void;
}

function QuickActionCard({ icon: Icon, title, description, color, onClick }: QuickActionCardProps) {
  const styles = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "hover:border-blue-200 dark:hover:border-blue-800",
      group: "group-hover:bg-blue-600 group-hover:text-white"
    },
    violet: {
      bg: "bg-violet-50 dark:bg-violet-900/20",
      text: "text-violet-600 dark:text-violet-400",
      border: "hover:border-violet-200 dark:hover:border-violet-800",
      group: "group-hover:bg-violet-600 group-hover:text-white"
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "hover:border-emerald-200 dark:hover:border-emerald-800",
      group: "group-hover:bg-emerald-600 group-hover:text-white"
    }
  };

  const activeStyle = styles[color];

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-left shadow-sm hover:shadow-xl transition-all duration-300",
        activeStyle.border
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/50 dark:to-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-4">
          <div className={cn(
            "size-12 rounded-xl flex items-center justify-center transition-colors duration-300 shadow-sm",
            activeStyle.bg,
            activeStyle.text,
            activeStyle.group
          )}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
              {title}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 block">
              {description}
            </span>
          </div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 pt-1">
           <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full shadow-sm">
              <ArrowRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
           </div>
        </div>
      </div>
    </motion.button>
  );
}