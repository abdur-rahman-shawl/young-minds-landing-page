"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Calendar, 
  Globe, 
  Shield, 
  Zap,
  AlertCircle,
  Timer,
  CalendarClock
} from 'lucide-react';

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
  weeklyPatterns: any[];
}

interface AvailabilitySettingsProps {
  schedule: AvailabilitySchedule;
  onUpdate: (updates: Partial<AvailabilitySchedule>) => void;
}

// Common timezones
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

// Session duration options
const SESSION_DURATIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

// Buffer time options
const BUFFER_TIMES = [
  { value: 0, label: 'No buffer' },
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
];

export function AvailabilitySettings({
  schedule,
  onUpdate
}: AvailabilitySettingsProps) {
  return (
    <div className="space-y-6">
      {/* Time Zone Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Time Zone
          </CardTitle>
          <CardDescription>
            Set your local time zone for scheduling sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Your Time Zone</Label>
            <Select
              value={schedule.timezone}
              onValueChange={(value) => onUpdate({ timezone: value })}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select your time zone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All times will be displayed in this time zone
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Configuration
          </CardTitle>
          <CardDescription>
            Configure default session duration and buffer times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-duration">Default Session Duration</Label>
              <Select
                value={schedule.defaultSessionDuration.toString()}
                onValueChange={(value) => onUpdate({ defaultSessionDuration: parseInt(value) })}
              >
                <SelectTrigger id="session-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_DURATIONS.map(duration => (
                    <SelectItem key={duration.value} value={duration.value.toString()}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buffer-time">Buffer Between Sessions</Label>
              <Select
                value={schedule.bufferTimeBetweenSessions.toString()}
                onValueChange={(value) => onUpdate({ bufferTimeBetweenSessions: parseInt(value) })}
              >
                <SelectTrigger id="buffer-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUFFER_TIMES.map(buffer => (
                    <SelectItem key={buffer.value} value={buffer.value.toString()}>
                      {buffer.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Alert>
            <Timer className="h-4 w-4" />
            <AlertDescription>
              Buffer time helps you prepare between sessions and prevents back-to-back bookings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Booking Window */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Booking Window
          </CardTitle>
          <CardDescription>
            Control how far in advance mentees can book sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-advance">Minimum Advance Notice</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="min-advance"
                  type="number"
                  min="0"
                  max="168"
                  value={schedule.minAdvanceBookingHours}
                  onChange={(e) => onUpdate({ minAdvanceBookingHours: parseInt(e.target.value) })}
                />
                <span className="text-sm text-gray-500">hours</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mentees must book at least this far in advance
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-advance">Maximum Advance Booking</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="max-advance"
                  type="number"
                  min="1"
                  max="365"
                  value={schedule.maxAdvanceBookingDays}
                  onChange={(e) => onUpdate({ maxAdvanceBookingDays: parseInt(e.target.value) })}
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mentees can book up to this far in advance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Booking Preferences
          </CardTitle>
          <CardDescription>
            Control how bookings are processed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="instant-booking">Instant Booking</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Allow mentees to instantly book available slots
                </p>
              </div>
              <Switch
                id="instant-booking"
                checked={schedule.allowInstantBooking}
                onCheckedChange={(checked) => onUpdate({ allowInstantBooking: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require-confirmation">Require Confirmation</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manually approve each booking request
                </p>
              </div>
              <Switch
                id="require-confirmation"
                checked={schedule.requireConfirmation}
                onCheckedChange={(checked) => onUpdate({ requireConfirmation: checked })}
              />
            </div>
          </div>

          {schedule.requireConfirmation && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                When confirmation is required, you'll need to manually approve each booking request. 
                Mentees will be notified once you confirm or decline their request.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Default Business Hours
          </CardTitle>
          <CardDescription>
            Set default start and end times for your availability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Default Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={schedule.defaultStartTime?.slice(0, 5) || '09:00'}
                onChange={(e) => onUpdate({ defaultStartTime: `${e.target.value}:00` })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">Default End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={schedule.defaultEndTime?.slice(0, 5) || '17:00'}
                onChange={(e) => onUpdate({ defaultEndTime: `${e.target.value}:00` })}
              />
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            These times will be used as defaults when setting up new availability patterns
          </p>
        </CardContent>
      </Card>
    </div>
  );
}