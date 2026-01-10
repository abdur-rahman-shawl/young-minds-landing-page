"use client"

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Clock,
  Settings,
  Save,
  AlertCircle,
  Copy,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Globe,
  Shield,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { WeeklyScheduleEditor } from './weekly-schedule-editor';
import { AvailabilitySettings } from './availability-settings';
import { AvailabilityExceptions } from './availability-exceptions';
import { AvailabilityTemplates } from './availability-templates';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TimeBlock {
  startTime: string;
  endTime: string;
  type: 'AVAILABLE' | 'BREAK' | 'BUFFER' | 'BLOCKED';
  maxBookings?: number;
}

interface WeeklyPattern {
  dayOfWeek: number;
  isEnabled: boolean;
  timeBlocks: TimeBlock[];
}

interface AvailabilitySchedule {
  timezone: string;
  defaultSessionDuration: number;
  bufferTimeBetweenSessions: number;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  defaultStartTime?: string;
  defaultEndTime?: string;
  isActive: boolean;
  allowInstantBooking: boolean;
  requireConfirmation: boolean;
  weeklyPatterns: WeeklyPattern[];
}

export function MentorAvailabilityManager() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  const [schedule, setSchedule] = useState<AvailabilitySchedule>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    defaultSessionDuration: 60,
    bufferTimeBetweenSessions: 15,
    minAdvanceBookingHours: 24,
    maxAdvanceBookingDays: 90,
    defaultStartTime: '09:00:00',
    defaultEndTime: '17:00:00',
    isActive: true,
    allowInstantBooking: true,
    requireConfirmation: false,
    weeklyPatterns: []
  });

  const [originalSchedule, setOriginalSchedule] = useState<AvailabilitySchedule | null>(null);

  // Fetch current availability
  const fetchAvailability = useCallback(async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/mentors/${session.user.id}/availability`);
      const data = await response.json();

      if (response.ok && data.schedule) {
        const loadedSchedule: AvailabilitySchedule = {
          timezone: data.schedule.timezone,
          defaultSessionDuration: data.schedule.defaultSessionDuration,
          bufferTimeBetweenSessions: data.schedule.bufferTimeBetweenSessions,
          minAdvanceBookingHours: data.schedule.minAdvanceBookingHours,
          maxAdvanceBookingDays: data.schedule.maxAdvanceBookingDays,
          defaultStartTime: data.schedule.defaultStartTime,
          defaultEndTime: data.schedule.defaultEndTime,
          isActive: data.schedule.isActive,
          allowInstantBooking: data.schedule.allowInstantBooking,
          requireConfirmation: data.schedule.requireConfirmation,
          weeklyPatterns: data.weeklyPatterns.map((pattern: any) => ({
            dayOfWeek: pattern.dayOfWeek,
            isEnabled: pattern.isEnabled,
            timeBlocks: pattern.timeBlocks || []
          }))
        };

        setSchedule(loadedSchedule);
        setOriginalSchedule(loadedSchedule);
      } else if (data.schedule === null) {
        // No schedule exists, initialize with defaults
        initializeDefaultSchedule();
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      toast.error('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Initialize default schedule
  const initializeDefaultSchedule = () => {
    const defaultPatterns: WeeklyPattern[] = [];

    // Monday to Friday, 9 AM to 5 PM with lunch break
    for (let day = 1; day <= 5; day++) {
      defaultPatterns.push({
        dayOfWeek: day,
        isEnabled: true,
        timeBlocks: [
          {
            startTime: '09:00',
            endTime: '12:00',
            type: 'AVAILABLE',
            maxBookings: 1
          },
          {
            startTime: '12:00',
            endTime: '13:00',
            type: 'BREAK'
          },
          {
            startTime: '13:00',
            endTime: '17:00',
            type: 'AVAILABLE',
            maxBookings: 1
          }
        ]
      });
    }

    // Weekend - disabled by default
    for (let day = 0; day <= 6; day += 6) {
      defaultPatterns.push({
        dayOfWeek: day,
        isEnabled: false,
        timeBlocks: []
      });
    }

    setSchedule(prev => ({
      ...prev,
      weeklyPatterns: defaultPatterns
    }));
  };

  // Save availability
  const saveAvailability = async () => {
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      const method = originalSchedule ? 'PUT' : 'POST';
      const response = await fetch(`/api/mentors/${session.user.id}/availability`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedule),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Availability saved successfully');
        setOriginalSchedule(schedule);
        setHasChanges(false);
      } else {
        toast.error(data.error || 'Failed to save availability');
      }
    } catch (error) {
      console.error('Failed to save availability:', error);
      toast.error('Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  // Handle schedule changes
  const updateSchedule = (updates: Partial<AvailabilitySchedule>) => {
    setSchedule(prev => ({
      ...prev,
      ...updates
    }));
    setHasChanges(true);
  };

  // Handle weekly pattern changes
  const updateWeeklyPattern = (dayOfWeek: number, pattern: Partial<WeeklyPattern>) => {
    setSchedule(prev => {
      const patterns = [...prev.weeklyPatterns];
      const index = patterns.findIndex(p => p.dayOfWeek === dayOfWeek);

      if (index >= 0) {
        patterns[index] = { ...patterns[index], ...pattern };
      } else {
        patterns.push({
          dayOfWeek,
          isEnabled: false,
          timeBlocks: [],
          ...pattern
        });
      }

      return {
        ...prev,
        weeklyPatterns: patterns
      };
    });
    setHasChanges(true);
  };

  // Apply template
  const applyTemplate = (template: any) => {
    setSchedule(prev => ({
      ...prev,
      ...template.configuration
    }));
    setHasChanges(true);
    toast.success(`Template "${template.name}" applied successfully`);
  };

  // Copy week pattern
  const copyWeekPattern = () => {
    const weekPatternJson = JSON.stringify(schedule.weeklyPatterns);
    navigator.clipboard.writeText(weekPatternJson);
    toast.success('Week pattern copied to clipboard');
  };

  // Reset changes
  const resetChanges = () => {
    if (originalSchedule) {
      setSchedule(originalSchedule);
      setHasChanges(false);
      toast.info('Changes reset');
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading your schedule...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Availability Management</h2>
          <p className="text-sm text-muted-foreground">
            Configure when mentees can book sessions with you
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <Button
              variant="outline"
              onClick={resetChanges}
              disabled={saving}
              className="text-muted-foreground"
            >
              Reset
            </Button>
          )}
          <Button
            onClick={saveAvailability}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>Unsaved Changes</AlertTitle>
          <AlertDescription>
            You have unsaved changes to your schedule. Don't forget to save when you're done.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-muted ${schedule.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                {schedule.isActive ? <CheckCircle2 className="h-6 w-6" /> : <Settings className="h-6 w-6" />}
              </div>
              <div>
                <p className="font-semibold text-base sm:text-lg">
                  Availability Status
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant={schedule.isActive ? "default" : "secondary"} className={schedule.isActive ? "bg-green-500 hover:bg-green-600" : ""}>
                    {schedule.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-sm text-muted-foreground hidden sm:inline-block">
                    — {schedule.isActive ? 'You are accepting new bookings' : 'Bookings are currently paused'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="availability-mode" className="text-sm font-medium hidden sm:block">
                {schedule.isActive ? 'On' : 'Off'}
              </Label>
              <Switch
                id="availability-mode"
                checked={schedule.isActive}
                onCheckedChange={(checked) => updateSchedule({ isActive: checked })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                <p className="font-medium text-foreground">{schedule.timezone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Session Duration</p>
                <p className="font-medium text-foreground">{schedule.defaultSessionDuration} minutes</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Booking Mode</p>
                <p className="font-medium text-foreground">
                  {schedule.allowInstantBooking ? 'Instant Booking' : 'Manual Confirmation'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Exceptions</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="schedule" className="space-y-4 m-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <div className="space-y-1">
                  <CardTitle>Weekly Schedule</CardTitle>
                  <CardDescription>
                    Define your standard weekly availability
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyWeekPattern}
                  className="gap-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copy Week Config</span>
                </Button>
              </CardHeader>
              <CardContent>
                <WeeklyScheduleEditor
                  weeklyPatterns={schedule.weeklyPatterns}
                  onPatternChange={updateWeeklyPattern}
                  timezone={schedule.timezone}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Booking Settings</CardTitle>
                <CardDescription>Configure rules for how mentees can book time with you</CardDescription>
              </CardHeader>
              <CardContent>
                <AvailabilitySettings
                  schedule={schedule}
                  onUpdate={updateSchedule}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exceptions" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Date-Specific Exceptions</CardTitle>
                <CardDescription>Override your weekly schedule for specific dates (holidays, time off, etc.)</CardDescription>
              </CardHeader>
              <CardContent>
                <AvailabilityExceptions
                  mentorId={session?.user?.id}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Templates</CardTitle>
                <CardDescription>Save and load different availability configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <AvailabilityTemplates
                  currentSchedule={schedule}
                  onApplyTemplate={applyTemplate}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}