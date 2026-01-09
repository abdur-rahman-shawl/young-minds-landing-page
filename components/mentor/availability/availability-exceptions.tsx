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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarOff,
  Plus,
  Trash2,
  Clock,
  AlertCircle,
  Plane,
  Calendar as CalendarIcon,
  CheckCircle2,
  Coffee
} from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'AVAILABLE':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'BREAK':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Availability Exceptions</h3>
          <p className="text-sm text-muted-foreground">
            Mark specific dates when your schedule differs from normal
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setDialogOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Add Exception
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2 items-center justify-center border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
          onClick={() => quickAddException('vacation')}
        >
          <Plane className="h-6 w-6 text-primary" />
          <div className="text-center">
            <span className="font-medium block">Vacation</span>
            <span className="text-xs text-muted-foreground">Block 1 week off</span>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2 items-center justify-center border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
          onClick={() => quickAddException('holiday')}
        >
          <CalendarIcon className="h-6 w-6 text-primary" />
          <div className="text-center">
            <span className="font-medium block">Public Holiday</span>
            <span className="text-xs text-muted-foreground">Block a single day</span>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2 items-center justify-center border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
          onClick={() => quickAddException('conference')}
        >
          <AlertCircle className="h-6 w-6 text-primary" />
          <div className="text-center">
            <span className="font-medium block">Conference</span>
            <span className="text-xs text-muted-foreground">Block 3 days</span>
          </div>
        </Button>
      </div>

      {/* Exceptions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Scheduled Exceptions</h4>
          <Badge variant="outline" className="font-normal">
            {exceptions.length} Active
          </Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : exceptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border rounded-xl bg-muted/20 border-dashed">
            <CalendarOff className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-muted-foreground">No exceptions scheduled</p>
            <p className="text-sm text-muted-foreground/70">Your regular weekly schedule applies for all dates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exceptions.map((exception) => {
              const startDate = new Date(exception.startDate);
              const endDate = new Date(exception.endDate);
              const isSingleDay = isSameDay(startDate, endDate);
              const colorClass = getExceptionColor(exception.type);

              return (
                <div
                  key={exception.id}
                  className="relative flex flex-col justify-between p-4 rounded-lg border bg-card hover:bg-muted/10 transition-colors group"
                >
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteException(exception.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-md border", colorClass)}>
                        {exception.type === 'BLOCKED' ? <CalendarOff className="h-5 w-5" /> :
                          exception.type === 'AVAILABLE' ? <CheckCircle2 className="h-5 w-5" /> :
                            <Coffee className="h-5 w-5" />}
                      </div>
                      <div>
                        <h5 className="font-medium text-sm">
                          {exception.reason || 'No reason provided'}
                        </h5>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn("text-[10px] h-5 border-0 px-1.5", colorClass, "bg-opacity-50")}>
                            {exception.type}
                          </Badge>
                          {!exception.isFullDay && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                              Partial Day
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pl-12 text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5 opacity-70" />
                        <span>
                          {isSingleDay
                            ? format(startDate, 'EEE, MMMM d, yyyy')
                            : `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`}
                        </span>
                      </div>
                      {!exception.isFullDay && exception.timeBlocks && exception.timeBlocks[0] && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 opacity-70" />
                          <span>
                            {exception.timeBlocks[0].startTime} - {exception.timeBlocks[0].endTime}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Exception Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Availability Exception</DialogTitle>
            <DialogDescription>
              Mark dates when your regular availability doesn't apply
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Date Selection */}
              <div className="space-y-3">
                <Label>Select Dates</Label>
                <div className="border rounded-md flex justify-center p-2 bg-background">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    className="rounded-md"
                    disabled={(date) => date < addDays(new Date(), -1)}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {selectedDates.length === 0 ? "Select one or more dates" : `${selectedDates.length} day(s) selected`}
                </p>
              </div>

              {/* Right Column Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Exception Type</Label>
                  <Select
                    value={exceptionForm.type}
                    onValueChange={(val: Exception['type']) => setExceptionForm({ ...exceptionForm, type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BLOCKED">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          Blocked (Unavailable)
                        </div>
                      </SelectItem>
                      <SelectItem value="AVAILABLE">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          Available (Extra hours)
                        </div>
                      </SelectItem>
                      <SelectItem value="BREAK">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          Break
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-base">Full Day</Label>
                    <p className="text-xs text-muted-foreground">Applies to entire 24h</p>
                  </div>
                  <Switch
                    checked={exceptionForm.isFullDay}
                    onCheckedChange={(checked) =>
                      setExceptionForm(prev => ({ ...prev, isFullDay: checked }))
                    }
                  />
                </div>

                {!exceptionForm.isFullDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Start Time</Label>
                      <Input
                        type="time"
                        value={exceptionForm.startTime}
                        onChange={(e) => setExceptionForm({ ...exceptionForm, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">End Time</Label>
                      <Input
                        type="time"
                        value={exceptionForm.endTime}
                        onChange={(e) => setExceptionForm({ ...exceptionForm, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="E.g. Vacation, Sick Leave..."
                    value={exceptionForm.reason}
                    onChange={(e) =>
                      setExceptionForm(prev => ({ ...prev, reason: e.target.value }))
                    }
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
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