'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play,
  Pause,
  CheckCircle,
  Circle,
  BookOpen,
  Video,
  FileText,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Award,
  Bookmark,
  BookmarkCheck,
  MessageSquare,
  Download,
  Share2,
  MoreVertical,
  Menu,
  X
} from 'lucide-react';
import { VideoPlayer } from '@/components/ui/kibo-video-player';
import { useAuth } from '@/contexts/auth-context';

interface LearningProgress {
  enrollment: {
    id: string;
    overallProgress: number;
    timeSpentMinutes: number;
    currentModuleId?: string;
    currentSectionId?: string;
    lastAccessedAt?: string;
  };
  progress: {
    overallProgress: number;
    totalContentItems: number;
    completedItems: number;
    totalDurationSeconds: number;
    completedDurationSeconds: number;
    modules: LearningModule[];
  };
  recentActivity: any[];
  bookmarks: any[];
}

interface LearningModule {
  id: string;
  title: string;
  orderIndex: number;
  sections: LearningSection[];
  progress: {
    totalItems: number;
    completedItems: number;
    overallProgress: number;
  };
}

interface LearningSection {
  id: string;
  title: string;
  orderIndex: number;
  contentItems: LearningContentItem[];
  progress: {
    totalItems: number;
    completedItems: number;
    overallProgress: number;
  };
}

interface LearningContentItem {
  id: string;
  title: string;
  type: 'VIDEO' | 'PDF' | 'DOCUMENT' | 'URL' | 'TEXT';
  duration: number;
  orderIndex: number;
  fileUrl?: string;
  content?: string;
  fileName?: string;
  mimeType?: string;
  progress: {
    id?: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
    progressPercentage: number;
    timeSpentSeconds: number;
    lastWatchedPosition: number;
    watchCount: number;
    firstStartedAt?: string;
    lastAccessedAt?: string;
    completedAt?: string;
    studentNotes?: string;
    isBookmarked: boolean;
  };
}

