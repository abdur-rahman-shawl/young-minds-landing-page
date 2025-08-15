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
import { Plus, Trash2, Copy, Clock, Coffee } from 'lucide-react';
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

const BLOCK_TYPE_COLORS = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  BREAK: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  BUFFER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
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
  };

  // Format time for display
  const formatTimeBlock = (block: TimeBlock) => {
    return `${block.startTime} - ${block.endTime}`;
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex items-center gap-2 pb-4 border-b">
        <span className="text-sm text-gray-600 dark:text-gray-400">Quick Setup:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyCommonPattern('weekdays')}
        >
          Weekdays 9-5
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyCommonPattern('weekends')}
        >
          Weekends
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyCommonPattern('all')}
        >
          All Days
        </Button>
      </div>

      {/* Days Grid */}
      <div className="space-y-3">
        {DAYS_OF_WEEK.map(day => {
          const pattern = getPatternForDay(day.value);
          
          return (
            <div
              key={day.value}
              className={`border rounded-lg p-4 ${
                pattern.isEnabled 
                  ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' 
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={pattern.isEnabled}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <Label className="text-base font-medium cursor-pointer" onClick={() => toggleDay(day.value)}>
                    {day.label}
                  </Label>
                  {pattern.isEnabled && (
                    <Badge variant="secondary" className="text-xs">
                      {pattern.timeBlocks.filter(b => b.type === 'AVAILABLE').length} slots
                    </Badge>
                  )}
                </div>
                
                {pattern.isEnabled && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const otherDays = DAYS_OF_WEEK
                          .filter(d => d.value !== day.value)
                          .map(d => d.value);
                        copyDaySchedule(day.value, otherDays);
                      }}
                      className="gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy to All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addTimeBlock(day.value)}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Block
                    </Button>
                  </div>
                )}
              </div>

              {pattern.isEnabled && (
                <div className="space-y-2">
                  {pattern.timeBlocks.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      No time blocks set. Click "Add Block" to get started.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {pattern.timeBlocks.map((block, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded-md bg-white dark:bg-gray-800"
                        >
                          <div className="flex items-center gap-2">
                            {block.type === 'BREAK' ? (
                              <Coffee className="h-4 w-4 text-amber-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-500" />
                            )}
                            <div>
                              <div className="text-sm font-medium">
                                {formatTimeBlock(block)}
                              </div>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${BLOCK_TYPE_COLORS[block.type]}`}
                              >
                                {block.type}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editTimeBlock(day.value, index)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTimeBlock(day.value, index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time Block Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? 'Edit Time Block' : 'Add Time Block'}
            </DialogTitle>
            <DialogDescription>
              Set the time range and type for this availability block.
            </DialogDescription>
          </DialogHeader>

          {editingBlock && (
            <div className="space-y-4">
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-sm text-red-600 dark:text-red-400">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={editingBlock.startTime}
                    onChange={(e) => {
                      setEditingBlock({
                        ...editingBlock,
                        startTime: e.target.value
                      });
                      // Clear errors on change
                      if (validationErrors.length > 0) {
                        setValidationErrors([]);
                      }
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={editingBlock.endTime}
                    onChange={(e) => {
                      setEditingBlock({
                        ...editingBlock,
                        endTime: e.target.value
                      });
                      // Clear errors on change
                      if (validationErrors.length > 0) {
                        setValidationErrors([]);
                      }
                    }}
                  />
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
                    <SelectItem value="AVAILABLE">Available for Booking</SelectItem>
                    <SelectItem value="BREAK">Break Time</SelectItem>
                    <SelectItem value="BUFFER">Buffer Time</SelectItem>
                    <SelectItem value="BLOCKED">Blocked</SelectItem>
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