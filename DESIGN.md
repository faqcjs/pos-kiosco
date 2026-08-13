---
name: Kinetic Retail OS
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bccbb9'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#869585'
  outline-variant: '#3d4a3d'
  surface-tint: '#4ae176'
  primary: '#4be277'
  on-primary: '#003915'
  primary-container: '#22c55e'
  on-primary-container: '#004b1e'
  inverse-primary: '#006e2f'
  secondary: '#bcc7de'
  on-secondary: '#263143'
  secondary-container: '#3e495d'
  on-secondary-container: '#aeb9d0'
  tertiary: '#ffba61'
  on-tertiary: '#472a00'
  tertiary-container: '#ef9900'
  on-tertiary-container: '#5c3800'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6bff8f'
  primary-fixed-dim: '#4ae176'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  price-display:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-page: 24px
  sidebar-width: 240px
---

## Brand & Style

The design system is engineered for high-velocity retail environments. It prioritizes operational efficiency, legibility under varied lighting conditions, and a clear hierarchy of action. The brand personality is **Professional, Systematic, and Energetic**, reflecting the fast-paced nature of kiosk management.

The visual style is **Corporate / Modern** with a focus on **Tonal Layering**. It utilizes high-contrast accents to guide the user's eye toward primary functions (like adding items to a cart or finalizing a sale) while maintaining a clean, organized backdrop for inventory management. The aesthetic is utility-driven, avoiding decorative elements in favor of functional clarity.

Targeting kiosk owners and staff, the UI evokes a sense of **Reliability and Control**. The dark theme optimizes focus and reduces eye strain during long shifts in varied lighting, using a vibrant green to signal "success" and "active status" across the dashboard.

## Colors

This design system utilizes a high-contrast palette anchored by a vibrant **Success Green (#22C55E)**. This primary color is used exclusively for constructive actions, active states, and positive status indicators.

- **Primary:** High-visibility green (#22C55E) for CTA buttons, "Venta" (Sales) active states, and price highlights.
- **Secondary:** Deep slate (#1E293B) used for structural elements and secondary navigation to provide a grounded, professional feel.
- **Tertiary:** Amber (#F59E0B) is reserved for warning states, low stock alerts, or "Fiar" (Credit) indicators.
- **Neutrals:** Based on a deep slate (#0F172A), generating a scale of grays that provide depth for layered interfaces.

In **Dark Mode**, the interface uses a deep, sophisticated background with layered surface values to maintain the "Kiosk OS" feel while ensuring high focus and reduced glare in retail environments.

## Typography

The system uses **Inter** for all roles to maintain a unified, "app-like" feel. The typeface was chosen for its exceptional legibility at small sizes (crucial for receipt previews and inventory lists) and its neutral, professional character.

- **Scale:** A tight scale is used to maximize information density. 
- **Hierarchy:** Price information is treated with increased weight (`700`) and the Primary color to ensure it is the first thing a user sees on a product card.
- **Labels:** Small labels use uppercase styling with increased letter spacing to distinguish metadata (like "ADMINISTRADOR" or "UNIDADES") from editable content.
- **Adaptability:** On mobile devices, large headlines scale down significantly to ensure the interface remains functional on handheld scanners or tablets.

## Layout & Spacing

The design system employs a **Fluid Grid** model with fixed-width sidebars. The layout is divided into three functional zones: 
1. **Navigation Rail:** A fixed 240px sidebar for global app switching.
2. **Main Workspace:** A fluid area that uses a 12-column grid to display product tiles and management tools.
3. **Transaction Sidebar:** A fixed 320px - 400px panel on the right for the "Carrito" (Cart), keeping the checkout process always visible.

**Spacing Rhythm:**
- A **4px base unit** governs all spacing.
- **Product Grids:** Use a 16px (md) gutter to balance density with tap-target safety.
- **Touch Targets:** Minimum height for buttons and interactive items is 48px to accommodate fast-paced touch interaction at a physical kiosk.
- **Mobile:** The 3-column layout collapses into a single vertical flow, with the "Carrito" often becoming a bottom-sheet or a persistent summary bar.

## Elevation & Depth

In this dark-mode configuration, depth is conveyed through **Tonal Layers** supplemented by subtle, dark ambient shadows. This maintains a clean, digital-first look that performs well on various kiosk screens.

- **Level 0 (Base):** The darkest color in the palette. Used for the main app background.
- **Level 1 (Surface):** Slightly elevated. Used for cards, sidebars, and navigation rails.
- **Level 2 (Elevated):** Features a soft ambient shadow (e.g., 0px 4px 12px rgba(0,0,0,0.5)). Used for hover states, active input fields, and "pop-out" elements.
- **Outlines:** Low-contrast outlines (1px solid `outline-variant`) are used to define card boundaries and provide structure without visual clutter in the dark environment.
- **Status Glow:** A soft, primary-colored outer glow may be applied to the most critical action button (e.g., "Cobrar") to draw focus.

## Shapes

The shape language is **Rounded**, using a consistent corner radius to soften the technical nature of the software and make the UI feel approachable and modern.

- **Standard Elements:** Product cards, input fields, and buttons use a `0.5rem` (8px) radius.
- **Large Containers:** The main workspace and the Cart container use `rounded-xl` (1.5rem) when they are nested to create a "container-within-container" look.
- **Chips/Status:** Use `rounded-full` (pill-shape) for category filters and status indicators (like "CAJA ABIERTA") to clearly distinguish them from actionable buttons.

## Components

**Buttons**
- **Primary:** Solid green (#22C55E) background with white or high-contrast dark text. Reserved for finality (e.g., "Cobrar").
- **Secondary:** Dark slate background (#1E293B) with white text. Used for navigation and non-critical actions.
- **Icon Buttons:** Circular or slightly rounded squares with centered icons for quick actions like "Search" or "Close".

**Cards**
- **Product Tiles:** Feature a top-aligned icon/image, a centered price in `price-display` green, and a bottom-aligned label for the name. Quantity badges are placed in the top-right corner.

**Inputs**
- **Search & Add:** High-contrast containers with 1px borders. Focused states use a 2px green border.
- **Prominent Numeric Inputs:** Large, centered text for price entry or quantity adjustments.

**Status Indicators**
- **Caja Abierta:** Uses a pill shape with a leading green dot.
- **Stock Alerts:** Uses high-contrast badges in tertiary amber for items running low.

**Lists**
- **Cart Items:** Horizontal rows with condensed typography. Use a simple divider line between items. Leading space is reserved for item count, and trailing space for the subtotal.
