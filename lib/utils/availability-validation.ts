/**
 * Production-grade availability validation utilities
 * Ensures data integrity for mentor availability time blocks
 */

export interface TimeBlock {
  startTime: string; // Format: "HH:MM"
  endTime: string;   // Format: "HH:MM"
  type: 'AVAILABLE' | 'BREAK' | 'BUFFER' | 'BLOCKED';
  maxBookings?: number;
}

export interface TimeBlockOverlap {
  block1: TimeBlock;
  block2: TimeBlock;
  overlapStart: string;
  overlapEnd: string;
  conflictType: 'full' | 'partial' | 'contains' | 'contained';
}

/**
 * Converts time string "HH:MM" to minutes since midnight for comparison
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight back to "HH:MM" format
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Checks if two time blocks overlap
 * Returns detailed overlap information if they do, null otherwise
 */
export function checkTimeBlockOverlap(
  block1: TimeBlock,
  block2: TimeBlock
): TimeBlockOverlap | null {
  const start1 = timeToMinutes(block1.startTime);
  const end1 = timeToMinutes(block1.endTime);
  const start2 = timeToMinutes(block2.startTime);
  const end2 = timeToMinutes(block2.endTime);

  // Validate that end times are after start times
  if (end1 <= start1 || end2 <= start2) {
    throw new Error('Invalid time block: end time must be after start time');
  }

  // Check for overlap
  const hasOverlap = start1 < end2 && start2 < end1;
  
  if (!hasOverlap) {
    return null;
  }

  // Calculate overlap details
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  
  let conflictType: TimeBlockOverlap['conflictType'];
  
  if (start1 === start2 && end1 === end2) {
    conflictType = 'full'; // Exact same time block
  } else if (start1 <= start2 && end1 >= end2) {
    conflictType = 'contains'; // block1 contains block2
  } else if (start2 <= start1 && end2 >= end1) {
    conflictType = 'contained'; // block1 is contained in block2
  } else {
    conflictType = 'partial'; // Partial overlap
  }

  return {
    block1,
    block2,
    overlapStart: minutesToTime(overlapStart),
    overlapEnd: minutesToTime(overlapEnd),
    conflictType
  };
}

/**
 * Validates a new time block against existing blocks
 * Returns validation result with detailed error messages
 */
