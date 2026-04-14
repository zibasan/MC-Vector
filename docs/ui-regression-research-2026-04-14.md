# UI Regression Research (2026-04-14)

## Scope

This document summarizes the current implementation state and likely root causes for the reported regressions:

1. File save failure (button + shortcut)
2. Plugin tab compatibility label wrapping
3. Plugin search showing literal `{}` in placeholder
4. Inconsistent plugin list entry animation when switching platforms
5. Proxy Network layout inconsistency
6. Backup target selector white/washed elements
7. Tree-only backup selector (request: Tree / Graph toggle)
8. Global select dropdown checkmark/text vertical misalignment

## Current Implementation Survey

### 1) File Save Flow

- UI trigger: `src/renderer/components/FilesView.tsx`
  - Save button: `handleSaveFile` -> `saveFileContent(...)`
  - Shortcut: `Ctrl/Cmd+S` calls the same `handleSaveFile`
- Wrapper: `src/lib/file-commands.ts`
  - `saveFileContent` -> `assertAllowedPath` -> `tauriInvoke('resolve_managed_path', ...)` -> `writeTextFile(...)`
- Backend validation: `src-tauri/src/commands/file_utils.rs`
  - `resolve_managed_path` now requires:
    - absolute path
    - no `.` / `..` components
    - inside app data subdirs (`servers`, `java`, `ngrok`)

### 2) Plugin Browser

- Main component: `src/renderer/components/PluginBrowser.tsx`
- Styles: `src/styles/views/_plugin-browser.scss`
  - Compatibility badge class: `.plugin-browser__compat-badge`
  - No explicit nowrap behavior for Japanese compatibility labels
- Placeholder translation:
  - `PluginBrowser.tsx` uses `t('plugins.browser.searchOn', { platform: ... })`
  - Locale strings currently use `{{platform}}` style
  - Interpolator in `src/i18n/index.ts` expects `{platform}` style

### 3) Proxy Network View

- Component: `src/renderer/components/ProxySetupView.tsx`
- Styles: `src/styles/views/_proxy-setup-view.scss`
- Layout is currently a single vertical panel, with backend list + action buttons in the same flow.

### 4) Backup Target Selector

- Window component: `src/renderer/components/BackupTargetSelectorWindow.tsx`
- Styles: `src/styles/views/_backup-selector-window.scss`
- Current selection UI is tree-only.
- Row checkbox uses native browser checkbox style (no component-specific class).

### 5) Global Select Styling

- Shared style entry point: `src/styles/components/_ui-components.scss`
  - `select.input-field` custom arrow + divider
  - `select.input-field option` custom background/color
- Base reset: `src/styles/base/_base.scss`

## Candidate Root Causes (to validate in implementation)

### File save failures

- Candidate A: strict `resolve_managed_path` absolute/managed-root validation now rejects path variants seen in existing saved server metadata.
- Candidate B: save path normalization mismatch between UI path composition and backend resolver constraints.

### Plugin `{}` placeholder

- Direct format mismatch: `{{param}}` in locales vs `{param}` in interpolator.
- This is expected to leave extra braces in rendered text.

### Compatibility label wrapping

- No nowrap/inline width guard on `.plugin-browser__compat-badge` while labels are shown in a flexible wrapped flag row.

### Platform animation mismatch perception

- Card animation currently mixes layout animation + per-index delay.
- Platform switch behavior likely feels different depending on list size/order and async result timing.

### Backup selector white visuals

- Native checkbox rendering in dark themed panel can appear bright/unstyled.

### Select checkmark/text alignment

- Native dropdown option rendering can be visually offset when custom option styling/font metrics are forced globally.

## Planned Fix Artifacts

- Implementation log: `docs/ui-regression-fix-log-2026-04-14.md`
- Code changes will be phase-scoped and mapped back to this research document.
