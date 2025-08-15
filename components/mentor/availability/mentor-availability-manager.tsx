"use client"

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Zap
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Availability Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Set your availability for mentoring sessions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Button
              variant="outline"
              onClick={resetChanges}
              disabled={saving}
            >
              Reset Changes
            </Button>
          )}
          <Button
            onClick={saveAvailability}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${schedule.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Availability Status
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {schedule.isActive ? 'Accepting bookings' : 'Not accepting bookings'}
                </p>
              </div>
            </div>
            
            <Switch
              checked={schedule.isActive}
              onCheckedChange={(checked) => updateSchedule({ isActive: checked })}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Timezone</p>
                <p className="font-medium">{schedule.timezone}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Session Duration</p>
                <p className="font-medium">{schedule.defaultSessionDuration} minutes</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Booking Mode</p>
                <p className="font-medium">
                  {schedule.allowInstantBooking ? 'Instant' : 'Requires Confirmation'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Exceptions
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Zap className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Weekly Schedule</CardTitle>
                  <CardDescription>
                    Set your regular weekly availability pattern
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyWeekPattern}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Week
                </Button>
              </div>
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

        <TabsContent value="settings" className="space-y-4">
          <AvailabilitySettings
            schedule={schedule}
            onUpdate={updateSchedule}
          />
        </TabsContent>

        <TabsContent value="exceptions" className="space-y-4">
          <AvailabilityExceptions
            mentorId={session?.user?.id}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <AvailabilityTemplates
            currentSchedule={schedule}
            onApplyTemplate={applyTemplate}
          />
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips:</strong> Set your regular weekly schedule, then add exceptions for holidays or special dates. 
          Use templates for quick setup or to switch between different availability patterns.
        </AlertDescription>
      </Alert>
    </div>
  );
}