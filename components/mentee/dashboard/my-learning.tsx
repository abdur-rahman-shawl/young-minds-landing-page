'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Play, 
  Clock, 
  BookOpen, 
  Award, 
  TrendingUp,
  Target,
  Zap,
  Trophy,
  ChevronRight,
  Flame,
  Sparkles,
  Download
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from "@/lib/utils"; // Assuming you have this util, if not just use classNames

// ... [Keep Interfaces exactly the same as original file] ...
interface EnrolledCourse {
  enrollment: {
    id: string;
    status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'DROPPED';
    paymentStatus: string;
    enrolledAt: string;
    lastAccessedAt?: string;
    completedAt?: string;
    overallProgress: number;
    timeSpentMinutes: number;
    currentModuleId?: string;
    currentSectionId?: string;
  };
  course: {
    id: string;
    title: string;
    description: string;
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    duration: number;
    price: string;
    currency: string;
    thumbnailUrl?: string;
    category: string;
    tags: string[];
  };
  mentor: {
    name: string;
    image?: string;
    title?: string;
    company?: string;
  };
  certificate?: {
    status: 'NOT_EARNED' | 'EARNED' | 'ISSUED' | 'REVOKED';
    earnedAt?: string;
    certificateUrl?: string;
  } | null;
}

interface LearningStatistics {
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  totalTimeSpent: number;
  averageProgress: number;
  totalCertificates: number;
}

interface LearningAnalytics {
  currentStreak: number;
  longestStreak: number;
  streakStartDate: string | null;
  lastActiveDate: string | null;
  weeklyGoal: {
    goalHours: number;
    actualHours: number;
    percentage: number;
    daysRemaining: number;
    onTrack: boolean;
    status: string;
    daysActive: number;
  };
  learningVelocity: {
    avgMinutesPerDay: number;
    avgSessionDuration: number;
    totalSessions: number;
    mostActiveDay: string;
    consistencyScore: number;
  };
  achievements: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    iconUrl?: string;
    badgeColor: string;
    isCompleted: boolean;
    earnedAt?: string;
    points: number;
    rarity: string;
    category?: string;
  }>;
  recommendations: string[];
  insights: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    actionText?: string;
    actionUrl?: string;
    priority: string;
    category?: string;
  }>;
  settings: {
    weeklyGoalHours: number;
    preferredLearningDays: string[];
    timezone: string;
    learningReminders: any;
  };
}

