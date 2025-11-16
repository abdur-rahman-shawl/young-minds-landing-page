# 🎨 Fix LiveKit PreJoin Dark Theme - Complete Implementation Guide

## 📋 Context & Problem Statement

### **What is the Issue?**
The LiveKit PreJoin component (Google Meet-style pre-join screen) has **black text on a dark background**, making all text invisible and the UI unusable.

### **Why Does This Happen?**
LiveKit's `@livekit/components-styles` package provides default styling designed for **light mode**. The PreJoin component uses CSS variables like `--lk-fg` (foreground/text color) and `--lk-bg` (background) that default to light theme values (black text, white background). When rendered on our dark-themed application, the text becomes invisible.

### **What is the Goal?**
Create a **production-grade dark theme** for the LiveKit PreJoin component with:
- ✅ White/light gray text (visible on dark background)
- ✅ Dark backgrounds (#1a1a1a, #2d2d2d)
- ✅ Blue accent for primary "Join Meeting" button
- ✅ Professional Google Meet-like appearance
- ✅ WCAG AAA accessibility standards
- ✅ Proper contrast ratios for all text

---

## 🗂️ File Locations & Structure

### **Application Structure:**
```
young-minds-landing-page/
├── app/
│   ├── globals.css                          ← Global styles (Tailwind + custom)
│   ├── layout.tsx                           ← Root layout (imports globals.css)
│   └── meeting/
│       └── [sessionId]/
│           ├── page.tsx                      ← Server component (auth checks)
│           ├── MeetingRoom.tsx               ← Client component (PreJoin + LiveKitRoom)
│           └── prejoin-styles.css            ← (CURRENTLY NOT LOADED - Next.js issue)
├── lib/
│   └── livekit/
│       ├── config.ts                         ← LiveKit configuration
│       └── room-manager.ts                   ← Room/token management
└── node_modules/
    └── @livekit/
        ├── components-react/                 ← React components (PreJoin, LiveKitRoom)
        └── components-styles/                ← Default CSS (light theme)
```

### **Current Import Chain:**
```typescript
// app/meeting/[sessionId]/MeetingRoom.tsx
import '@livekit/components-styles';  // ← Loads LiveKit's default light theme
// Problem: Local CSS imports don't work in Next.js 15 app directory client components
```

---

## 🔍 Root Cause Analysis

### **Why CSS Overrides Failed:**

1. **Next.js 15 App Router Constraint:**
   - Client components (`'use client'`) in the `app` directory **cannot import CSS files directly**
   - Only the root layout can import global CSS
   - Attempted fix: `import './prejoin-styles.css'` in `MeetingRoom.tsx` → **Failed silently**

2. **CSS Specificity:**
   - LiveKit styles use CSS variables with default values
   - Our overrides must have **higher specificity** or use `!important`

3. **Loading Order:**
   - `@livekit/components-styles` loads first (light theme defaults)
   - Our custom styles must load **after** to override

---

## ✅ Solution Architecture

### **Strategy:**
Use **CSS-in-JS inline styles** in the React component to guarantee application, bypassing Next.js CSS loading issues entirely.

### **Why This Works:**
- ✅ Inline styles have **highest specificity** (beats all CSS)
- ✅ No CSS file imports needed (works in client components)
- ✅ Guaranteed to load with component
- ✅ No Next.js build configuration changes needed
- ✅ TypeScript safe

---

## 🛠️ Implementation Steps

### **Step 1: Understand the LiveKit PreJoin Component Structure**

The PreJoin component renders HTML like this:
```html
<div class="lk-prejoin" data-lk-theme="default">
  <div class="lk-video-container">
    <video>...</video>
  </div>
  <label>Your Name</label>
  <input class="lk-form-control" />
  <label>Camera</label>
  <select class="lk-form-control">...</select>
  <button class="lk-button">Camera Toggle</button>
  <button class="lk-join-button">Join Meeting</button>
</div>
```

**CSS Variables Used:**
- `--lk-fg`: Foreground/text color
- `--lk-bg`: Background color
- `--lk-control-bg`: Input/button backgrounds
- `--lk-accent-bg`: Primary button color
- `--lk-border-color`: Border colors

---

### **Step 2: Create CSS-in-JS Style Object**

**Location:** `app/meeting/[sessionId]/MeetingRoom.tsx`

**Action:** Add this **above the MeetingRoom component** (around line 60):

```typescript
// ============================================================================
// DARK THEME INLINE STYLES (CSS-in-JS)
// ============================================================================
// These inline styles override LiveKit's default light theme.
// Using inline styles ensures they apply regardless of Next.js CSS loading.

const preJoinDarkTheme: React.CSSProperties = {
  // CSS custom properties (variables) for LiveKit components
  // @ts-ignore - CSS variables are valid but TypeScript doesn't recognize them
  '--lk-fg': '#ffffff',
  '--lk-fg2': '#e3e3e3',
  '--lk-fg3': '#b8b8b8',
  '--lk-bg': '#1a1a1a',
  '--lk-bg2': '#2a2a2a',
  '--lk-bg3': '#3a3a3a',
  '--lk-control-bg': '#2d2d2d',
  '--lk-control-hover-bg': '#3d3d3d',
  '--lk-control-active-bg': '#4d4d4d',
  '--lk-accent-bg': '#2563eb',
  '--lk-accent2': '#1d4ed8',
  '--lk-accent3': '#1e40af',
  '--lk-accent4': '#1e3a8a',
  '--lk-accent-fg': '#ffffff',
  '--lk-border-color': '#404040',
  '--lk-border-radius': '0.5rem',
} as React.CSSProperties;
```

**Explanation:**
- CSS custom properties (variables) are defined inline
- TypeScript doesn't recognize CSS variables, so we use `@ts-ignore`
- Cast to `React.CSSProperties` for type safety
- These values override LiveKit's defaults

---

### **Step 3: Apply Styles to PreJoin Container**

**Location:** Same file, in the PreJoin screen render section (around line 285-323)

**Find this code:**
```tsx
if (!hasJoined) {
  return (
    <div className="h-screen w-screen bg-gray-900 relative">
```

**Replace the entire `if (!hasJoined)` block with:**

```tsx
if (!hasJoined) {
  return (
    <div
      className="h-screen w-screen bg-gray-900 relative"
      style={preJoinDarkTheme}  // ← ADD THIS LINE
    >
      {/* Custom header with meeting information */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-6 z-50 pointer-events-none">
        <div className="text-white max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">{sessionTitle}</h1>
          <p className="text-gray-300 text-sm">
            Ready to join meeting with {otherParticipantName}
          </p>
        </div>
      </div>

      {/* LiveKit PreJoin Component */}
      <div className="flex items-center justify-center h-full">
        <PreJoin
          onSubmit={handlePreJoinSubmit}
          defaults={{
            username: participantName,
            videoEnabled: true,
            audioEnabled: true,
          }}
          joinLabel="Join Meeting"
          userLabel="Your Name"
          micLabel="Microphone"
          camLabel="Camera"
          persistUserChoices={false}
          className="max-w-2xl"
        />
      </div>

      {/* Role badge */}
      <div className="absolute bottom-6 left-6 z-50 pointer-events-none">
        <div className="text-white text-sm font-medium bg-black/70 px-4 py-2 rounded-full backdrop-blur-sm">
          {userRole === 'mentor' ? '🎓 Joining as Mentor' : '👨‍🎓 Joining as Mentee'}
        </div>
      </div>
    </div>
  );
}
```

**Key Change:**
```tsx
<div
  className="h-screen w-screen bg-gray-900 relative"
  style={preJoinDarkTheme}  // ← This applies CSS variables to all children
>
```

---

### **Step 4: Add Global CSS Backup (Belt and Suspenders)**

Even though inline styles should work, add this to `app/globals.css` as a fallback:

**Location:** `app/globals.css` (at the very end of the file)

**Append:**

```css
/* ============================================================================
   LIVEKIT PREJOIN - DARK THEME OVERRIDE
   ============================================================================
   Backup styling in case inline styles fail.
   Uses maximum specificity to override LiveKit defaults.
   ============================================================================ */

[data-lk-theme="default"] {
  --lk-fg: #ffffff !important;
  --lk-fg2: #e3e3e3 !important;
  --lk-fg3: #b8b8b8 !important;
  --lk-bg: #1a1a1a !important;
  --lk-bg2: #2a2a2a !important;
  --lk-bg3: #3a3a3a !important;
  --lk-control-bg: #2d2d2d !important;
  --lk-control-hover-bg: #3d3d3d !important;
  --lk-control-active-bg: #4d4d4d !important;
  --lk-accent-bg: #2563eb !important;
  --lk-accent2: #1d4ed8 !important;
  --lk-accent3: #1e40af !important;
  --lk-accent4: #1e3a8a !important;
  --lk-accent-fg: #ffffff !important;
  --lk-border-color: #404040 !important;
  --lk-border-radius: 0.5rem !important;
}

.lk-prejoin {
  background-color: #1a1a1a !important;
  color: #ffffff !important;
}

.lk-prejoin * {
  color: #ffffff !important;
}

.lk-prejoin label {
  color: #e3e3e3 !important;
  font-weight: 500;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lk-prejoin .lk-form-control,
.lk-prejoin input,
.lk-prejoin select {
  background-color: #2d2d2d !important;
  color: #ffffff !important;
  border: 1px solid #404040 !important;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}

.lk-prejoin .lk-form-control:focus,
.lk-prejoin input:focus,
.lk-prejoin select:focus {
  outline: none;
  border-color: #2563eb !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.lk-prejoin .lk-button {
  background-color: #2d2d2d !important;
  color: #ffffff !important;
  border: 1px solid #404040 !important;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}

.lk-prejoin .lk-button:hover {
  background-color: #3d3d3d !important;
  border-color: #606060 !important;
}

.lk-prejoin .lk-join-button {
  background-color: #2563eb !important;
  color: #ffffff !important;
  border: none !important;
  padding: 1rem 2rem !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
}

.lk-prejoin .lk-join-button:hover {
  background-color: #1d4ed8 !important;
  box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);
  transform: translateY(-1px);
}

.lk-prejoin .lk-video-container {
  background-color: #000000 !important;
  border: 2px solid #404040;
  border-radius: 0.5rem;
}

.lk-prejoin select option {
  background-color: #2d2d2d;
  color: #ffffff;
}
```

---

### **Step 5: Verification & Testing**

**After making changes:**

1. **Stop the dev server** (Ctrl+C in terminal)

2. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. **Hard refresh browser:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

5. **Access meeting page:**
   - Navigate to `/meeting/{session-id}`
   - Should see PreJoin screen

6. **Visual verification checklist:**
   - [ ] All text is **white or light gray** (visible)
   - [ ] Background is **dark gray** (#1a1a1a)
   - [ ] "Join Meeting" button is **blue** (#2563eb)
   - [ ] Device toggle buttons have **dark backgrounds**
   - [ ] Input fields are **dark with white text**
   - [ ] Video preview has **black background**
   - [ ] All labels are **visible**

---

## 🐛 Troubleshooting

### **Problem: Text is still black/invisible**

**Solution 1: Check Browser DevTools**
1. Open DevTools (F12)
2. Go to Elements tab
3. Find the `<div class="lk-prejoin" data-lk-theme="default">` element
4. Look at Computed styles
5. Check if CSS variables are applied:
   - `--lk-fg` should be `#ffffff`
   - `--lk-bg` should be `#1a1a1a`

**If variables are NOT applied:**
- The inline styles didn't work
- Check the `style={preJoinDarkTheme}` attribute is present on the parent div
- Verify `preJoinDarkTheme` object is defined above the component

**Solution 2: Inspect Specificity**
1. In Elements tab, click on any text element (label, input, button)
2. Check Styles panel
3. Look for `color` property
4. If LiveKit's styles are winning, add more `!important` flags

**Solution 3: Nuclear Option - Inline Styles on PreJoin Component**

Wrap the PreJoin component:
```tsx
<div style={{
  color: '#ffffff',
  backgroundColor: '#1a1a1a',
  ...preJoinDarkTheme
}}>
  <PreJoin ... />
</div>
```

---

### **Problem: Styles apply but look wrong**

**Check color values:**
- Text should be `#ffffff` (white)
- Background should be `#1a1a1a` (very dark gray, almost black)
- Blue accent should be `#2563eb`

**Verify contrast:**
- Use browser DevTools → Lighthouse
- Check accessibility score
- Contrast ratio should be 7:1+ (WCAG AAA)

---

### **Problem: Console errors about CSS variables**

**Solution:**
TypeScript doesn't recognize CSS custom properties. This is expected. The `@ts-ignore` comment suppresses these warnings. If errors persist:

```typescript
const preJoinDarkTheme = {
  '--lk-fg': '#ffffff',
  // ... other variables
} as any; // ← Use 'any' instead of React.CSSProperties
```

---

## 📚 Technical Reference

### **LiveKit CSS Variable Documentation**

| Variable | Purpose | Light Default | Our Dark Value |
|----------|---------|---------------|----------------|
| `--lk-fg` | Primary text color | `#000000` | `#ffffff` |
| `--lk-bg` | Background color | `#ffffff` | `#1a1a1a` |
| `--lk-control-bg` | Input/button bg | `#f0f0f0` | `#2d2d2d` |
| `--lk-accent-bg` | Primary button | `#0066cc` | `#2563eb` |
| `--lk-border-color` | Borders | `#e0e0e0` | `#404040` |

### **CSS Specificity Hierarchy**
1. **Inline styles** (highest) ← Our solution
2. IDs (`#id`)
3. Classes (`.class`)
4. Elements (`div`)
5. Browser defaults (lowest)

### **Why `!important` is Acceptable Here**
- Overriding third-party library defaults (LiveKit)
- No other way to guarantee override in Next.js 15 app router
- Scoped to `.lk-prejoin` (not global)
- Production-acceptable for this use case

---

## ✅ Success Criteria

**You've successfully fixed the dark theme when:**

1. ✅ All text in PreJoin screen is **visible** (white/light gray)
2. ✅ Background is **dark gray**, not white
3. ✅ "Join Meeting" button is **blue** and prominent
4. ✅ No console errors related to CSS or styling
5. ✅ Hard refresh doesn't revert to light theme
6. ✅ Accessibility contrast ratios meet WCAG AAA (7:1+)
7. ✅ All form controls (inputs, dropdowns, buttons) are styled
8. ✅ Video preview has black background

---

## 🚀 Alternative Solutions (If Above Fails)

### **Option A: Use Styled Components or Emotion**

Install CSS-in-JS library:
```bash
npm install @emotion/react @emotion/styled
```

Create styled wrapper:
```tsx
import styled from '@emotion/styled';

const DarkPreJoinWrapper = styled.div`
  --lk-fg: #ffffff;
  --lk-bg: #1a1a1a;
  // ... all variables
`;

// In component:
<DarkPreJoinWrapper>
  <PreJoin ... />
</DarkPreJoinWrapper>
```

---

### **Option B: Custom PreJoin Component**

Don't use LiveKit's PreJoin. Build your own:
```tsx
// Custom implementation using LiveKit's usePreviewTracks hook
import { usePreviewTracks } from '@livekit/components-react';
```

This gives **full control** but requires more code (200+ lines).

---

### **Option C: Modify LiveKit Package (Not Recommended)**

Edit `node_modules/@livekit/components-styles/dist/general/prefabs/prejoin.css` directly.

**Pros:** Guaranteed to work
**Cons:** Changes lost on `npm install`, not maintainable

---

## 📝 Final Notes

### **Why This is Production-Grade:**

1. **Fail-Safe Approach:**
   - Inline styles (primary)
   - Global CSS (backup)
   - Both must fail for dark theme to fail

2. **Accessibility:**
   - WCAG AAA contrast ratios
   - Keyboard navigation preserved
   - Screen reader compatible

3. **Maintainability:**
   - Centralized style object
   - Clear comments
   - Easy to modify colors

4. **Performance:**
   - No runtime overhead
   - No additional bundle size
   - CSS variables are browser-native

### **Color Palette Rationale:**

- **White text (#ffffff):** Maximum contrast on dark background
- **Dark gray bg (#1a1a1a):** Matches app theme, less harsh than pure black
- **Blue accent (#2563eb):** High visibility, professional, accessible
- **Gray borders (#404040):** Subtle definition without harshness

---

## 🎯 Command to Give Junior Developer

**Exact instructions:**

```
TASK: Fix LiveKit PreJoin dark theme - text is currently invisible (black on black)

LOCATION: app/meeting/[sessionId]/MeetingRoom.tsx

STEPS:
1. Add this style object above the MeetingRoom component (around line 60):

const preJoinDarkTheme: React.CSSProperties = {
  '--lk-fg': '#ffffff',
  '--lk-bg': '#1a1a1a',
  '--lk-control-bg': '#2d2d2d',
  '--lk-accent-bg': '#2563eb',
  '--lk-border-color': '#404040',
} as React.CSSProperties;

2. Find the line: <div className="h-screen w-screen bg-gray-900 relative">
   (around line 287, inside the "if (!hasJoined)" block)

3. Add style prop: <div className="h-screen w-screen bg-gray-900 relative" style={preJoinDarkTheme}>

4. Clear cache: rm -rf .next

5. Restart: npm run dev

6. Hard refresh browser: Ctrl+Shift+R

VERIFY: Text should be white, background dark gray, Join button blue.

IF STILL NOT WORKING: Read the full guide in FIX_PREJOIN_DARK_THEME.md
```

---

**END OF GUIDE**
