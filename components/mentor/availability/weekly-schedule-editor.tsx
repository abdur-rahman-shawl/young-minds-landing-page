"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateTimeBlock, mergeAndSortTimeBlocks } from '@/lib/utils/availability-validation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Copy, Clock, Coffee, AlertCircle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

interface WeeklyScheduleEditorProps {
  weeklyPatterns: WeeklyPattern[];
  onPatternChange: (dayOfWeek: number, pattern: Partial<WeeklyPattern>) => void;
  timezone: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const BLOCK_TYPE_VARIANTS = {
  AVAILABLE: 'success',
  BREAK: 'warning',
  BUFFER: 'default',
  BLOCKED: 'destructive',
} as const;

const BLOCK_TYPE_LABELS = {
  AVAILABLE: { label: 'Available', icon: Check, color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  BREAK: { label: 'Break', icon: Coffee, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
  BUFFER: { label: 'Buffer', icon: Clock, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  BLOCKED: { label: 'Blocked', icon: AlertCircle, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
};

export function WeeklyScheduleEditor({
  weeklyPatterns,
  onPatternChange,
  timezone
}: WeeklyScheduleEditorProps) {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get pattern for a specific day
  const getPatternForDay = (dayOfWeek: number): WeeklyPattern => {
    const pattern = weeklyPatterns.find(p => p.dayOfWeek === dayOfWeek);
    return pattern || { dayOfWeek, isEnabled: false, timeBlocks: [] };
  };

  // Toggle day enabled/disabled
  const toggleDay = (dayOfWeek: number) => {
    const pattern = getPatternForDay(dayOfWeek);
    onPatternChange(dayOfWeek, { isEnabled: !pattern.isEnabled });
  };

  // Add time block
  const addTimeBlock = (dayOfWeek: number) => {
    setEditingDay(dayOfWeek);
    setEditingBlock({
      startTime: '09:00',
      endTime: '10:00',
      type: 'AVAILABLE',
      maxBookings: 1
    });
    setEditingBlockIndex(null);
    setValidationErrors([]);
    setBlockDialogOpen(true);
  };

  // Edit time block
  const editTimeBlock = (dayOfWeek: number, blockIndex: number) => {
    const pattern = getPatternForDay(dayOfWeek);
    setEditingDay(dayOfWeek);
    setEditingBlock({ ...pattern.timeBlocks[blockIndex] });
    setEditingBlockIndex(blockIndex);
    setValidationErrors([]);
    setBlockDialogOpen(true);
  };

  // Validate time block before saving
  const validateBeforeSave = (): boolean => {
    if (editingDay === null || !editingBlock) return false;

    const pattern = getPatternForDay(editingDay);
    // Exclude the block being edited from validation (if editing)
    const otherBlocks = editingBlockIndex !== null
      ? pattern.timeBlocks.filter((_, index) => index !== editingBlockIndex)
      : pattern.timeBlocks;

    const validation = validateTimeBlock(editingBlock, otherBlocks);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return false;
    }

    setValidationErrors([]);
    return true;
  };

  // Save time block
  const saveTimeBlock = () => {
    if (!validateBeforeSave()) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    if (editingDay === null || !editingBlock) return;

    const pattern = getPatternForDay(editingDay);
    let blocks = [...pattern.timeBlocks];

    if (editingBlockIndex !== null) {
      // Editing existing block
      blocks[editingBlockIndex] = editingBlock;
    } else {
      // Adding new block
      blocks.push(editingBlock);
    }

    // Sort and merge overlapping AVAILABLE blocks if any
    blocks = mergeAndSortTimeBlocks(blocks);

    onPatternChange(editingDay, { timeBlocks: blocks });
    toast.success('Time block saved successfully');

    // Reset dialog state
    setBlockDialogOpen(false);
    setEditingBlock(null);
    setEditingDay(null);
    setEditingBlockIndex(null);
    setValidationErrors([]);
  };

  // Delete time block
  const deleteTimeBlock = (dayOfWeek: number, blockIndex: number) => {
    const pattern = getPatternForDay(dayOfWeek);
    const blocks = pattern.timeBlocks.filter((_, index) => index !== blockIndex);
    onPatternChange(dayOfWeek, { timeBlocks: blocks });
  };

  // Copy day schedule to other days
  const copyDaySchedule = (sourceDay: number, targetDays: number[]) => {
    const sourcePattern = getPatternForDay(sourceDay);
    targetDays.forEach(day => {
      onPatternChange(day, {
        isEnabled: sourcePattern.isEnabled,
        timeBlocks: [...sourcePattern.timeBlocks]
      });
    });
    toast.success(`Copied schedule to ${targetDays.length} other days`);
  };

  // Apply common patterns
  const applyCommonPattern = (pattern: 'weekdays' | 'weekends' | 'all') => {
    const weekdays = [1, 2, 3, 4, 5];
    const weekends = [0, 6];
    const targetDays = pattern === 'weekdays' ? weekdays : pattern === 'weekends' ? weekends : [...weekdays, ...weekends];

    const defaultBlocks: TimeBlock[] = [
      { startTime: '09:00', endTime: '12:00', type: 'AVAILABLE', maxBookings: 1 },
      { startTime: '12:00', endTime: '13:00', type: 'BREAK' },
      { startTime: '13:00', endTime: '17:00', type: 'AVAILABLE', maxBookings: 1 }
    ];

    targetDays.forEach(day => {
      onPatternChange(day, {
        isEnabled: true,
        timeBlocks: defaultBlocks
      });
    });
    toast.success('Applied common schedule pattern');
  };

  // Format time for display
  const formatTimeBlock = (block: TimeBlock) => {
    return `${block.startTime} - ${block.endTime}`;
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
        <span className="text-sm font-medium text-muted-foreground mr-2">Quick Actions:</span>
        <Button
          variant="outline"
          size="sm"
          className="bg-background h-8"
          onClick={() => applyCommonPattern('weekdays')}
        >
          Reset Weekdays (9-5)
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-background h-8"
          onClick={() => applyCommonPattern('weekends')}
        >
          Reset Weekends
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-background h-8"
          onClick={() => applyCommonPattern('all')}
        >
          Reset All Days
        </Button>
      </div>

      {/* Days Grid */}
      <div className="space-y-4">
        {DAYS_OF_WEEK.map(day => {
          const pattern = getPatternForDay(day.value);

          return (
            <div
              key={day.value}
              className={cn(
                "rounded-xl border transition-all duration-200",
                pattern.isEnabled
                  ? "border-primary/20 bg-card shadow-sm"
                  : "border-border/50 bg-muted/20 opacity-80"
              )}
            >
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={pattern.isEnabled}
                    onCheckedChange={() => toggleDay(day.value)}
                    className="data-[state=checked]:bg-primary"
                  />
                  <div className="flex flex-col">
                    <Label className="text-base font-semibold cursor-pointer" onClick={() => toggleDay(day.value)}>
                      {day.label}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {pattern.isEnabled
                        ? `${pattern.timeBlocks.length} blocks configured`
                        : 'Day disabled'}
                    </span>
                  </div>
                </div>

                {pattern.isEnabled && (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const otherDays = DAYS_OF_WEEK
                          .filter(d => d.value !== day.value)
                          .map(d => d.value);
                        copyDaySchedule(day.value, otherDays);
                      }}
                      className="gap-1.5 text-muted-foreground hover:text-foreground h-8"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Copy to All</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addTimeBlock(day.value)}
                      className="gap-1.5 h-8 border-dashed border-primary/30 hover:border-primary/60 text-primary hover:text-primary hover:bg-primary/5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Block
                    </Button>
                  </div>
                )}
              </div>

              {pattern.isEnabled && pattern.timeBlocks.length > 0 && (
                <div className="px-4 pb-4 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pattern.timeBlocks.map((block, index) => {
                      const style = BLOCK_TYPE_LABELS[block.type];
                      const Icon = style.icon;

                      return (
                        <div
                          key={index}
                          className={cn(
                            "group flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors",
                            style.color
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("p-1.5 rounded-md bg-white/50 dark:bg-black/20")}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium opacity-80 uppercase tracking-wider">{style.label}</span>
                              <span className="text-sm font-semibold tracking-tight">{formatTimeBlock(block)}</span>
                            </div>
                          </div>

                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-black/5 dark:hover:bg-white/10"
                              onClick={() => editTimeBlock(day.value, index)}
                            >
                              <span className="sr-only">Edit</span>
                              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.95974 12.4914 2.00173 12.709 2.14646 12.8538C2.29119 12.9986 2.50886 13.0405 2.69722 12.9598L6.10866 11.4977C6.22569 11.4476 6.33207 11.3756 6.42198 11.2857L13.8536 3.85406C14.0488 3.6588 14.0488 3.34222 13.8536 3.14697L11.8536 1.14645ZM11.2145 3.92497L11.0754 3.78587L3.21455 11.6468L2.70425 12.2959L2.70417 12.296L2.14646 12.8537L2.85354 12.1466L3.35368 12.2857L3.92461 11.2145L11.7856 3.35338L11.6465 3.21428L11.2145 3.92497Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => deleteTimeBlock(day.value, index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pattern.isEnabled && pattern.timeBlocks.length === 0 && (
                <div className="px-4 pb-6 pt-2 flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => addTimeBlock(day.value)}
                    className="w-full border border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary h-12"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first time block for {day.label}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time Block Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? 'Edit Time Block' : 'Add Time Block'}
            </DialogTitle>
            <DialogDescription>
              Configure the time window and type for this slot ({DAYS_OF_WEEK.find(d => d.value === editingDay)?.label})
            </DialogDescription>
          </DialogHeader>

          {editingBlock && (
            <div className="space-y-4 py-4">
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="start-time"
                      type="time"
                      className="pl-9"
                      value={editingBlock.startTime}
                      onChange={(e) => {
                        setEditingBlock({
                          ...editingBlock,
                          startTime: e.target.value
                        });
                        if (validationErrors.length > 0) setValidationErrors([]);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="end-time"
                      type="time"
                      className="pl-9"
                      value={editingBlock.endTime}
                      onChange={(e) => {
                        setEditingBlock({
                          ...editingBlock,
                          endTime: e.target.value
                        });
                        if (validationErrors.length > 0) setValidationErrors([]);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="block-type">Block Type</Label>
                <Select
                  value={editingBlock.type}
                  onValueChange={(value: TimeBlock['type']) =>
                    setEditingBlock({ ...editingBlock, type: value })
                  }
                >
                  <SelectTrigger id="block-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Available for Booking
                      </div>
                    </SelectItem>
                    <SelectItem value="BREAK">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Break Time
                      </div>
                    </SelectItem>
                    <SelectItem value="BUFFER">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        Buffer Time
                      </div>
                    </SelectItem>
                    <SelectItem value="BLOCKED">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Blocked
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingBlock.type === 'AVAILABLE' && (
                <div className="space-y-2">
                  <Label htmlFor="max-bookings">Max Concurrent Bookings</Label>
                  <Input
                    id="max-bookings"
                    type="number"
                    min="1"
                    max="10"
                    value={editingBlock.maxBookings || 1}
                    onChange={(e) => setEditingBlock({
                      ...editingBlock,
                      maxBookings: parseInt(e.target.value)
                    })}
                  />
                  <p className="text-[0.8rem] text-muted-foreground">
                    How many mentees can book this slot simultaneously
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTimeBlock}>
              Save Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}