export function MyLearning() {
  const router = useRouter();
  const { session } = useAuth();
  
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [statistics, setStatistics] = useState<LearningStatistics>({
    totalCourses: 0,
    activeCourses: 0,
    completedCourses: 0,
    totalTimeSpent: 0,
    averageProgress: 0,
    totalCertificates: 0,
  });
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (session) {
      fetchEnrolledCourses();
      fetchLearningAnalytics();
    }
  }, [session]);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/student/courses');
      const data = await response.json();

      if (data.success) {
        setCourses(data.data.courses);
        setStatistics(data.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLearningAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch('/api/student/learning-analytics');
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching learning analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const learningStreak = analytics?.currentStreak || 0;
  const weeklyGoal = analytics?.weeklyGoal?.goalHours || 5;
  const weeklyProgress = analytics?.weeklyGoal?.actualHours || 0;

  const recentCourses = courses
    .filter(course => course.enrollment.lastAccessedAt)
    .sort((a, b) => new Date(b.enrollment.lastAccessedAt!).getTime() - new Date(a.enrollment.lastAccessedAt!).getTime())
    .slice(0, 3);

  const inProgressCourses = courses
    .filter(course => course.enrollment.status === 'ACTIVE' && course.enrollment.overallProgress > 0 && course.enrollment.overallProgress < 100)
    .sort((a, b) => b.enrollment.overallProgress - a.enrollment.overallProgress)
    .slice(0, 4);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
      case 'INTERMEDIATE': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      case 'ADVANCED': return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatTimeSpent = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins > 0 ? ` ${remainingMins}m` : ''}`;
  };

  // --- Styled Components ---

  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = "text-primary", bgClass }: any) => (
    <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
      <Card className="relative overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
        <div className={`absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y--8 rounded-full opacity-10 ${bgClass}`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={`p-2 rounded-full bg-slate-50 dark:bg-slate-900 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</p>}
          {trend && (
            <div className="flex items-center mt-2 bg-green-50 dark:bg-green-900/20 w-fit px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400 mr-1" />
              <span className="text-xs text-green-600 dark:text-green-400 font-semibold">{trend}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const CompactCourseCard = ({ course }: { course: EnrolledCourse }) => (
    <motion.div whileHover={{ scale: 1.02 }} className="h-full">
      <Card className="group h-full cursor-pointer border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-colors" 
            onClick={() => router.push(`/learn/${course.course.id}`)}>
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
              {course.course.thumbnailUrl ? (
                <img 
                  src={course.course.thumbnailUrl} 
                  alt={course.course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{course.course.title.charAt(0)}</span>
                </div>
              )}
              {/* Play Overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                 <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                    <Play className="w-4 h-4 text-white fill-white" />
                 </div>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <Badge className={cn("text-[10px] px-1.5 py-0 h-5 font-semibold border", getDifficultyColor(course.course.difficulty))} variant="outline">
                  {course.course.difficulty}
                </Badge>
              </div>
              <h4 className="font-semibold text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {course.course.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                 By {course.mentor.name}
              </p>
            </div>
          </div>
          
          <div className="mt-auto space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-500">Progress</span>
              <span className="text-primary">{Math.round(course.enrollment.overallProgress)}%</span>
            </div>
            <Progress value={course.enrollment.overallProgress} className="h-1.5 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-primary" />
          </div>
        </div>
      </Card>
    </motion.div>
  );

  const CourseCard = ({ course }: { course: EnrolledCourse }) => (
    <motion.div whileHover={{ y: -5 }} className="h-full">
      <Card className="group h-full flex flex-col overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-900">
          {course.course.thumbnailUrl ? (
            <img 
              src={course.course.thumbnailUrl} 
              alt={course.course.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
              <span className="text-white text-4xl font-bold opacity-50">{course.course.title.charAt(0)}</span>
            </div>
          )}
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
          
          <div className="absolute top-3 right-3 flex gap-2">
             {/* Status Badge */}
             {course.enrollment.status === 'COMPLETED' && (
                <Badge className="bg-green-500/90 hover:bg-green-500 backdrop-blur-md border-0 text-white shadow-sm">
                   <Award className="w-3 h-3 mr-1" /> Completed
                </Badge>
             )}
          </div>
          
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm text-white border-0 hover:bg-black/60 transition-colors">
              <Clock className="w-3 h-3 mr-1.5" />
              {formatDuration(course.course.duration)}
            </Badge>
          </div>
        </div>
        
        <CardContent className="flex-1 flex flex-col p-5">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
               <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 border", getDifficultyColor(course.course.difficulty))}>
                  {course.course.difficulty}
               </Badge>
               <span className="text-xs text-muted-foreground">• {course.course.category}</span>
            </div>
            <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {course.course.title}
            </h3>
          </div>

          <div className="mt-auto space-y-4">
            {/* Mentor Info */}
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border border-slate-200 dark:border-slate-700">
                <AvatarImage src={course.mentor.image} />
                <AvatarFallback className="text-xs bg-slate-100 dark:bg-slate-800">{course.mentor.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                 <span className="text-sm font-medium leading-none">{course.mentor.name}</span>
                 {course.mentor.company && <span className="text-xs text-muted-foreground">{course.mentor.company}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500 dark:text-slate-400">
                   {course.enrollment.status === 'COMPLETED' ? 'Course Completed' : `${Math.round(course.enrollment.overallProgress)}% Complete`}
                </span>
              </div>
              <Progress value={course.enrollment.overallProgress} className="h-2 rounded-full" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                onClick={() => router.push(`/learn/${course.course.id}`)}
                className="flex-1 shadow-sm"
                size="sm"
              >
                {course.enrollment.status === 'COMPLETED' ? (
                   <>
                     <Play className="w-4 h-4 mr-2" /> Review Course
                   </>
                ) : (
                   <>
                     <Play className="w-4 h-4 mr-2" /> Continue
                   </>
                )}
              </Button>
              {course.certificate?.status === 'ISSUED' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="px-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(course.certificate?.certificateUrl, '_blank');
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Loading State
  if (loading || analyticsLoading) {
    return (
      <div className="space-y-8 p-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Empty State
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-6 animate-pulse">
           <BookOpen className="w-12 h-12 text-slate-400" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Start Your Learning Journey</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          You haven't enrolled in any courses yet. Explore our catalog to build new skills.
        </p>
        <Button onClick={() => router.push('/dashboard?section=courses')} size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20">
          <Sparkles className="w-4 h-4 mr-2" />
          Browse Courses
        </Button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-8 pb-10"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Learning</h1>
        <p className="text-muted-foreground">
          Track your progress, manage your courses, and view your achievements.
        </p>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          title="Total Courses"
          value={statistics.totalCourses}
          subtitle="Enrolled courses"
          color="text-blue-500"
          bgClass="bg-blue-500"
        />
        <StatCard
          icon={Flame}
          title="Streak"
          value={`${learningStreak} Days`}
          subtitle="Keep it up!"
          trend={analytics?.currentStreak > (analytics?.longestStreak || 0) ? `Personal Best!` : undefined}
          color="text-orange-500"
          bgClass="bg-orange-500"
        />
        <StatCard
          icon={Target}
          title="Weekly Goal"
          value={`${Math.round(weeklyProgress)}/${weeklyGoal}h`}
          subtitle={`${Math.round((weeklyProgress/weeklyGoal) * 100)}% complete`}
          color={analytics?.weeklyGoal?.onTrack ? "text-emerald-500" : "text-amber-500"}
          bgClass={analytics?.weeklyGoal?.onTrack ? "bg-emerald-500" : "bg-amber-500"}
        />
        <StatCard
          icon={Trophy}
          title="Certificates"
          value={statistics.totalCertificates}
          subtitle="Earned so far"
          color="text-purple-500"
          bgClass="bg-purple-500"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-full max-w-2xl grid grid-cols-4">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">In Progress</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Completed</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          {/* Continue Learning Section */}
          {recentCourses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                  Continue Learning
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('active')} className="text-primary hover:text-primary/80">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {recentCourses.map((course) => (
                  <CompactCourseCard key={course.enrollment.id} course={course} />
                ))}
              </div>
            </div>
          )}

          {/* Learning Progress Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Overall Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Average Completion</span>
                    <span className="text-primary">{Math.round(statistics.averageProgress)}%</span>
                  </div>
                  <Progress value={statistics.averageProgress} className="h-3" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 text-center">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">{statistics.completedCourses}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-green-700/60 dark:text-green-400/60 mt-1">Completed</div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-center">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{statistics.activeCourses}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-700/60 dark:text-blue-400/60 mt-1">Active</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
               {/* Keep Time Investment logic same, just styling */}
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-purple-500" />
                  Time Investment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-2">
                  <div className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    {formatTimeSpent(statistics.totalTimeSpent)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Total time invested in your future</div>
                </div>
                
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>Weekly Goal Progress</span>
                    <span className="text-primary">{Math.round((weeklyProgress/weeklyGoal) * 100)}%</span>
                  </div>
                  <Progress value={(weeklyProgress/weeklyGoal) * 100} className="h-2.5" />
                  <div className="text-xs text-muted-foreground mt-2 text-right">
                    {Math.max(0, Math.round(weeklyGoal - weeklyProgress))} hours remaining
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- Active Tabs --- */}
        <TabsContent value="active" className="space-y-6 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Courses In Progress</h3>
            <Badge variant="secondary" className="px-3 py-1">{statistics.activeCourses} Active</Badge>
          </div>
          
          {inProgressCourses.length === 0 ? (
             <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
               <p className="text-muted-foreground">No active courses. Time to start something new!</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressCourses.map((course) => (
                <CourseCard key={course.enrollment.id} course={course} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* --- Completed Tabs --- */}
        <TabsContent value="completed" className="space-y-6 animate-in fade-in-50">
           {/* Similar structure to Active, keeping logic identical */}
           <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Completed Courses</h3>
            <Badge variant="secondary" className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{statistics.completedCourses} Completed</Badge>
          </div>
          
          {courses.filter(c => c.enrollment.status === 'COMPLETED').length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-muted-foreground">Complete a course to see your achievements here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses
                .filter(course => course.enrollment.status === 'COMPLETED')
                .map((course) => (
                  <CourseCard key={course.enrollment.id} course={course} />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 animate-in fade-in-50">
           {/* Reusing existing analytics logic but with better cards */}
           <h3 className="text-lg font-bold">Learning Analytics</h3>
          
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Cards for Velocity, Completion, Consistency */}
             <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardHeader><CardTitle className="text-base">Avg. Session</CardTitle></CardHeader>
                <CardContent>
                   <div className="text-3xl font-bold">{analytics?.learningVelocity?.avgSessionDuration || 0}m</div>
                </CardContent>
             </Card>
             <Card className="border-l-4 border-l-green-500 shadow-sm">
                <CardHeader><CardTitle className="text-base">Completion Rate</CardTitle></CardHeader>
                <CardContent>
                   <div className="text-3xl font-bold">{Math.round((statistics.completedCourses / (statistics.totalCourses || 1)) * 100)}%</div>
                </CardContent>
             </Card>
             <Card className="border-l-4 border-l-orange-500 shadow-sm">
                <CardHeader><CardTitle className="text-base">Consistency</CardTitle></CardHeader>
                <CardContent>
                   <div className="text-3xl font-bold">{Math.round(analytics?.learningVelocity?.consistencyScore || 0)}%</div>
                </CardContent>
             </Card>
           </div>
           
           {/* Recommendations & Insights sections - keeping logic, improving visuals */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category distribution */}
              <Card>
                 <CardHeader><CardTitle>Distribution</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                  {Array.from(new Set(courses.map(c => c.course.category))).map((category) => {
                    const count = courses.filter(c => c.course.category === category).length;
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{category}</span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <Progress value={(count / courses.length) * 100} className="h-2" />
                      </div>
                    );
                  })}
                 </CardContent>
              </Card>

              {/* Smart Recommendations */}
              {analytics?.recommendations && analytics.recommendations.length > 0 && (
                <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-slate-950">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" /> Smart Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analytics.recommendations.map((rec, i) => (
                      <div key={i} className="p-3 bg-white/60 dark:bg-black/20 backdrop-blur-sm rounded-lg border border-purple-100 dark:border-purple-900/30 text-sm">
                        {rec}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
           </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}