# Mentor Availability System - Complete Testing Guide

## Prerequisites
1. Ensure the development server is running: `npm run dev`
2. Database tables are created (already done via our script)
3. You need at least one verified mentor account

## Test Accounts Setup

### Option 1: Use Existing Mentor Account
- Login with an existing mentor account that has `verificationStatus: 'VERIFIED'`

### Option 2: Create/Update Test Mentor Account
Run this SQL in your Supabase dashboard:
```sql
-- Find a user and make them a verified mentor
UPDATE mentors 
SET verification_status = 'VERIFIED'
WHERE user_id = 'YOUR_USER_ID_HERE';
```

## Testing Flow

### 1. Initial Availability Setup (First-Time Mentor)

**Test Path:** Login as Mentor → Navigate to Availability
- **URL:** `http://localhost:3000/mentor/availability`
- **Expected:** Should see empty availability with setup prompts

**Test Steps:**
1. Click on "Availability" in the mentor sidebar
2. Should see the MentorAvailabilityManager component
3. Verify the following sections are visible:
   - Status card (showing "Not accepting bookings" initially)
   - Four tabs: Schedule, Settings, Exceptions, Templates
   - Help section at bottom

### 2. Testing Weekly Schedule Editor

**Tab:** Schedule

**Test Quick Templates:**
1. Click "Weekdays 9-5" button
   - ✅ Should populate Mon-Fri with 9AM-12PM and 1PM-5PM blocks
   - ✅ Should show lunch break 12PM-1PM
   - ✅ Weekend should remain disabled

2. Click "Weekend Warrior" 
   - ✅ Should enable only Saturday and Sunday
   - ✅ Should add time blocks 10AM-4PM with break

3. Click "Evenings Only"
   - ✅ Should set 6PM-9PM for weekdays only

**Test Manual Schedule Creation:**
1. Toggle Monday "ON"
2. Click "Add Block" for Monday
3. In dialog:
   - Set start time: 10:00
   - Set end time: 12:00
   - Set type: AVAILABLE
   - Click "Save Block"
4. ✅ Block should appear in Monday's schedule
5. Click "Copy to All" to replicate to other days
6. ✅ All days should now have the same pattern

**Test Block Management:**
1. Click "Edit" on any time block
2. Change the time or type
3. ✅ Changes should reflect immediately
4. Click trash icon to delete a block
5. ✅ Block should be removed

### 3. Testing Availability Settings

**Tab:** Settings

**Test Timezone Configuration:**
1. Change timezone from dropdown
2. ✅ Should update immediately (note: requires save)

**Test Session Configuration:**
1. Change "Default Session Duration" to 45 minutes
2. Change "Buffer Between Sessions" to 30 minutes
3. ✅ Values should update in UI

**Test Booking Window:**
1. Set "Minimum Advance Notice" to 48 hours
2. Set "Maximum Advance Booking" to 30 days
3. ✅ Should accept numeric inputs only

**Test Booking Preferences:**
1. Toggle "Instant Booking" OFF
2. Toggle "Require Confirmation" ON
3. ✅ Should see warning message about manual approval

### 4. Testing Exceptions (Holidays/Vacations)

**Tab:** Exceptions

**Test Quick Add Exceptions:**
1. Click "Vacation" button
   - ✅ Should open dialog with 7 days pre-selected
   - ✅ Reason should be pre-filled as "Vacation"

2. Click "Holiday" button
   - ✅ Should select a single day
   - ✅ Reason: "Public Holiday"

**Test Manual Exception:**
1. Click "Add Exception"
2. Select multiple dates on calendar
3. Toggle "Full Day Exception" OFF
4. Set specific hours (e.g., 2PM-5PM)
5. Add reason: "Doctor's appointment"
6. Click "Add Exception"
7. ✅ Should appear in exceptions list
8. ✅ Should show partial day badge

**Test Exception Deletion:**
1. Click trash icon on any exception
2. ✅ Exception should be removed from list

### 5. Testing Templates

**Tab:** Templates

**Test Premade Templates:**
1. Click "Apply" on "Standard Business Hours"
2. ✅ Schedule should update to Mon-Fri 9-5
3. Switch to Schedule tab to verify

**Test Save Custom Template:**
1. Configure a unique schedule
2. Go to Templates tab
3. Click "Save as Template"
4. Enter name: "My Custom Schedule"
5. Enter description (optional)
6. Click "Save Template"
7. ✅ Should appear in "Your Templates" section

**Test Apply Custom Template:**
1. Change your schedule
2. Go back to Templates
3. Click "Apply" on your saved template
4. ✅ Schedule should revert to saved configuration

### 6. Testing Save Functionality

**Test Save Changes:**
1. Make any change to schedule/settings
2. ✅ "Save Changes" button should become enabled
3. ✅ "Reset Changes" button should appear
4. Click "Save Changes"
5. ✅ Should see success toast
6. ✅ Buttons should become disabled again

**Test Reset Changes:**
1. Make changes
2. Click "Reset Changes"
3. ✅ All changes should revert
4. ✅ Save button should be disabled

### 7. Testing Booking Integration

**As a Mentee:**

**Test Availability Display:**
1. Login as a mentee account
2. Go to Explore Mentors
3. Find your test mentor
4. Click "Book Session"
5. ✅ Should see TimeSlotSelectorV2 component
6. ✅ Should only show available slots based on mentor's schedule

