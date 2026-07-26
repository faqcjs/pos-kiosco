---
version: 1.0.0
name: eKiosco
framework: React + Vite + Tailwind CSS v4 + @base-ui/react

tokens:
  colors:
    light:
      background: "oklch(0.98 0.005 145)" # ~#f5f8f6 (Soft light green-gray)
      foreground: "oklch(0.2 0.02 155)"   # ~#2a3530 (Dark slate green)
      card: "oklch(1 0 0)"                 # #ffffff
      card-foreground: "oklch(0.2 0.02 155)"
      primary: "oklch(0.58 0.14 155)"     # ~#2e9d69 (Vibrant commerce green)
      primary-foreground: "oklch(0.99 0.01 145)" # ~#f9fbf9
      secondary: "oklch(0.95 0.01 155)"   # ~#ebefec (Very light green-gray)
      secondary-foreground: "oklch(0.3 0.03 155)" # ~#3d4e44
      accent: "oklch(0.75 0.15 65)"       # ~#dd8844 (Warm orange for "fiar" / credit)
      accent-foreground: "oklch(0.25 0.03 65)" # ~#502b11
      destructive: "oklch(0.577 0.22 27.325)" # ~#cb3837 (System red)
      success: "oklch(0.62 0.16 150)"     # ~#3cb075 (System success green)
      warning: "oklch(0.78 0.15 75)"       # ~#e5964b (System warning amber)
      border: "oklch(0.9 0.01 155)"       # ~#d9e2dd (Soft light borders)
      input: "oklch(0.9 0.01 155)"
      ring: "oklch(0.58 0.14 155)"
    dark:
      background: "oklch(0.18 0.015 155)" # ~#212925 (Dark slate charcoal)
      foreground: "oklch(0.96 0.01 145)"  # ~#eff3f0
      card: "oklch(0.23 0.018 155)"       # ~#2a342f (Dark gray-green cards)
      card-foreground: "oklch(0.96 0.01 145)"
      primary: "oklch(0.68 0.15 155)"     # ~#42b47d (Bright commerce green)
      primary-foreground: "oklch(0.16 0.02 155)" # ~#1b2520
      secondary: "oklch(0.3 0.02 155)"    # ~#37423c
      secondary-foreground: "oklch(0.96 0.01 145)"
      accent: "oklch(0.72 0.15 65)"       # ~#e3904d
      accent-foreground: "oklch(0.2 0.03 65)"
      destructive: "oklch(0.65 0.2 27)"   # ~#d94947
      success: "oklch(0.68 0.16 150)"     # ~#4ab980
      warning: "oklch(0.78 0.15 75)"
      border: "oklch(1 0 0 / 12%)"
      input: "oklch(1 0 0 / 15%)"
      ring: "oklch(0.68 0.15 155)"

  radius:
    default: "0.75rem" # 12px
    sm: "0.45rem"      # calc(var(--radius) * 0.6)
    md: "0.6rem"       # calc(var(--radius) * 0.8)
    lg: "0.75rem"      # var(--radius)
    xl: "1.05rem"      # calc(var(--radius) * 1.4)
    2xl: "1.35rem"     # calc(var(--radius) * 1.8)
    3xl: "1.65rem"     # calc(var(--radius) * 2.2)
    4xl: "1.95rem"     # calc(var(--radius) * 2.6)

  typography:
    sans: "ui-sans-serif, system-ui, sans-serif"
    heading: "ui-sans-serif, system-ui, sans-serif"

  spacing:
    xs: "0.25rem" # 4px
    sm: "0.5rem"  # 8px
    md: "1rem"    # 16px
    lg: "1.5rem"  # 24px
    xl: "2rem"    # 32px
---

# eKiosco Design System

A modern, high-contrast, commerce-focused Point of Sale (POS) system designed with a warm green-slate aesthetic, featuring support for a complete light and dark theme.

## Core Design Principles

