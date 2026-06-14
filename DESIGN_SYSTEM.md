# Sentinel Design System

> Single source of truth for color, spacing, components, and accessibility rules.
> If you reach for a hex literal or hand-roll a card-skeleton-h1-button combo for
> the third time, stop and read this.

---

## 1. Color

**Brand palette** lives in `src/lib/design-tokens.ts` and is mirrored to:
- CSS variables (`src/index.css`)
- Tailwind theme (`tailwind.config.js`)
- shadcn/ui HSL tokens (`--primary`, `--accent`, etc.)

| Token | Hex | Use |
|---|---|---|
| `brand-electric` / `electric-500` | `#00D4FF` | accent, focus rings, highlights |
| `brand-blue`     / `electric→blue gradient` | `#1F6FEB` | primary action, links |
| `brand-navy`     / `navy-800` | `#0A2540` | cards, popovers, raised surfaces |
| `brand-carbon`   / `navy-900` | `#0B1220` | app background |
| `brand-blanco`   | `#FFFFFF` | primary text on dark |

**Neutral ramp**: `navy-50` … `navy-900` follows the same hue so the UI never
drifts into "blue-gray slop". Use `navy-100` for muted text, `navy-200` for
tertiary, `navy-500` for borders, `navy-700` for raised surfaces.

### Rules

✅ **DO**
```tsx
<div className="bg-brand-navy text-white border-navy-500" />
<button className="bg-brand-blue hover:bg-electric-400" />
import { BRAND_COLORS } from '@/lib/design-tokens';
canvas.fillStyle = BRAND_COLORS.electric;
```

❌ **DON'T**
```tsx
<div className="bg-[#0a0a0a]" />              // hardcoded hex
<div style={{ background: '#1F6FEB' }} />     // bypasses theme
<div className="bg-blue-600" />               // Tailwind random shade
```

If you need a shade that doesn't exist, ADD it to `design-tokens.ts` +
`tailwind.config.js` first, then use the named token.

### Semantic colors

Status badges use the **risk palette** (independent of brand because "red =
critical" is universal):
- `text-red-200` + `AlertOctagon` icon → critical
- `text-orange-200` + `AlertTriangle` → high
- `text-amber-200` + `AlertCircle` → medium
- `text-green-200` + `CheckCircle2` → low

Always use `<RiskBadge>` from foundation — it bakes in WCAG triple-redundancy
(color + icon + text label).

---

## 2. Typography

Two families, loaded via Google Fonts in `src/index.css`:

| Family | Tailwind class | Use |
|---|---|---|
| Inter (400/500/600/700) | `font-sans` (default) | All UI text |
| JetBrains Mono (400/500) | `font-mono` | API keys, IDs, code, hashes |

**Sizes** (from `index.css` h1–h5 base + Tailwind `text-*`):
- `text-2xl font-semibold` → page title (`<PageHeader title="…" />`)
- `text-lg font-medium` → card title
- `text-sm` → body
- `text-xs` → captions, labels
- `text-[10px]` or `text-[11px]` → badges (only when xs is too big)

---

## 3. Spacing

Use **Tailwind's 4px scale** (1 = 4px, 2 = 8px, 3 = 12px, 4 = 16px, 6 = 24px,
8 = 32px). Pick the smallest scale that gives breathing room — if `p-3` works,
don't use `p-5`.

**Page padding canonical**:
```tsx
<div className="min-h-screen bg-background p-4 sm:p-8">
  <div className="max-w-7xl mx-auto space-y-6">
    <PageHeader … />
    {/* content */}
  </div>
</div>
```

**Vertical rhythm**: `space-y-6` between major page sections,
`space-y-4` within sections, `space-y-2` within cards.

---

## 4. Border radius

| Token | Tailwind | Use |
|---|---|---|
| pill | `rounded-full` | avatars, dots, circular buttons |
| sm   | `rounded-md`   | badges, chips |
| md   | `rounded-lg`   | inputs, small buttons |
| lg   | `rounded-xl`   | cards, modal content, primary buttons |
| xl   | `rounded-2xl`  | feature icons (gradient pills in headers) |

Don't mix `rounded-xl` and `rounded-2xl` in the same surface.

---

## 5. Components

Always reach for `@/components/foundation` before rolling your own.

