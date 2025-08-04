# Wedding Website Design System Guide

## Overview

This design system provides a complete, cohesive styling foundation for elegant wedding websites. It features a romantic color palette, sophisticated typography, and reusable components optimized for mobile-first responsive design.

## 🎨 Design Philosophy

- **Romantic & Elegant**: Soft color palette with rose, sage, and ivory tones
- **Typography Hierarchy**: Mix of script fonts for romance and clean sans-serif for readability
- **Mobile-First**: Responsive design that works beautifully on all devices
- **Accessibility**: WCAG compliant with proper focus states and screen reader support
- **Performance**: Optimized CSS custom properties and efficient animations

## 🎯 Color System

### Primary Colors (Rose)
- **Usage**: Main accent color, primary buttons, active states
- **Shades**: 50-900 (var(--color-rose-[shade]))
- **Brand Colors**: 
  - Primary: `var(--color-primary)` (rose-600)
  - Primary Hover: `var(--color-primary-hover)` (rose-700)

### Secondary Colors (Sage)
- **Usage**: Secondary buttons, accents, supporting elements
- **Shades**: 50-900 (var(--color-sage-[shade]))
- **Brand Colors**:
  - Secondary: `var(--color-secondary)` (sage-600)
  - Secondary Hover: `var(--color-secondary-hover)` (sage-700)

### Accent Colors (Ivory)
- **Usage**: Backgrounds, subtle accents, warm highlights
- **Shades**: 50-900 (var(--color-ivory-[shade]))
- **Brand Colors**:
  - Accent: `var(--color-accent)` (ivory-600)
  - Accent Hover: `var(--color-accent-hover)` (ivory-700)

### Semantic Colors
- **Success**: `var(--color-success)` - Green for confirmations
- **Warning**: `var(--color-warning)` - Amber for alerts
- **Error**: `var(--color-error)` - Red for errors
- **Info**: `var(--color-info)` - Blue for information

## ✍️ Typography

### Font Families
```css
--font-primary: 'Cormorant Garamond', serif;    /* Elegant serif for headings */
--font-secondary: 'Inter', sans-serif;          /* Clean sans-serif for body */
--font-script: 'Dancing Script', cursive;       /* Script for romantic touches */
```

### Typography Classes

#### Headings
- `.heading-hero` - Main hero text (script font, largest size)
- `.heading-primary` - Primary headings (script font)
- `.heading-secondary` - Section headings (serif font)
- `.heading-tertiary` - Subsection headings (serif font)
- `.heading-quaternary` - Labels and small headings (sans-serif, uppercase)

#### Body Text
- `.body-large` - Important content, introductions
- `.body-base` - Standard body text
- `.body-small` - Captions, metadata

#### Special Text
- `.script-text` - Romantic script text in primary color
- `.script-accent` - Script text in secondary color
- `.subheading` - Centered subtitle text

### Responsive Typography
Font sizes automatically scale on larger screens using CSS custom properties and media queries.

## 🧩 Component Library

### Buttons

#### Variants
```tsx
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
```

#### Sizes
```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>
```

#### States
```tsx
<Button disabled>Disabled</Button>
<Button isLoading>Loading</Button>
```

### Cards

#### Basic Usage
```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

#### Variants
```tsx
<Card variant="default">Standard card</Card>
<Card variant="elevated">Card with larger shadow</Card>
<Card variant="outlined">Card with border</Card>
```

### Form Elements

#### Input Fields
```tsx
<Input
  label="Guest Name"
  placeholder="Enter your name"
  leftIcon={<UserIcon />}
  error="This field is required"
  helpText="Please enter your full name"
/>
```

#### Form Structure
```tsx
<div className="form-group">
  <label className="form-label">Label</label>
  <input className="form-input" />
  <p className="form-error">Error message</p>
</div>
```

### Loading States

#### Spinner
```tsx
<LoadingSpinner size="sm" color="primary" text="Loading..." />
```

#### Sizes & Colors
- Sizes: `sm`, `md`, `lg`
- Colors: `primary`, `secondary`, `white`, `gray`

## 📐 Layout System

### Container & Sections
```tsx
<div className="container">
  <section className="section">
    <div className="content-width">
      <!-- Content -->
    </div>
  </section>
</div>
```

### Grid System
```css
.grid { display: grid; gap: var(--space-4); }
.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