**Test Slot Selection:**
1. Select a date where mentor has availability
2. ✅ Should see available time slots
3. ✅ Booked slots should be grayed out
4. Select an available slot
5. ✅ Should highlight selected slot
6. Click "Continue"

**Test Timezone Display:**
1. If mentor is in different timezone
2. ✅ Should see timezone conversion notice
3. ✅ Times should be in your local timezone

### 8. Testing API Endpoints

**Using Browser DevTools (Network Tab):**

**Test GET Availability:**
```
GET /api/mentors/[mentorId]/availability
```
- ✅ Should return schedule, weeklyPatterns, exceptions, rules

**Test UPDATE Availability:**
- Make changes and save
- ✅ Should see PUT request
- ✅ Response should be 200 OK

**Test Slots API:**
```
GET /api/mentors/[mentorId]/availability/slots?startDate=2024-01-15&endDate=2024-01-15
```
- ✅ Should return array of available slots
- ✅ Should respect mentor's schedule

### 9. Edge Cases Testing

**Test No Availability:**
1. Disable all days in schedule
2. Save
3. As mentee, try to book
4. ✅ Should show "No available slots"

**Test Past Dates:**
1. Navigate to past weeks in booking modal
2. ✅ Past dates should be disabled/grayed out

**Test Overlapping Exceptions:**
1. Try to create exception for already blocked date
2. ✅ Should show error or merge exceptions

**Test Buffer Time:**
1. Set 30-minute buffer
2. Book a session as mentee
3. Try to book immediately after
4. ✅ Should not allow booking within buffer period

### 10. Performance Testing

**Test Large Date Ranges:**
1. In booking modal, navigate through multiple weeks
2. ✅ Should load quickly without lag

**Test Multiple Updates:**
1. Make rapid changes to schedule
2. ✅ Should handle without errors
3. ✅ Auto-save should debounce properly

## Verification Checklist

### Core Functionality
- [ ] Can create weekly schedule
- [ ] Can modify individual day patterns
- [ ] Can add/edit/delete time blocks
- [ ] Can set availability exceptions
- [ ] Can save and apply templates
- [ ] Changes persist after page refresh
- [ ] Booking modal respects availability

### User Experience
- [ ] All loading states work
- [ ] Error messages are clear
- [ ] Success notifications appear
- [ ] UI is responsive on mobile
- [ ] Keyboard navigation works
- [ ] Form validation prevents invalid input

### Data Integrity
- [ ] Timezone conversions are correct
- [ ] Buffer times are enforced
- [ ] Advance booking limits work
- [ ] Exceptions override regular schedule
- [ ] Only verified mentors can access

### Security
- [ ] Non-mentors cannot access /mentor/availability
- [ ] Unverified mentors see restricted view
- [ ] API endpoints require authentication
- [ ] Cannot modify other mentors' availability

## Common Issues & Solutions

### Issue: "Verification Required" Message
**Solution:** Update mentor verification status in database:
```sql
UPDATE mentors SET verification_status = 'VERIFIED' WHERE user_id = 'your-user-id';
```

### Issue: Changes Not Saving
**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Ensure you're logged in as the mentor

### Issue: No Time Slots Showing in Booking
**Check:**
1. Mentor has active availability
2. Selected date has enabled schedule
3. No exceptions blocking the date
4. Within booking window limits

### Issue: Timezone Confusion
**Note:** All times are stored in mentor's timezone but displayed in user's local timezone during booking.

## SQL Queries for Testing

### Check Mentor's Availability Setup:
```sql
-- Get mentor's schedule
SELECT * FROM mentor_availability_schedules 
WHERE mentor_id = (SELECT id FROM mentors WHERE user_id = 'USER_ID');

-- Get weekly patterns
SELECT * FROM mentor_weekly_patterns 
WHERE schedule_id = (SELECT id FROM mentor_availability_schedules WHERE mentor_id = 'MENTOR_ID');

-- Get exceptions
SELECT * FROM mentor_availability_exceptions 
WHERE schedule_id = (SELECT id FROM mentor_availability_schedules WHERE mentor_id = 'MENTOR_ID');
```

### Reset Test Data:
```sql
-- Delete all availability data for a mentor
DELETE FROM mentor_availability_schedules WHERE mentor_id = 'MENTOR_ID';
```

## Testing Sequence Summary

1. **Setup Phase** (5 min)
   - Login as verified mentor
   - Navigate to availability page
   - Verify initial empty state

2. **Configuration Phase** (10 min)
   - Set weekly schedule
   - Configure settings
   - Add exceptions
   - Save changes

3. **Verification Phase** (10 min)
   - Test as mentee
   - Book a session
   - Verify availability matches
   - Check timezone handling

4. **Edge Case Phase** (5 min)
   - Test error scenarios
   - Verify validation
   - Check performance

Total Testing Time: ~30 minutes

## Success Criteria

The system is working correctly when:
1. ✅ Mentors can set complex availability patterns
2. ✅ Settings persist across sessions
3. ✅ Mentees see accurate availability
4. ✅ Bookings respect all constraints
5. ✅ UI is intuitive and responsive
6. ✅ No console errors during normal use
7. ✅ All API calls complete successfully

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Verify database tables exist
3. Ensure mentor is verified
4. Check network requests in DevTools
5. Review the error messages carefully

The system has comprehensive error handling and will provide specific messages about what went wrong.