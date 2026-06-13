---
name: 약속 잡기 Design System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#42474b'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#73787c'
  outline-variant: '#c2c7cc'
  surface-tint: '#486272'
  primary: '#486272'
  on-primary: '#ffffff'
  primary-container: '#d0ebff'
  on-primary-container: '#516b7c'
  inverse-primary: '#afcadd'
  secondary: '#3c674e'
  on-secondary: '#ffffff'
  secondary-container: '#beeecd'
  on-secondary-container: '#426d53'
  tertiary: '#6e5c36'
  on-tertiary: '#ffffff'
  tertiary-container: '#fee4b4'
  on-tertiary-container: '#78653e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cbe6fa'
  primary-fixed-dim: '#afcadd'
  on-primary-fixed: '#011e2d'
  on-primary-fixed-variant: '#304a5a'
  secondary-fixed: '#beeecd'
  secondary-fixed-dim: '#a3d1b2'
  on-secondary-fixed: '#002111'
  on-secondary-fixed-variant: '#244f37'
  tertiary-fixed: '#f9dfb0'
  tertiary-fixed-dim: '#dcc496'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#554421'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  time-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: -0.01em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.5rem
  sm: 0.75rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  gutter: 1rem
  margin-mobile: 1.25rem
---

## Brand & Style

The design system is centered on the concept of "Effortless Coordination." It targets busy professionals and social planners who require a friction-free, calming interface to manage their time. The emotional response is one of clarity, softness, and reliability.

The aesthetic blends **Modern Minimalism** with **Glassmorphism**. It utilizes a "Soft UI" approach—moving away from the starkness of traditional productivity tools toward a more organic, lifestyle-oriented feel. By using generous whitespace and a pastel-driven palette, the system reduces the visual stress often associated with dense calendar scheduling. The UI feels airy and lightweight, prioritizing a mobile-first, thumb-friendly interaction model.

## Colors

This design system uses a specialized categorical color palette to provide instant visual context for different types of appointments. 

- **Primary & Action:** Soft Blue (#D0EBFF) is the primary interactive color, used for CTA buttons and active states. Soft Mint (#C6F6D5) serves as a secondary highlight for success states or alternative active markers.
- **Categorical Pastels:** These are applied to calendar events and category chips. They must maintain a high contrast ratio with text (use dark grey or deep navy text over these pastels).
- **Backgrounds:** Light mode uses a nearly-white gray (#F8F9FA) to reduce eye strain.
- **Dark Mode:** Surfaces shift to Deep Navy/Charcoal (#1A1B1E). Pastel colors should be slightly desaturated or used as subtle glow effects/borders in dark mode to prevent visual vibration.

## Typography

The typography strategy focuses on legibility and a friendly, contemporary tone. **Plus Jakarta Sans** is used for headings and time displays to provide a soft, rounded geometric feel that complements the brand's shapes. **Be Vietnam Pro** is used for all functional body text and labels due to its excellent readability at small scales on mobile screens.

- Use **Time-Display** for clock numerals and calendar dates to ensure they feel prominent.
- Maintain generous line heights (1.5 - 1.6) for body text to keep the "airy" feel of the design system.
- In dark mode, reduce font weight slightly or use a slightly off-white color (#E9ECEF) to prevent text "bleeding" on dark backgrounds.

## Layout & Spacing

This is a **mobile-first fluid grid** system. 
- **Mobile:** 4-column grid with 20px (1.25rem) side margins.
- **Desktop/Tablet:** Max-width container of 768px for the main calendar view to maintain the "app-like" feel even on larger screens.
- **Vertical Rhythm:** Follows an 8px (0.5rem) baseline increments. 
- **Touch Targets:** All interactive elements (buttons, time slots) must have a minimum height of 48px. 
- **Negative Space:** Use "Generous Padding" (1.5rem+) between major sections (e.g., between the monthly grid and the daily agenda list) to prevent the UI from feeling cluttered.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** and **Ambient Shadows**.

- **Level 0 (Background):** #F8F9FA. No shadow.
- **Level 1 (Cards/In-page elements):** White background with a very soft, diffused shadow: `0 4px 20px rgba(0, 0, 0, 0.04)`.
- **Level 2 (Active selection/Floating buttons):** Slightly tighter shadow with more vertical offset: `0 8px 24px rgba(0, 0, 0, 0.08)`.
- **Overlays (Bottom Sheets):** These use a backdrop blur (12px) on the obscured content and a subtle top-shadow to indicate they sit above the entire interface.

In Dark Mode, elevation is communicated via surface color lightening rather than shadows. Level 1 surfaces should be #25262B, and Level 2 surfaces should be #2C2E33.

## Shapes

The shape language is overtly **Rounded and Friendly**. 
- **Small Elements (Chips/Checkboxes):** 0.5rem (rounded-md).
- **Standard Components (Buttons/Inputs):** 1rem (rounded-xl/Pill).
- **Container Elements (Cards/Calendar Grid):** 1.5rem (rounded-2xl).
- **Sheet Components (Bottom Sheets):** 2rem (rounded-3xl) specifically on the top corners to create a soft, inviting transition from the bottom of the screen.

## Components

### Buttons
- **Primary:** Pill-shaped, Soft Blue (#D0EBFF) background with dark navy text.
- **Secondary/Toggle:** Pill-shaped, ghost style with a 1px border in #DEE2E6. When active, fills with Soft Mint (#C6F6D5).

### Calendar Grid
- Monthly view uses minimal border lines (#F1F3F5). 
- The "Today" indicator is a Soft Blue circle. 
- Individual date cells have a high aspect ratio (square or slightly tall) to accommodate touch.

### Bottom Sheets
- Used for adding/editing appointments. 
- Must feature a center-aligned "grabber" handle at the top.
- Transitions should be "Spring" based (stiffness: 300, damping: 30) for a tactile feel.

### Event Cards
- Vertical "pill" or rounded-rect cards.
- Left-accented border (4px) using the categorical pastel color (Lunch, Dinner, etc.).
- Background of the card is a very faint version of the categorical color (5% opacity) to signify the grouping.

### Input Fields
- Rounded-xl (1rem) corners.
- Background #FFFFFF (Light) or #25262B (Dark).
- Subtle 1px border that glows Soft Blue on focus.