/* Responsive variants */
.sm:grid-cols-2  /* Small screens and up */
.md:grid-cols-3  /* Medium screens and up */
.lg:grid-cols-4  /* Large screens and up */
```

### Flexbox Utilities
```css
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-4 { gap: var(--space-4); }
```

## 🎭 Wedding-Specific Components

### Invitation Card
```css
.invitation-card
```
Elegant card with gradient background and decorative elements, perfect for wedding invitations.

### Venue Card
```css
.venue-card
```
Styled card with sage green accent, ideal for venue information.

### RSVP Section
```css
.rsvp-section
```
Full-width section with gradient background for RSVP forms.

## 📱 Responsive Design

### Breakpoints
```css
--breakpoint-xs: 475px;
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Desktops */
--breakpoint-xl: 1280px;  /* Large desktops */
--breakpoint-2xl: 1536px; /* Extra large */
```

### Mobile-First Approach
All styles are designed mobile-first with progressive enhancement for larger screens.

### Responsive Utilities
```css
.hidden         /* Hide on all screens */
.sm:hidden      /* Hide on small screens and up */
.md:block       /* Show as block on medium screens and up */
.lg:flex        /* Show as flex on large screens and up */
```

## ✨ Animations

### Animation Classes
```css
.animate-fade-in      /* Fade in from bottom */
.animate-slide-left   /* Slide in from left */
.animate-slide-right  /* Slide in from right */
.animate-scale-in     /* Scale in animation */
.animate-float        /* Floating animation */
.animate-pulse        /* Pulse animation */
```

### Transition System
```css
--transition-fast: 150ms ease;
--transition-base: 300ms ease;
--transition-slow: 500ms ease;
--transition-spring: 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
--transition-bounce: 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

## 🎯 Spacing System

### Scale
```css
--space-px: 1px;
--space-0: 0;
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
--space-32: 8rem;      /* 128px */
```

### Usage
```css
margin: var(--space-4);
padding: var(--space-6) var(--space-8);
gap: var(--space-4);
```

## 🎨 Shadow System

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-rose: 0 10px 25px -3px rgb(225 29 72 / 0.1), 0 4px 6px -2px rgb(225 29 72 / 0.05);
--shadow-sage: 0 10px 25px -3px rgb(71 86 71 / 0.1), 0 4px 6px -2px rgb(71 86 71 / 0.05);
```

## 🧱 Border Radius

### Scale
```css
--radius-none: 0;
--radius-sm: 0.125rem;   /* 2px */
--radius-base: 0.25rem;  /* 4px */
--radius-md: 0.375rem;   /* 6px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
--radius-2xl: 1rem;      /* 16px */
--radius-3xl: 1.5rem;    /* 24px */
--radius-full: 9999px;
```

## ♿ Accessibility

### Focus States
All interactive elements have visible focus indicators:
```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### Screen Reader Support
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Reduced Motion
Respects user's motion preferences:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 📄 Best Practices

### 1. Use CSS Custom Properties
Always use design system variables instead of hardcoded values:
```css
/* Good */
color: var(--color-primary);
margin: var(--space-4);

/* Avoid */
color: #e11d48;
margin: 16px;
```

### 2. Follow Typography Hierarchy
Use semantic heading classes for proper hierarchy:
```tsx
<h1 className="heading-hero">Page Title</h1>
<h2 className="heading-secondary">Section Title</h2>
<h3 className="heading-tertiary">Subsection Title</h3>
```

### 3. Maintain Consistent Spacing
Use the spacing scale for consistent rhythm:
```css
.section {
  padding: var(--section-padding-y) 0;
  margin-bottom: var(--space-12);
}
```

### 4. Mobile-First Responsive Design
Start with mobile styles and enhance for larger screens:
```css
/* Mobile first */
.grid {
  grid-template-columns: 1fr;
}

/* Enhance for larger screens */
@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

### 5. Use Semantic Color Names
Choose colors based on purpose, not appearance:
```tsx
<Button variant="primary">Submit RSVP</Button>
<div className="text-error">Please correct this field</div>
```

## 🚀 Implementation

### 1. Import the Design System
```css
@import './styles/design-system.css';
```

### 2. Use Components
```tsx
import { Button, Card, Input } from './components/ui';
```

### 3. Apply Utility Classes
```tsx
<div className="grid md:grid-cols-2 gap-6">
  <Card className="p-6">
    <h3 className="heading-tertiary mb-4">Card Title</h3>
    <p className="body-base">Card content</p>
  </Card>
</div>
```

### 4. Customize with CSS Variables
```css
:root {
  --color-primary: #your-brand-color;
  --font-primary: 'Your-Font', serif;
}
```

This design system provides everything needed to create beautiful, consistent, and accessible wedding websites! 💒✨