| Component | When |
|---|---|
| `<PageHeader>` | Every page's h1 + description + actions row |
| `<EmptyState>` | Zero-data / no-results panels (must include action) |
| `<DataTable>`  | Any tabular data (auto-stacks as cards on mobile) |
| `<RiskBadge>`  | Risk indicators (NEVER use color alone) |
| `<MetricCard>` | KPI tiles in a dashboard row |
| `<SkeletonTable>` | Loading state for a `<DataTable>` |

shadcn primitives (`Card`, `Button`, `Dialog`, etc.) sit underneath.

---

## 6. Responsiveness

**Breakpoints** (Tailwind defaults):
- `sm` 640px (phone landscape / small tablet)
- `md` 768px (tablet / `<DataTable>` switches from card to table)
- `lg` 1024px (desktop)
- `xl` 1280px

**Grid pattern** for KPI rows / forms:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
  {/* never start with grid-cols-2 — phones collapse to 1 */}
</div>
```

**Tables**: use `<DataTable>`. It collapses to cards below `md`. If you need
a raw table, wrap with `overflow-x-auto` AND mark the primary column with
`sticky left-0 bg-card` so users can scan while horizontally scrolling.

---

## 7. Accessibility (WCAG 2.2 AA)

Non-negotiable:
- **Contrast** ≥ 4.5:1 for body text, ≥ 3:1 for icons / UI components / large
  text. `text-navy-100` on `bg-brand-navy` passes; `text-navy-200` on
  `bg-brand-navy` only passes for large text.
- **Never use color alone** to convey state. Pair with icon + text (see
  `<RiskBadge>` for the canonical pattern).
- **Icon-only buttons need `aria-label`**:
  ```tsx
  <Button size="icon" aria-label="Eliminar webhook"><Trash2 /></Button>
  ```
- **Focus ring**: brand uses electric blue on focus (`--ring`). Don't
  override unless replacing with something equally visible (≥ 3:1 contrast).
- **Avoid `#000` / `#FFF` pairs**: use `brand-carbon` and `brand-blanco`
  (which is `#FFFFFF` but on `brand-carbon` `#0B1220`, not pure black).

---

## 8. Motion

Framer Motion is in. Default page enter: `{ y: -20 → 0, opacity: 0 → 1 }`
over 300ms. `<PageHeader>` and `<MetricCard>` already do this — caller
passes `delay` to stagger.

Don't animate things that don't communicate (no idle background pulses
unless they indicate live state).

---

## 9. Adding a new page

**RULE OF ONE PAGE SHELL**: every authenticated route is wrapped in
`<AppPage>`. Do not hand-roll the `min-h-screen` + `max-w-…` + `mx-auto`
+ `px-…` combo again. There is exactly ONE canonical shell.

1. Start from this skeleton:
   ```tsx
   import { AppPage, Section, PageHeader } from '@/components/foundation';

   export function MyPage() {
     return (
       <AppPage>
         <PageHeader title="…" description="…" icon={…} actions={…} />

         <Section title="KPIs">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
             {/* MetricCards */}
           </div>
         </Section>

         <Section title="Resultados" actions={<Button>…</Button>}>
           <DataTable … />
         </Section>
       </AppPage>
     );
   }
   ```
2. `<AppPage width>`: `default` (max-w-7xl) | `narrow` (4xl) | `wide` (full).
3. Tabular data → `<DataTable>` + `<SkeletonTable>` + `<EmptyState>`.
4. KPI row → `<MetricCard>` × N inside a `<Section>`.
5. Risk anywhere → `<RiskBadge>` / `<RiskScoreGauge>`.
6. Right-rail evidence (master-detail) → `<EvidencePanel>`.
7. Route in `App.tsx` under the matching `<RoleGate>`.
8. Nav entry in `Sidebar.tsx` with the correct `minRole`.

**NEVER**:
- `pt-20`, `pt-24` anywhere on pages (legacy topbar offset; sidebar
  replaced it — these now add wasted whitespace at the top of every
  route).
- Hand-roll `<div className="min-h-screen …">` outside `<AppPage>`.
- Mix `max-w-5xl` and `max-w-7xl` in the same area. Pick one via
  `<AppPage width>` and stick with it.

If something feels manual, check whether a foundation component already
covers it before writing CSS.