export function validateTimeBlock(
  newBlock: TimeBlock,
  existingBlocks: TimeBlock[],
  allowedOverlapTypes: TimeBlock['type'][] = []
): {
  isValid: boolean;
  errors: string[];
  overlaps: TimeBlockOverlap[];
} {
  const errors: string[] = [];
  const overlaps: TimeBlockOverlap[] = [];

  // Validate time format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(newBlock.startTime)) {
    errors.push(`Invalid start time format: ${newBlock.startTime}. Use HH:MM format.`);
  }
  if (!timeRegex.test(newBlock.endTime)) {
    errors.push(`Invalid end time format: ${newBlock.endTime}. Use HH:MM format.`);
  }

  // Validate that end time is after start time
  const startMinutes = timeToMinutes(newBlock.startTime);
  const endMinutes = timeToMinutes(newBlock.endTime);
  
  if (endMinutes <= startMinutes) {
    errors.push(`End time (${newBlock.endTime}) must be after start time (${newBlock.startTime})`);
  }

  // Check for overlaps with existing blocks
  for (const existingBlock of existingBlocks) {
    try {
      const overlap = checkTimeBlockOverlap(newBlock, existingBlock);
      
      if (overlap) {
        // Check if this type of overlap is allowed
        const isAllowedOverlap = 
          allowedOverlapTypes.includes(newBlock.type) && 
          allowedOverlapTypes.includes(existingBlock.type);
        
        if (!isAllowedOverlap) {
          overlaps.push(overlap);
          
          // Generate specific error message based on conflict type
          const conflictDescription = getConflictDescription(overlap, newBlock, existingBlock);
          errors.push(conflictDescription);
        }
      }
    } catch (error) {
      // Skip invalid existing blocks but log the issue
      console.error('Invalid existing block detected:', existingBlock, error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    overlaps
  };
}

/**
 * Generates a human-readable conflict description
 */
function getConflictDescription(
  overlap: TimeBlockOverlap,
  newBlock: TimeBlock,
  existingBlock: TimeBlock
): string {
  const typeDescriptions: Record<TimeBlock['type'], string> = {
    'AVAILABLE': 'available time',
    'BLOCKED': 'blocked time',
    'BREAK': 'break time',
    'BUFFER': 'buffer time'
  };

  const newType = typeDescriptions[newBlock.type];
  const existingType = typeDescriptions[existingBlock.type];

  switch (overlap.conflictType) {
    case 'full':
      return `This exact time slot (${newBlock.startTime}-${newBlock.endTime}) is already set as ${existingType}`;
    
    case 'contains':
      return `This ${newType} block (${newBlock.startTime}-${newBlock.endTime}) completely overlaps with existing ${existingType} (${existingBlock.startTime}-${existingBlock.endTime})`;
    
    case 'contained':
      return `This ${newType} block (${newBlock.startTime}-${newBlock.endTime}) is within an existing ${existingType} block (${existingBlock.startTime}-${existingBlock.endTime})`;
    
    case 'partial':
      return `This ${newType} block (${newBlock.startTime}-${newBlock.endTime}) partially overlaps with ${existingType} (${existingBlock.startTime}-${existingBlock.endTime}) from ${overlap.overlapStart} to ${overlap.overlapEnd}`;
    
    default:
      return `Time conflict detected between ${newBlock.startTime}-${newBlock.endTime} and ${existingBlock.startTime}-${existingBlock.endTime}`;
  }
}

/**
 * Merges overlapping AVAILABLE blocks and sorts all blocks by start time
 * This helps clean up the schedule and prevent unnecessary fragmentation
 */
export function mergeAndSortTimeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  if (blocks.length === 0) return [];

  // Sort blocks by start time
  const sorted = [...blocks].sort((a, b) => 
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const merged: TimeBlock[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    
    // Only merge AVAILABLE blocks with the same maxBookings
    if (
      current.type === 'AVAILABLE' && 
      next.type === 'AVAILABLE' && 
      current.maxBookings === next.maxBookings
    ) {
      const currentEnd = timeToMinutes(current.endTime);
      const nextStart = timeToMinutes(next.startTime);
      
      // If blocks are adjacent or overlapping, merge them
      if (nextStart <= currentEnd) {
        current.endTime = timeToMinutes(next.endTime) > currentEnd 
          ? next.endTime 
          : current.endTime;
        continue;
      }
    }
    
    // Can't merge, add current and move to next
    merged.push(current);
    current = { ...next };
  }
  
  // Don't forget the last block
  merged.push(current);
  
  return merged;
}

/**
 * Applies BLOCKED time blocks to AVAILABLE blocks, splitting them as necessary
 * This is used by the API to calculate actual available slots
 */
export function applyBlockedTimes(
  availableBlocks: TimeBlock[],
  blockedBlocks: TimeBlock[]
): TimeBlock[] {
  if (blockedBlocks.length === 0) return availableBlocks;
  
  const result: TimeBlock[] = [];
  
  for (const available of availableBlocks) {
    if (available.type !== 'AVAILABLE') {
      result.push(available);
      continue;
    }
    
    let fragments: Array<{ start: number; end: number }> = [
      { 
        start: timeToMinutes(available.startTime), 
        end: timeToMinutes(available.endTime) 
      }
    ];
    
    // Apply each blocked time to fragment the available block
    for (const blocked of blockedBlocks) {
      if (blocked.type !== 'BLOCKED' && blocked.type !== 'BREAK') continue;
      
      const blockedStart = timeToMinutes(blocked.startTime);
      const blockedEnd = timeToMinutes(blocked.endTime);
      const newFragments: Array<{ start: number; end: number }> = [];
      
      for (const fragment of fragments) {
        // No overlap
        if (fragment.end <= blockedStart || fragment.start >= blockedEnd) {
          newFragments.push(fragment);
          continue;
        }
        
        // Split the fragment around the blocked time
        if (fragment.start < blockedStart) {
          newFragments.push({ start: fragment.start, end: blockedStart });
        }
        if (fragment.end > blockedEnd) {
          newFragments.push({ start: blockedEnd, end: fragment.end });
        }
      }
      
      fragments = newFragments;
    }
    
    // Convert fragments back to TimeBlocks
    for (const fragment of fragments) {
      if (fragment.end - fragment.start > 0) { // Only add non-zero duration blocks
        result.push({
          startTime: minutesToTime(fragment.start),
          endTime: minutesToTime(fragment.end),
          type: 'AVAILABLE',
          maxBookings: available.maxBookings
        });
      }
    }
  }
  
  return mergeAndSortTimeBlocks(result);
}

/**
 * Validates an entire weekly schedule for consistency
 */
export function validateWeeklySchedule(
  weeklyPatterns: Array<{
    dayOfWeek: number;
    isEnabled: boolean;
    timeBlocks: TimeBlock[];
  }>
): {
  isValid: boolean;
  errors: Array<{ day: number; errors: string[] }>;
} {
  const errors: Array<{ day: number; errors: string[] }> = [];
  
  for (const pattern of weeklyPatterns) {
    if (!pattern.isEnabled || pattern.timeBlocks.length === 0) continue;
    
    const dayErrors: string[] = [];
    
    // Validate each block within the day
    for (let i = 0; i < pattern.timeBlocks.length; i++) {
      const block = pattern.timeBlocks[i];
      const otherBlocks = pattern.timeBlocks.filter((_, index) => index !== i);
      
      const validation = validateTimeBlock(block, otherBlocks);
      if (!validation.isValid) {
        dayErrors.push(...validation.errors);
      }
    }
    
    if (dayErrors.length > 0) {
      errors.push({ day: pattern.dayOfWeek, errors: dayErrors });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}