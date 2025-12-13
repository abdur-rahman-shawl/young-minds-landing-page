'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Clock, 
  BookOpen, 
  Award, 
  TrendingUp,
  Calendar,
  Users,
  Star,
  Filter,
  Download,
  Target,
  Zap,
  Trophy,
  ArrowRight,
  BarChart3,
  BookmarkCheck,
  MessageSquare,
  ChevronRight,
  Flame,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

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

  // Use real analytics data or provide sensible defaults
  const learningStreak = analytics?.currentStreak || 0;
  const weeklyGoal = analytics?.weeklyGoal?.goalHours || 5;
  const weeklyProgress = analytics?.weeklyGoal?.actualHours || 0;

  // Get recently accessed courses
  const recentCourses = courses
    .filter(course => course.enrollment.lastAccessedAt)
    .sort((a, b) => new Date(b.enrollment.lastAccessedAt!).getTime() - new Date(a.enrollment.lastAccessedAt!).getTime())
    .slice(0, 3);

  // Get courses in progress
  const inProgressCourses = courses
    .filter(course => course.enrollment.status === 'ACTIVE' && course.enrollment.overallProgress > 0 && course.enrollment.overallProgress < 100)
    .sort((a, b) => b.enrollment.overallProgress - a.enrollment.overallProgress)
    .slice(0, 4);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'ADVANCED': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTimeSpent = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins > 0 ? ` ${remainingMins}m` : ''}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'DROPPED': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = "text-primary" }: any) => (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center mt-1">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            <span className="text-xs text-green-500 font-medium">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const CompactCourseCard = ({ course }: { course: EnrolledCourse }) => (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer" 
          onClick={() => router.push(`/learn/${course.course.id}`)}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            {course.course.thumbnailUrl ? (
              <img 
                src={course.course.thumbnailUrl} 
                alt={course.course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-lg font-bold">{course.course.title.charAt(0)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                {course.course.title}
              </h4>
              <Badge className={getDifficultyColor(course.course.difficulty)} variant="secondary">
                {course.course.difficulty.charAt(0)}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
              {course.mentor.name} • {course.course.category}
            </p>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(course.enrollment.overallProgress)}%</span>
              </div>
              <Progress value={course.enrollment.overallProgress} className="h-1" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  const CourseCard = ({ course }: { course: EnrolledCourse }) => (
    <Card className="group hover:shadow-lg transition-shadow duration-300">
      <div className="aspect-video relative overflow-hidden rounded-t-lg">
        {course.course.thumbnailUrl ? (
          <img 
            src={course.course.thumbnailUrl} 
            alt={course.course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{course.course.title.charAt(0)}</span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge className={getDifficultyColor(course.course.difficulty)}>
            {course.course.difficulty}
          </Badge>
          <Badge className={getStatusColor(course.enrollment.status)}>
            {course.enrollment.status}
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="bg-black/70 text-white border-0">
            <Clock className="w-3 h-3 mr-1" />
            {formatDuration(course.course.duration)}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {course.course.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {course.course.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{Math.round(course.enrollment.overallProgress)}%</span>
          </div>
          <Progress value={course.enrollment.overallProgress} className="h-2" />
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={course.mentor.image} />
            <AvatarFallback>{course.mentor.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {course.mentor.name}
          </span>
          {course.mentor.company && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{course.mentor.company}</span>
            </>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => router.push(`/learn/${course.course.id}`)}
            className="flex-1"
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" />
            {course.enrollment.status === 'COMPLETED' ? 'Review' : 'Continue'}
          </Button>
          {course.certificate?.status === 'ISSUED' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(course.certificate?.certificateUrl, '_blank');
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading || analyticsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-video rounded-t-lg" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Learning</h1>
          <p className="text-muted-foreground">
            Start your learning journey and track your progress.
          </p>
        </div>
        
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎓</div>
          <h3 className="text-xl font-semibold mb-2">Ready to start learning?</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Discover courses from industry experts and build skills that matter for your career.
          </p>
          <Button onClick={() => router.push('/dashboard?section=courses')} size="lg">
            <BookOpen className="w-4 h-4 mr-2" />
            Browse Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Learning</h1>
        <p className="text-muted-foreground">
          Track your progress and continue learning from where you left off.
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
        />
        <StatCard
          icon={Flame}
          title="Learning Streak"
          value={`${learningStreak} days`}
          subtitle={learningStreak > 0 ? "Keep it up!" : "Start your streak today!"}
          trend={analytics?.currentStreak > (analytics?.longestStreak || 0) ? `+${analytics.currentStreak} days` : undefined}
          color="text-orange-500"
        />
        <StatCard
          icon={Target}
          title="Weekly Goal"
          value={`${Math.round(weeklyProgress)}/${weeklyGoal}h`}
          subtitle={`${Math.round((weeklyProgress/weeklyGoal) * 100)}% complete`}
          color={analytics?.weeklyGoal?.onTrack ? "text-green-500" : "text-amber-500"}
        />
        <StatCard
          icon={Trophy}
          title="Certificates"
          value={statistics.totalCertificates}
          subtitle={`${statistics.completedCourses} completed`}
          color="text-purple-500"
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">In Progress ({statistics.activeCourses})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({statistics.completedCourses})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Continue Learning Section */}
          {recentCourses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Continue Learning
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('active')}>
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {recentCourses.map((course) => (
                  <CompactCourseCard key={course.enrollment.id} course={course} />
                ))}
              </div>
            </div>
          )}

          {/* Learning Progress Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span className="font-medium">{Math.round(statistics.averageProgress)}%</span>
                  </div>
                  <Progress value={statistics.averageProgress} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-500">{statistics.completedCourses}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-500">{statistics.activeCourses}</div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-500" />
                  Time Investment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-500">
                    {formatTimeSpent(statistics.totalTimeSpent)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total learning time</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Weekly Goal Progress</span>
                    <span className="font-medium">{Math.round((weeklyProgress/weeklyGoal) * 100)}%</span>
                  </div>
                  <Progress value={(weeklyProgress/weeklyGoal) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {Math.round(weeklyGoal - weeklyProgress)} hours remaining this week
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Courses In Progress</h3>
            <Badge variant="secondary">{statistics.activeCourses} active</Badge>
          </div>
          
          {inProgressCourses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2">No courses in progress</h4>
              <p className="text-muted-foreground mb-4">Start a new course to see it here.</p>
              <Button onClick={() => router.push('/dashboard?section=courses')}>
                Browse Courses
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressCourses.map((course) => (
                <CourseCard key={course.enrollment.id} course={course} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Completed Courses</h3>
            <Badge variant="secondary">{statistics.completedCourses} completed</Badge>
          </div>
          
          {courses.filter(c => c.enrollment.status === 'COMPLETED').length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2">No completed courses yet</h4>
              <p className="text-muted-foreground">Complete your first course to earn a certificate!</p>
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

        <TabsContent value="analytics" className="space-y-6">
          <h3 className="text-lg font-semibold">Learning Analytics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Learning Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500 mb-1">
                  {analytics?.learningVelocity?.avgSessionDuration || 0} min
                </div>
                <p className="text-sm text-muted-foreground">Average session duration</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500 mb-1">
                  {Math.round((statistics.completedCourses / statistics.totalCourses) * 100 || 0)}%
                </div>
                <p className="text-sm text-muted-foreground">Course completion</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consistency Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500 mb-1">
                  {Math.round(analytics?.learningVelocity?.consistencyScore || 0)}%
                </div>
                <p className="text-sm text-muted-foreground">Learning consistency</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from(new Set(courses.map(c => c.course.category))).map((category) => {
                    const categoryCount = courses.filter(c => c.course.category === category).length;
                    const percentage = (categoryCount / courses.length) * 100;
                    
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{category}</span>
                          <span className="font-medium">{categoryCount} courses</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Smart Recommendations */}
            {analytics?.recommendations && analytics.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Smart Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.recommendations.map((recommendation, index) => (
                      <div key={index} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-purple-800 dark:text-purple-200">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Learning Insights */}
          {analytics?.insights && analytics.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Learning Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.insights.map((insight) => (
                    <div key={insight.id} className="flex items-start gap-3 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">{insight.title}</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-200 mb-2">{insight.message}</p>
                        {insight.actionText && insight.actionUrl && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(insight.actionUrl!)}
                            className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-200 dark:hover:bg-blue-900/40"
                          >
                            {insight.actionText}
                          </Button>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {insight.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