- **Fluid POS Layout:** Grid-based and card-based dashboard layout optimized for quick operations, readability under store light conditions, and accessibility.
- **Micro-interactions:** Interactive components (buttons, links, row items) must have subtle scale transitions (`active:scale-[0.98]` or similar) and hover states.
- **Glassmorphism & Contrast:** Subtle borders (`border-border`), light backgrounds (`bg-card/50` with `backdrop-blur-sm`), and clear separations.

## Core Components

### 1. Cards (`Card`)
- **Base styles:** `rounded-2xl border border-border bg-card text-card-foreground`
- **Variations:** Can be used with backdrop blurs: `bg-card/50 backdrop-blur-sm`.

### 2. Buttons (`Button`)
- **Base structure:** Native button wrapped with custom Tailwind transitions and animations.
- **Variants:**
  - `default`: Primary action, using `bg-primary text-primary-foreground`.
  - `outline`: Secondary borders using `border-border bg-background hover:bg-muted`.
  - `secondary`: Subtle dark/light variant `bg-secondary text-secondary-foreground`.
  - `ghost`: Borderless, reactive on hover `hover:bg-muted`.
  - `destructive`: Warning actions, styled with a light transparent background `bg-destructive/10 text-destructive hover:bg-destructive/20`.
- **Sizes:**
  - `xs` (height: 24px), `sm` (height: 28px), `default`/`md` (height: 32px), `lg` (height: 36px).
  - Standard app touch/click targets (e.g. login submit) use height `h-11` (`44px`) for optimal tap area.

### 3. Inputs & Selects (`Input`, `Select`, `Textarea`)
- **Height:** Standard POS inputs use `h-11` (44px) with `px-3.5` and font size `text-[16px]` (to prevent auto-zooming on iOS).
- **Styles:** `rounded-xl border border-input bg-background outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40`.

### 4. Modals & Sheets (`Modal`)
- **Overlay:** Backed by `bg-foreground/40 backdrop-blur-[2px]`.
- **Variants:**
  - `sheet`: Sliding bottom sheet on mobile `mt-auto max-h-[92vh] rounded-t-3xl sm:mx-auto sm:my-auto sm:max-h-[88vh] sm:max-w-lg sm:rounded-3xl` with a subtle top drag handle.
  - `large`: Centered card modal `max-w-3xl rounded-3xl`.
  - `default`: Centered card modal `max-w-lg rounded-3xl`.

### 5. Badges (`Badge`)
- **Tones:**
  - `default`: `bg-primary/10 text-primary`
  - `success`: `bg-success/15 text-success`
  - `warning`: `bg-warning/20 text-warning-foreground dark:text-warning`
  - `danger`: `bg-destructive/12 text-destructive`
  - `muted`: `bg-muted text-muted-foreground`
  - `accent`: `bg-accent/20 text-accent-foreground dark:text-accent`

### 6. Stat Cards (`StatCard`)
- Used for indicators, margins, total counts. Displays an uppercase label, large bold numbers, and optional subtexts.

## Custom Animations & Transitions
- **Scanline Effect (`.animate-scanline`):** Keyframe-based scanning line for camera/barcode operations.
- **Float Up & Fade (`.animate-float-up-fade`):** Used for instant visual feedback on cart updates (adds a floating indicator that fades out).
- **Subtle Pulse (`.animate-pulse-subtle`):** Used for active, running processes (e.g., opened cash shift).

## UX Anti-patterns & Rules
1. **Never use hard-coded colors:** Always use CSS/Tailwind variables (`primary`, `border`, `muted`, etc.).
2. **Never drop below 44px (h-11) for primary mobile interactive areas:** POS environments are fast-paced and require reliable tap sizes.
3. **No raw scrollbars:** In scrolling listings, use `@utility no-scrollbar` if needed to save visual space.
4. **Respect iPhone Safe Areas:** Integrate `pb-safe`, `pt-safe`, and `mb-safe` when laying out bottom navigation bars or full-screen panels.
