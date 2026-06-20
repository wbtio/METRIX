# Design

## Palette

- **Theme Mode**: System default with custom deep cool dark mode.
- **Neutrals**:
  - Light mode: `oklch(1 0 0)` (background), `oklch(0.145 0 0)` (foreground).
  - Dark mode: `oklch(0.145 0.015 220)` (background), `oklch(0.985 0 0)` (foreground).
- **Primary / Accent**:
  - Light mode: `oklch(0.57 0.13 218)` (Teal/Cyan).
  - Dark mode: `oklch(0.67 0.12 218)` (Teal/Cyan).
- **Destructive**:
  - Light mode: `oklch(0.577 0.245 27.325)`.
  - Dark mode: `oklch(0.704 0.191 22.216)`.

## Typography

- **Arabic Font**: IBM Plex Sans Arabic.
- **Latin Font**: Plus Jakarta Sans / Inter.
- **Hierarchy Scale**: Major Second (1.125) or Minor Third (1.2).

## Motion

- **Durations**:
  - `100-150ms`: Toggles, button press, checkbox tick.
  - `200-300ms`: Tab selection active indicator slide, hover effects.
  - `300-400ms`: Accordion expand/collapse (subtask lists).
  - `400-600ms`: Dialog overlays, toast slide-in.
- **Easing Curves**:
  - Decelerate (ease-out): `cubic-bezier(0.25, 1, 0.5, 1)` (ease-out-quart)
  - Decelerate Snappy: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint)
  - Decelerate Decisive: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)
- **Rules**:
  - Disable all transitions when `prefers-reduced-motion` is enabled.
  - Avoid layout thrashing animations (never transition layout properties directly like `height` if grid transitions or `transform: scaleY` can be used).