export default function LearnCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useAuth();

  const [courseData, setCourseData] = useState<LearningProgress | null>(null);
  const [currentItem, setCurrentItem] = useState<LearningContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [studentNotes, setStudentNotes] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // Fetch course progress
  useEffect(() => {
    if (params.id && session) {
      fetchCourseProgress();
    }
  }, [params.id, session]);

  // Set initial current item
  useEffect(() => {
    if (courseData && !currentItem) {
      // Find the first incomplete item or the first item
      const firstIncompleteItem = findFirstIncompleteItem();
      if (firstIncompleteItem) {
        setCurrentItem(firstIncompleteItem);
        setStudentNotes(firstIncompleteItem.progress.studentNotes || '');
      }
    }
  }, [courseData]);

  const fetchCourseProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${params.id}/progress`, {
        headers: {
          'x-user-id': session?.user?.id || '',
        },
      });
      const data = await response.json();

      if (data.success) {
        setCourseData(data.data);
      } else {
        // Not enrolled, redirect to course page
        router.push(`/courses/${params.id}`);
      }
    } catch (error) {
      console.error('Error fetching course progress:', error);
      router.push(`/courses/${params.id}`);
    } finally {
      setLoading(false);
    }
  };

  const findFirstIncompleteItem = (): LearningContentItem | null => {
    if (!courseData) return null;

    for (const module of courseData.progress.modules) {
      for (const section of module.sections) {
        for (const item of section.contentItems) {
          if (item.progress.status !== 'COMPLETED') {
            return item;
          }
        }
      }
    }

    // If all completed, return the first item
    return courseData.progress.modules[0]?.sections[0]?.contentItems[0] || null;
  };

  const updateProgress = async (
    contentItemId: string,
    updates: {
      status?: string;
      progressPercentage?: number;
      timeSpentSeconds?: number;
      lastWatchedPosition?: number;
      studentNotes?: string;
      isBookmarked?: boolean;
    }
  ) => {
    try {
      setUpdateLoading(true);
      const response = await fetch(`/api/courses/${params.id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
        },
        body: JSON.stringify({
          contentItemId,
          ...updates,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh course data
        await fetchCourseProgress();
        return true;
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      setUpdateLoading(false);
    }
    return false;
  };

  const markAsComplete = async () => {
    if (!currentItem) return;

    const success = await updateProgress(currentItem.id, {
      status: 'COMPLETED',
      progressPercentage: 100,
    });

    if (success) {
      // Move to next item
      const nextItem = getNextItem();
      if (nextItem) {
        setCurrentItem(nextItem);
        setStudentNotes(nextItem.progress.studentNotes || '');
      }
    }
  };

  const toggleBookmark = async () => {
    if (!currentItem) return;

    await updateProgress(currentItem.id, {
      isBookmarked: !currentItem.progress.isBookmarked,
    });
  };

  const saveNotes = async () => {
    if (!currentItem) return;

    await updateProgress(currentItem.id, {
      studentNotes,
    });
  };

  const getNextItem = (): LearningContentItem | null => {
    if (!courseData || !currentItem) return null;

    let foundCurrent = false;

    for (const module of courseData.progress.modules) {
      for (const section of module.sections) {
        for (const item of section.contentItems) {
          if (foundCurrent) {
            return item;
          }
          if (item.id === currentItem.id) {
            foundCurrent = true;
          }
        }
      }
    }

    return null;
  };

  const getPreviousItem = (): LearningContentItem | null => {
    if (!courseData || !currentItem) return null;

    let previousItem: LearningContentItem | null = null;

    for (const module of courseData.progress.modules) {
      for (const section of module.sections) {
        for (const item of section.contentItems) {
          if (item.id === currentItem.id) {
            return previousItem;
          }
          previousItem = item;
        }
      }
    }

    return null;
  };

  const navigateToItem = (item: LearningContentItem) => {
    setCurrentItem(item);
    setStudentNotes(item.progress.studentNotes || '');
    
    // Mark as started if not already
    if (item.progress.status === 'NOT_STARTED') {
      updateProgress(item.id, {
        status: 'IN_PROGRESS',
        progressPercentage: 0,
      });
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'VIDEO': return <Video className="w-4 h-4" />;
      case 'PDF':
      case 'DOCUMENT': return <FileText className="w-4 h-4" />;
      case 'URL': return <LinkIcon className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'IN_PROGRESS': return <Play className="w-4 h-4 text-blue-500" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="h-screen flex">
        <div className="w-80 border-r bg-muted/10">
          <div className="p-4 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-2 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <Skeleton className="aspect-video w-full" />
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Course not found or access denied</p>
          <Button onClick={() => router.push('/courses')}>
            Browse Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-80 border-r bg-muted/10 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold truncate">Course Progress</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Progress value={courseData.enrollment.overallProgress} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{courseData.progress.completedItems} / {courseData.progress.totalContentItems} lessons</span>
                <span>{courseData.enrollment.overallProgress}%</span>
              </div>
            </div>
          </div>

          {/* Content Navigation */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {courseData.progress.modules.map((module) => (
                <div key={module.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{module.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {module.progress.overallProgress}%
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    {module.sections.map((section) => (
                      <div key={section.id} className="space-y-1">
                        <p className="text-xs text-muted-foreground px-2">
                          {section.title}
                        </p>
                        {section.contentItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => navigateToItem(item)}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-muted/50 transition-colors ${
                              currentItem?.id === item.id ? 'bg-muted' : ''
                            }`}
                          >
                            {getStatusIcon(item.progress.status)}
                            {getContentIcon(item.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{item.title}</p>
                              {item.duration > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {formatDuration(item.duration)}
                                </p>
                              )}
                            </div>
                            {item.progress.isBookmarked && (
                              <BookmarkCheck className="w-3 h-3 text-blue-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="font-semibold">{currentItem?.title}</h1>
              <p className="text-sm text-muted-foreground">
                {courseData.progress.completedItems} / {courseData.progress.totalContentItems} completed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleBookmark}
              disabled={updateLoading}
            >
              {currentItem?.progress.isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-blue-500" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {currentItem ? (
            <>
              {/* Video/Content Player */}
              {currentItem.type === 'VIDEO' && (
                <div className="aspect-video bg-black">
                  {currentItem.fileUrl ? (
                    <VideoPlayer
                      src={currentItem.fileUrl}
                      className="w-full h-full"
                      onTimeUpdate={(currentTime, duration) => {
                        if (currentTime > currentItem.progress.lastWatchedPosition + 10) {
                          updateProgress(currentItem.id, {
                            lastWatchedPosition: Math.floor(currentTime),
                            timeSpentSeconds: currentItem.progress.timeSpentSeconds + 10,
                            progressPercentage: Math.min(100, (currentTime / duration) * 100),
                            status: currentTime / duration > 0.9 ? 'COMPLETED' : 'IN_PROGRESS',
                          });
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <div className="text-center">
                        <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg">Video not available</p>
                        <p className="text-sm text-muted-foreground">The video file is missing or unavailable.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Document/URL/Text Content */}
              {currentItem.type !== 'VIDEO' && (
                <div className="p-8 flex-1 overflow-auto">
                  <div className="max-w-4xl mx-auto">
                    {currentItem.type === 'PDF' && (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-semibold mb-2">PDF Document</h3>
                        <p className="text-muted-foreground mb-4">
                          {currentItem.title}
                        </p>
                        {currentItem.fileUrl ? (
                          <Button asChild>
                            <a href={currentItem.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </a>
                          </Button>
                        ) : (
                          <div className="text-muted-foreground">
                            <p>PDF file not available</p>
                          </div>
                        )}
                      </div>
                    )}

                    {currentItem.type === 'URL' && (
                      <div className="text-center py-12">
                        <LinkIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-semibold mb-2">External Resource</h3>
                        <p className="text-muted-foreground mb-4">
                          {currentItem.title}
                        </p>
                        {currentItem.content ? (
                          <Button asChild>
                            <a href={currentItem.content} target="_blank" rel="noopener noreferrer">
                              Open Link
                            </a>
                          </Button>
                        ) : (
                          <div className="text-muted-foreground">
                            <p>URL not available</p>
                          </div>
                        )}
                      </div>
                    )}

                    {currentItem.type === 'TEXT' && (
                      <div className="prose max-w-none">
                        <h1>{currentItem.title}</h1>
                        <p>This is placeholder text content for the lesson.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Controls */}
              <div className="border-t p-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const prev = getPreviousItem();
                      if (prev) navigateToItem(prev);
                    }}
                    disabled={!getPreviousItem()}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {currentItem.progress.status !== 'COMPLETED' && (
                      <Button onClick={markAsComplete} disabled={updateLoading}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={() => {
                      const next = getNextItem();
                      if (next) {
                        navigateToItem(next);
                      } else {
                        // Course completed
                        router.push(`/courses/${params.id}?completed=true`);
                      }
                    }}
                    disabled={!getNextItem() && courseData.enrollment.overallProgress !== 100}
                  >
                    {!getNextItem() && courseData.enrollment.overallProgress === 100 ? (
                      <>
                        <Award className="w-4 h-4 mr-2" />
                        Complete Course
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Select a lesson to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes Panel (if needed) */}
      {/* This could be a collapsible side panel for taking notes */}
    </div>
  );
}