# 🎨 Young Minds Design System - Usage Guide

**Version 1.0.0** - Production-Grade Glassmorphic Design Theme

This design system captures the beautiful, modern aesthetic from the PreJoin screen with glassmorphic effects, whimsical backgrounds, and premium visual polish.

---

## 📦 What's Included

The `design-system.json` file contains:
- **Color Palette** - Complete color system with background, foreground, accents
- **Gradients** - Beautiful gradient combinations for backgrounds and accents
- **Shadows** - Layered shadow effects for depth and elevation
- **Glassmorphism** - Blur and opacity values for glass effects
- **Typography** - Font settings, sizes, weights
- **Animations** - Durations, easings, and keyframes
- **Components** - Ready-to-use component styles (cards, buttons, inputs)
- **Effects** - Whimsical floating orbs configuration

---

## 🚀 Quick Start

### Option 1: Direct Import in React/TypeScript

```typescript
import designSystem from './design-system.json';

// Use in component
const MyCard = () => (
  <div style={designSystem.components.card.style}>
    <h1>Beautiful Glassmorphic Card</h1>
  </div>
);
```

### Option 2: Extract Specific Tokens

```typescript
import designSystem from './design-system.json';

const cardStyle: React.CSSProperties = {
  background: designSystem.gradients.backgrounds.cardGlass,
  padding: designSystem.spacing.card.padding,
  borderRadius: designSystem.borderRadius.xxl,
  border: `1px solid ${designSystem.colors.border.subtle}`,
  boxShadow: designSystem.shadows.card.elevated,
  backdropFilter: designSystem.glassmorphism.blur.medium,
};
```

### Option 3: CSS Variables (Recommended for Large Projects)

Create a CSS file from the design system:

```css
/* design-tokens.css */
:root {
  /* Colors */
  --color-bg-primary: #0f0f0f;
  --color-bg-secondary: #1a1a1a;
  --color-fg-primary: #ffffff;
  --color-accent-blue: #2563eb;

  /* Shadows */
  --shadow-elevated: 0 30px 60px -12px rgba(0, 0, 0, 0.7),
                     0 18px 36px -18px rgba(0, 0, 0, 0.5),
                     inset 0 1px 0 rgba(255, 255, 255, 0.05);

  /* Spacing */
  --spacing-card: 2.5rem;
  --radius-xxl: 1.25rem;
}
```

---

## 🎯 Common Use Cases

### 1. Create a Glassmorphic Card

```tsx
import designSystem from './design-system.json';

const GlassCard = ({ children }) => (
  <div style={{
    ...designSystem.components.card.style,
    maxWidth: '600px',
    margin: '0 auto'
  }}>
    {children}
  </div>
);
```

### 2. Create a Premium Button with Glow

```tsx
const PrimaryButton = ({ children, onClick }) => (
  <button
    onClick={onClick}
    style={designSystem.components.button.primary.style}
    onMouseEnter={(e) => {
      Object.assign(e.currentTarget.style,
        designSystem.components.button.primary.states.hover
      );
    }}
    onMouseLeave={(e) => {
      Object.assign(e.currentTarget.style,
        designSystem.components.button.primary.style
      );
    }}
  >
    {children}
  </button>
);
```

### 3. Add Whimsical Background

```tsx
const WhimsicalBackground = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    background: designSystem.gradients.backgrounds.whimsicalRadial,
    zIndex: -1
  }}>
    {/* Floating Orbs */}
    {designSystem.effects.whimsicalOrbs.map((orb, index) => (
      <div
        key={index}
        style={{
          position: 'absolute',
          width: orb.size,
          height: orb.size,
          borderRadius: '50%',
          background: orb.gradient || orb.background,
          filter: orb.blur,
          opacity: orb.opacity,
          ...orb.position,
          animation: `${orb.animation.name} ${orb.animation.duration} ${orb.animation.timing} ${orb.animation.iteration} ${orb.animation.direction || ''}`
        }}
      />
    ))}
  </div>
);
```

### 4. Glass-Effect Input

```tsx
const GlassInput = ({ ...props }) => {
  const [focused, setFocused] = useState(false);

  return (
    <input
      {...props}
      style={{
        ...designSystem.components.input.style,
        ...(focused ? designSystem.components.input.states.focus : {})
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
};
```

---

## 🎨 Design Principles

