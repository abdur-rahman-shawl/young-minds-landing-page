"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CalendarOff, 
  Plus, 
  Trash2, 
  Clock,
  AlertCircle,
  Plane,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { toast } from 'sonner';

interface Exception {
  id: string;
  startDate: string;
  endDate: string;
  type: 'AVAILABLE' | 'BREAK' | 'BUFFER' | 'BLOCKED';
  reason?: string;
  isFullDay: boolean;
  timeBlocks?: any[];
}

interface AvailabilityExceptionsProps {
  mentorId?: string;
}

export function AvailabilityExceptions({ mentorId }: AvailabilityExceptionsProps) {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [exceptionForm, setExceptionForm] = useState({
    type: 'BLOCKED' as Exception['type'],
    reason: '',
    isFullDay: true,
    startTime: '09:00',
    endTime: '17:00'
  });

  // Fetch exceptions
  const fetchExceptions = async () => {
    if (!mentorId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/mentors/${mentorId}/availability/exceptions`);
      const data = await response.json();

      if (response.ok) {
        setExceptions(data.exceptions || []);
      }
    } catch (error) {
      console.error('Failed to fetch exceptions:', error);
      toast.error('Failed to load exceptions');
    } finally {
      setLoading(false);
    }
  };

  // Create exception
  const createException = async () => {
    if (!mentorId || selectedDates.length === 0) return;

    const startDate = selectedDates[0];
    const endDate = selectedDates[selectedDates.length - 1] || startDate;

    try {
      const response = await fetch(`/api/mentors/${mentorId}/availability/exceptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          type: exceptionForm.type,
          reason: exceptionForm.reason,
          isFullDay: exceptionForm.isFullDay,
          timeBlocks: exceptionForm.isFullDay ? undefined : [{
            startTime: exceptionForm.startTime,
            endTime: exceptionForm.endTime,
            type: exceptionForm.type
          }]
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Exception added successfully');
        fetchExceptions();
        setDialogOpen(false);
        setSelectedDates([]);
        setExceptionForm({
          type: 'BLOCKED',
          reason: '',
          isFullDay: true,
          startTime: '09:00',
          endTime: '17:00'
        });
      } else {
        toast.error(data.error || 'Failed to create exception');
      }
    } catch (error) {
      console.error('Failed to create exception:', error);
      toast.error('Failed to create exception');
    }
  };

  // Delete exception
  const deleteException = async (exceptionId: string) => {
    if (!mentorId) return;

    try {
      const response = await fetch(`/api/mentors/${mentorId}/availability/exceptions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exceptionIds: [exceptionId]
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Exception removed');
        fetchExceptions();
      } else {
        toast.error(data.error || 'Failed to delete exception');
      }
    } catch (error) {
      console.error('Failed to delete exception:', error);
      toast.error('Failed to delete exception');
    }
  };

  // Quick add exceptions
  const quickAddException = (type: 'vacation' | 'holiday' | 'conference') => {
    let dates: Date[] = [];
    let reason = '';

    switch (type) {
      case 'vacation':
        dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i + 7));
        reason = 'Vacation';
        break;
      case 'holiday':
        dates = [addDays(new Date(), 14)];
        reason = 'Public Holiday';
        break;
      case 'conference':
        dates = Array.from({ length: 3 }, (_, i) => addDays(new Date(), i + 21));
        reason = 'Conference Attendance';
        break;
    }

    setSelectedDates(dates);
    setExceptionForm(prev => ({
      ...prev,
      reason,
      type: 'BLOCKED'
    }));
    setDialogOpen(true);
  };

  useEffect(() => {
    fetchExceptions();
  }, [mentorId]);

  const getExceptionColor = (type: Exception['type']) => {
    switch (type) {
      case 'BLOCKED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'AVAILABLE':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'BREAK':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Availability Exceptions
          </CardTitle>
          <CardDescription>
            Mark specific dates when your regular availability doesn't apply
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Exception
            </Button>
            
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Quick Add:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickAddException('vacation')}
                className="gap-1"
              >
                <Plane className="h-3 w-3" />
                Vacation
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickAddException('holiday')}
                className="gap-1"
              >
                <CalendarIcon className="h-3 w-3" />
                Holiday
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => quickAddException('conference')}
                className="gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                Conference
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exceptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Exceptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : exceptions.length === 0 ? (
            <div className="text-center py-8">
              <CalendarOff className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No exceptions set. Your regular schedule applies every week.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {exceptions.map((exception) => {
                const startDate = new Date(exception.startDate);
                const endDate = new Date(exception.endDate);
                const isSingleDay = isSameDay(startDate, endDate);

                return (
                  <div
                    key={exception.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarOff className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {isSingleDay
                              ? format(startDate, 'MMMM d, yyyy')
                              : `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`}
                          </span>
                          <Badge className={getExceptionColor(exception.type)}>
                            {exception.type}
                          </Badge>
                          {!exception.isFullDay && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Partial Day
                            </Badge>
                          )}
                        </div>
                        {exception.reason && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {exception.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteException(exception.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Exception Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Availability Exception</DialogTitle>
            <DialogDescription>
              Mark dates when your regular availability doesn't apply
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Select Dates</Label>
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                className="rounded-md border"
                disabled={(date) => date < new Date()}
              />
              {selectedDates.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedDates.length} day(s) selected
                </p>
              )}
            </div>

            {/* Full Day Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="full-day">Full Day Exception</Label>
              <Switch
                id="full-day"
                checked={exceptionForm.isFullDay}
                onCheckedChange={(checked) => 
                  setExceptionForm(prev => ({ ...prev, isFullDay: checked }))
                }
              />
            </div>

            {/* Time Range (if not full day) */}
            {!exceptionForm.isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={exceptionForm.startTime}
                    onChange={(e) => 
                      setExceptionForm(prev => ({ ...prev, startTime: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={exceptionForm.endTime}
                    onChange={(e) => 
                      setExceptionForm(prev => ({ ...prev, endTime: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Vacation, Conference, Personal day..."
                value={exceptionForm.reason}
                onChange={(e) => 
                  setExceptionForm(prev => ({ ...prev, reason: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createException}
              disabled={selectedDates.length === 0}
            >
              Add Exception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}