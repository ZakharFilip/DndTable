# Calm Sci-Fi Design System

Virtual Tabletop UI for tabletop RPGs. Style: **Calm Sci-Fi** with **Risograph** influences.

## Principles

1. **Beauty** — matte surfaces, restrained palette, print-inspired depth
2. **Atmosphere** — quiet observatory / mission archive, not cyberpunk
3. **Usability** — WCAG AA contrast, touch targets ≥44px where applicable

**Avoid:** neon, cyberpunk black, fantasy ornaments, genre-specific decoration.

**Works for:** fantasy, sci-fi, modern, horror — neutral working environment.

## Color proportion (60 / 30 / 10)

| Share | Role | Tokens |
|-------|------|--------|
| 60% | Base parchment / fog | `--ds-color-base`, `--ds-color-base-subtle` |
| 30% | Structure — panels, chrome, text | `--ds-color-surface*`, `--ds-color-structure*`, `--ds-color-text*` |
| 10% | Accent — CTA, active, focus | `--ds-color-accent*`, `--ds-color-focus*` |

### Base (60%)

| Token | HEX | Use |
|-------|-----|-----|
| `--ds-color-base` | `#E9E5DE` | App background |
| `--ds-color-base-subtle` | `#DFDBD4` | Hover zones, section bands |

Warm parchment replaces clinical white (`#f8fafc`). Reads as matte paper under risograph print.

### Structure (30%)

| Token | HEX | Use |
|-------|-----|-----|
| `--ds-color-surface` | `#F3F1EC` | Cards, panels |
| `--ds-color-surface-raised` | `#FAF9F6` | Modals, menus |
| `--ds-color-structure` | `#B4BFC9` | Strong borders, inactive icons |
| `--ds-color-structure-muted` | `#D1D9E0` | Hairlines |
| `--ds-color-chrome` | `rgba(243,241,236,0.88)` | TopBar, Toolbar glass |
| `--ds-color-text` | `#2A3140` | Body text |
| `--ds-color-text-secondary` | `#5A6575` | Meta |
| `--ds-color-text-muted` | `#8A939F` | Placeholder, disabled |

Cool blue-gray structure on warm base = calm sci-fi without cold SaaS feel.

### Accent (10%)

| Token | HEX | Use |
|-------|-----|-----|
| `--ds-color-accent` | `#B86A4E` | Primary buttons |
| `--ds-color-accent-hover` | `#9E583D` | Primary hover |
| `--ds-color-accent-muted` | `#EDD9CF` | Selected / active tint |
| `--ds-color-focus` | `#6B8F9C` | Focus ring, links |
| `--ds-color-focus-muted` | `#D4E4E8` | Focus background |

Terracotta = warm copper ink. Teal focus = second riso plate (duotone offset).

### Semantic

| Token | HEX |
|-------|-----|
| `--ds-color-success` | `#5A8F72` |
| `--ds-color-success-muted` | `#E0EDE7` |
| `--ds-color-warning` | `#B8925A` |
| `--ds-color-warning-muted` | `#F0E8D8` |
| `--ds-color-error` | `#A85A5A` |
| `--ds-color-error-muted` | `#F0E0E0` |

## Typography

| Role | Font | CSS variable |
|------|------|--------------|
| Display | Sora 600 | `--ds-font-display` |
| Body | Source Sans 3 | `--ds-font-body` |
| Mono | IBM Plex Mono | `--ds-font-mono` |

| Class | Size | Use |
|-------|------|-----|
| `.ds-text-display` | 1.75rem | Page titles |
| `.ds-text-title` | 1.25rem | Modal / panel headers |
| `.ds-text-body` | 15px | Default UI |
| `.ds-text-body-sm` | 14px | Lists, tables |
| `.ds-text-caption` | 12px | Badges, HUD |
| `.ds-text-label` | 11px uppercase | Section labels |

## Shadows

| Token | Use |
|-------|-----|
| `--ds-shadow-sm` | Inputs |
| `--ds-shadow-card` | Cards |
| `--ds-shadow-elevated` | Modals, dropdowns |
| `--ds-shadow-riso` | Hover (teal offset) |
| `--ds-shadow-riso-accent` | Primary button hover |
| `--ds-shadow-inset` | Pressed |

## Radii

`xs` 4px · `sm` 6px · `md` 10px · `lg` 14px · `xl` 18px · `full` pill

## Motion

| Token | Duration |
|-------|----------|
| `--ds-duration-fast` | 150ms |
| `--ds-duration-normal` | 220ms |
| `--ds-duration-slow` | 320ms |

Classes: `.ds-fade-in`, `.ds-scale-in`, `.ds-slide-up`, `.ds-riso-pulse`

Respects `prefers-reduced-motion`.

## Grain

`.ds-grain` on a container adds ~3% SVG noise overlay (paper texture).

## Components (spec)

### Button

Variants: `primary`, `secondary`, `ghost`, `danger`. Sizes: 32 / 40 / 44px height.

Primary hover: riso-accent shadow. Active: `translate(1px,1px)`.

### Card

Surface bg, structure-muted border, lg radius, card shadow. Interactive: top accent strip `::before`.

### Modal

Overlay `rgba(42,49,64,0.45)` + blur 6px. Content: surface-raised, scale-in animation.

### Context menu

surface-raised, item hover base-subtle, focus left border focus color, danger item error tones.

### TopBar / Sidebar / Toolbar

Chrome glass + structure border. Toolbar pill xl radius. Active tool: accent-muted + riso shadow.

## File layout

```
frontend/src/styles/design-system/
  tokens.css      — CSS variables + @theme
  typography.css  — fonts + text utilities
  motion.css      — animations
  grain.css       — paper texture
  components.css  — primitive classes
  index.css       — bundle + .ds-theme
```

## Preview

Open `/design-preview` in dev to review tokens before migration.

## Tailwind

Use `ds-*` color utilities from `@theme` (e.g. `bg-ds-base`, `text-ds-accent`). Legacy `primary` / `surface` aliases map to ds tokens after Phase 2.