### 1. Glassmorphism
Always combine these elements for authentic glass effect:
- **Semi-transparent background** (rgba with 0.6-0.9 opacity)
- **Backdrop blur** (10-20px)
- **Subtle border** (white at 8-12% opacity)
- **Inset highlight** (white shadow at top)

### 2. Layered Shadows
Stack multiple shadows for depth:
```javascript
boxShadow: [
  'outer shadow (main depth)',
  'secondary shadow (ambient)',
  'inset highlight (3D effect)'
].join(', ')
```

### 3. Smooth Animations
Use CSS transforms for performance:
```javascript
transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
// Animate: transform, opacity, box-shadow
// Avoid: width, height, top, left
```

### 4. Color Harmony
- **Background**: Dark (#0f0f0f, #1a1a1a)
- **Accent**: Blue (#2563eb) for primary actions
- **Danger**: Red (#dc2626) for warnings/muted states
- **Whimsy**: Purple (#8b5cf6) for decorative elements

---

## 📱 Responsive Usage

```tsx
const ResponsiveCard = () => {
  const isMobile = useMediaQuery('(max-width: 640px)');

  return (
    <div style={{
      ...designSystem.components.card.style,
      padding: isMobile
        ? designSystem.spacing.card.paddingMobile
        : designSystem.spacing.card.padding
    }}>
      Content
    </div>
  );
};
```

---

## 🎭 Component Recipes

### Premium Hero Section
```tsx
<div style={{
  background: designSystem.gradients.backgrounds.whimsicalRadial,
  minHeight: '100vh',
  position: 'relative',
  overflow: 'hidden'
}}>
  {/* Floating orbs */}
  <WhimsicalOrbs />

  {/* Content */}
  <div style={designSystem.components.card.style}>
    <h1>Welcome</h1>
    <button style={designSystem.components.button.primary.style}>
      Get Started
    </button>
  </div>
</div>
```

### Modal with Glass Effect
```tsx
<div style={{
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}}>
  <div style={{
    ...designSystem.components.card.style,
    maxWidth: '500px'
  }}>
    Modal Content
  </div>
</div>
```

### Settings Panel
```tsx
<div style={designSystem.components.card.style}>
  <h2 style={{ color: designSystem.colors.foreground.primary }}>
    Settings
  </h2>

  <label style={{
    color: designSystem.colors.foreground.secondary,
    fontSize: designSystem.typography.fontSize.label,
    textTransform: designSystem.typography.textTransform.label
  }}>
    Email
  </label>

  <input
    type="email"
    style={designSystem.components.input.style}
  />

  <button style={designSystem.components.button.primary.style}>
    Save Changes
  </button>
</div>
```

---

## ⚡ Performance Tips

1. **Use CSS Variables** for frequently changing values
2. **Memoize styles** in React components
3. **Reduce blur radius** on mobile for performance
4. **Limit floating orbs** to 3-4 max
5. **Use `will-change: transform`** for animated elements

---

## ♿ Accessibility

The design system is built with WCAG AAA compliance:
- **Contrast ratios**: 7:1+ for all text
- **Focus indicators**: Clear blue glow on interactive elements
- **Reduced motion**: Respects `prefers-reduced-motion`
- **Keyboard navigation**: All interactive elements accessible

---

## 🔧 Customization

To customize colors while maintaining the aesthetic:

```typescript
// Create custom variant
const customDesignSystem = {
  ...designSystem,
  colors: {
    ...designSystem.colors,
    accent: {
      ...designSystem.colors.accent,
      blue: {
        DEFAULT: '#your-color' // Your brand color
      }
    }
  }
};
```

---

## 📚 Examples in Codebase

**Reference Implementation:**
- **PreJoin Screen**: `app/meeting/[sessionId]/MeetingRoom.tsx` (lines 92-438)
- **Global Styles**: `app/globals.css` (lines 110-474)
- **Layout Styles**: `app/layout.tsx` (lines 28-242)

---

## 🎯 Next Steps

1. **Explore** the `design-system.json` file
2. **Import** into your components
3. **Experiment** with different combinations
4. **Customize** colors to match your brand
5. **Share** with your team

---

**Questions?** The design system is self-documenting with inline descriptions and usage examples. Refer to the JSON file for complete specifications.

**Made with 💙 for Young Minds**
