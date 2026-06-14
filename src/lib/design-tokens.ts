/**
 * Sentinel design tokens — single source of truth.
 *
 * Anywhere you'd hardcode a hex color, import from here instead. The same
 * values are also published to CSS variables in src/index.css and to the
 * Tailwind theme in tailwind.config.js, so:
 *   - Tailwind utilities (bg-brand-blue, text-electric, …) work in JSX.
 *   - shadcn/ui primitives keep working via --primary, --background, etc.
 *   - Non-Tailwind code (Recharts, inline canvas, Three.js, dynamic SVGs)
 *     should import COLORS from this file rather than copy hex strings.
 *
 * RULE: never duplicate a color literal across files. If you need a new
 * shade, add it here first and re-export.
 */

export const BRAND_COLORS = {
  // Pure brand palette — these are the only colors the marketing site
  // and printed materials use. The product UI extends them with neutral
  // ramps below.
  electric: '#00D4FF',  // accent, focus rings, highlights, CTAs on dark
  blue:     '#1F6FEB',  // primary action, links, brand stamps
  navy:     '#0A2540',  // surfaces, cards, navbars
  blanco:   '#FFFFFF',  // primary text on dark, inverted surface
  carbon:   '#0B1220',  // app background (deep navy-black)
} as const;

/**
 * Neutral ramp derived from `navy` and `carbon`. Use these for borders,
 * dividers, secondary surfaces — keeps the whole UI in the same hue
 * family instead of drifting toward gray-blue.
 */
export const NEUTRAL = {
  900: '#06090F',  // darker than carbon — modals overlays
  800: '#0B1220',  // carbon
  700: '#0F1C32',  // raised surfaces
  600: '#142849',  // hover surfaces
  500: '#1B3760',  // borders strong
  400: '#274A7A',  // borders medium
  300: '#3F6594',  // borders soft + secondary text on dark
  200: '#7794B8',  // tertiary text
  100: '#B7C9DD',  // muted text
  50:  '#E8EFF7',  // text whispered (on dark)
} as const;

/**
 * Semantic risk colors — preserved from the previous design system so the
 * existing risk badges keep rendering. These are NOT brand colors; they
 * have to read as "warning" universally, so the cyan/blue palette can't
 * cover them.
 */
export const RISK = {
  critical: '#EF4444',  // red 500
  high:     '#F97316',  // orange 500
  medium:   '#EAB308',  // yellow 500
  low:      '#22C55E',  // green 500
} as const;

/**
 * Gradients used by the marketing surfaces (login, signup, empty states,
 * CTAs). All gradients flow brand → accent so the eye lands on the
 * electric-blue endpoint.
 */
export const GRADIENTS = {
  primary:   `linear-gradient(135deg, ${BRAND_COLORS.blue}, ${BRAND_COLORS.electric})`,
  deep:      `linear-gradient(135deg, ${BRAND_COLORS.navy}, ${BRAND_COLORS.blue})`,
  hero:      `linear-gradient(135deg, ${BRAND_COLORS.carbon}, ${BRAND_COLORS.navy} 60%, ${BRAND_COLORS.blue})`,
  electric:  `linear-gradient(135deg, ${BRAND_COLORS.electric}, ${BRAND_COLORS.blue})`,
  glass:     `linear-gradient(135deg, rgba(10, 37, 64, 0.7), rgba(11, 18, 32, 0.85))`,
} as const;

/**
 * Aliases scoped to the product (vs the pure brand palette). Use these
 * when you're styling product chrome — they map to brand colors but
 * carry product-specific meaning that can be retuned without changing
 * brand palette.
 */
export const COLORS = {
  // Surfaces
  background:        BRAND_COLORS.carbon,
  surface:           BRAND_COLORS.navy,
  surfaceHover:      NEUTRAL[600],
  surfaceRaised:     NEUTRAL[700],

  // Borders
  border:            NEUTRAL[500],
  borderHover:       NEUTRAL[400],
  borderSubtle:      'rgba(31, 111, 235, 0.15)',  // blue 15%

  // Text
  text:              BRAND_COLORS.blanco,
  textSecondary:     NEUTRAL[100],
  textMuted:         NEUTRAL[200],
  textWhispered:     NEUTRAL[300],

  // Actions
  primary:           BRAND_COLORS.blue,
  primaryHover:      '#3B82F6',                    // tailwind blue-500 — slightly brighter on hover
  accent:            BRAND_COLORS.electric,
  accentHover:       '#33DCFF',
  link:              BRAND_COLORS.electric,

  // Focus / interaction
  ring:              BRAND_COLORS.electric,

  // Semantic
  risk:              RISK,
} as const;

/**
 * Chart-friendly palette for Recharts. Ordered so the first N entries
 * give the best contrast across a small categorical chart.
 */
export const CHART_PALETTE = [
  BRAND_COLORS.electric,
  BRAND_COLORS.blue,
  '#8B5CF6',  // violet
  '#22C55E',  // green
  '#F97316',  // orange
  '#EAB308',  // yellow
  '#EC4899',  // pink
  NEUTRAL[300],
] as const;

export type BrandColor = keyof typeof BRAND_COLORS;
export type NeutralShade = keyof typeof NEUTRAL;
