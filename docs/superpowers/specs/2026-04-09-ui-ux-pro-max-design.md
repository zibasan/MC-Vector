# UI/UX Pro Max Design Spec (App Shell + Dashboard + Console)

## 1. Background

This spec defines the first UI refresh slice after the React audit remediation merge.  
Target is limited to **App shell**, **Dashboard**, and **Console**.

## 2. Confirmed Product Decisions

- Priority tabs: **Dashboard + Console**
- Density: **comfortable**
- Theme model: **light / dark / system** (default: **light**)
- Motion intensity: **moderate**
- KPI emphasis: **strong**
- Target window baseline: **desktop 1280x720**
- Scope boundary: only App shell + Dashboard + Console in this phase

## 3. Scope

### In Scope

1. App shell visual redesign (sidebar, header, content framing)
2. Dashboard visual hierarchy redesign (KPI-first card system + chart surfaces)
3. Console visual hierarchy redesign (status/search/log/input bands)
4. Shared styling primitives for the three target areas
5. Theme model migration to `light | dark | system`

### Out of Scope

1. Files/Plugins/Users/Backups/Proxy/Settings screen redesign
2. New backend/Tauri feature work
3. Broad architecture refactors outside affected UI surfaces

## 4. Recommended Approach (Approved)

Approach B: define reusable design tokens + primitive UI surfaces first, then apply to App shell and target tabs.

Rationale:

- keeps this phase consistent and production-oriented
- avoids one-off styling drift
- allows later tabs to migrate with lower incremental cost

## 5. Architecture & Styling Design

### 5.1 Theme Model

- Normalize app theme state to:
  - `light`
  - `dark`
  - `system` (OS preference)
- Default for new/empty setting: `light`
- Legacy saved theme values (e.g. `darkBlue`, `forest`, etc.) are migrated to `dark` during read.

### 5.2 Token & Primitive Layers

Use SCSS tokenized surfaces under existing style architecture:

- `src/styles/base`: global token variables and typography scales
- `src/styles/components`: reusable primitives
  - `surface-card`
  - `section-title`
  - `kpi-tile`
  - `control-chip`
- `src/styles/layout`: shell-specific structure and spacing rules
- `src/styles/views`: Dashboard/Console view-specific compositions

### 5.3 React Structure Rule

- Keep TSX focused on semantic structure.
- Move repeated/long visual chains into semantic SCSS classes.
- Preserve current interactions and command behaviors unless explicitly changed.

## 6. Screen-Level Design

### 6.1 App Shell

- Introduce clearer 3-layer contrast:
  - app background
  - sidebar surface
  - content panel surface
- Improve nav emphasis using consistent active/inactive affordances and focus rings.
- Header actions maintain current order and behavior while adopting unified button styles.

### 6.2 Dashboard

- Rebuild top area as strong KPI row (CPU/Memory/TPS/Status).
- Place charts in clearly separated metric surfaces with consistent titles/subtext.
- Keep existing data source and polling/event behavior; redesign only presentation/layout.

### 6.3 Console

- Split into four explicit zones:
  - status strip
  - search strip
  - log viewport
  - command/action strip
- Harmonize controls (find/save/filter/send) with consistent visual priority.
- Preserve existing log parsing/search/filter functionality.

## 7. Accessibility & Motion

- Respect `prefers-reduced-motion` (already introduced) for all newly added transitions.
- Maintain visible keyboard focus states for interactive shell controls.
- Ensure contrast is sufficient across light/dark variants for text and status badges.

## 8. Error Handling & Safety

- No silent fallback additions.
- Keep existing user-visible error/toast behavior.
- Avoid introducing broad try/catch wrappers around unrelated rendering code.

## 9. Validation Strategy

- Gate commands:
  1. `pnpm check`
  2. `pnpm build`
- Manual UI pass focuses on:
  - App shell layout integrity
  - Dashboard KPI/chart readability
  - Console operability and visual hierarchy
  - Light/dark/system mode switching behavior

## 10. Implementation Sequence

1. Theme model migration (`light|dark|system`) and token baseline
2. App shell refresh
3. Dashboard refresh
4. Console refresh
5. Final polish and docs update
