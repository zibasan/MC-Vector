# UI Regression Fix Log (2026-04-14)

## Summary

This document records concrete fixes implemented for the reported UI/save regressions and the file-level mapping.

## Implemented Fixes

### 1) File save failure (button / shortcut)

- Updated `src/lib/file-commands.ts`
  - Added compatibility-safe relative path normalization into managed absolute roots (`servers`, `java`, `ngrok`) before `resolve_managed_path`.
  - Preserved traversal blocking while accepting legacy relative paths.
- Updated `src/renderer/components/FilesView.tsx`
  - Save handler now avoids duplicate submissions while saving.
  - Editor is closed only on successful save (not on failed save).
  - Keyboard save uses the same async flow (`void handleSaveFile()`).

### 2) Plugin tab compatibility label wrapping

- Updated `src/styles/views/_plugin-browser.scss`
  - Added `whitespace-nowrap` to `.plugin-browser__compat-badge`.

### 3) Plugin search placeholder showing `{}` / interpolation braces

- Updated `src/i18n/index.ts`
  - Interpolator now supports both `{param}` and `{{param}}` syntaxes.
  - This removes brace artifacts without requiring broad locale rewrites.

### 4) Platform switch animation consistency (Modrinth/Hangar/Spigot)

- Updated `src/renderer/components/PluginBrowser.tsx`
  - Standardized card enter/exit animation into one shared motion profile.
  - Removed per-index stagger delay and unified transition easing/duration.
  - Switched `AnimatePresence` to `mode="wait"` for consistent platform transitions.
  - Reduced-motion behavior remains explicitly supported.

### 5) Proxy Network layout alignment

- Updated `src/renderer/components/ProxySetupView.tsx`
  - Grouped proxy software + port into a dedicated top grid section.
- Updated `src/styles/views/_proxy-setup-view.scss`
  - Centered and widened main panel (`w-full`, `max-w-4xl`, `mx-auto`).
  - Added responsive top grid, improved backend row alignment, and action alignment.
  - Added backend meta container styles and checkbox accent styling.

### 6) Backup selector visual consistency (white/washed controls)

- Updated `src/styles/views/_backup-selector-window.scss`
  - Styled selector checkboxes via `.backup-selector-window__node-checkbox` with dark-theme-compatible accenting.
  - Added structured toolbar view toggle styling.

### 7) Backup selector Tree / Graph view toggle

- Updated `src/renderer/components/BackupTargetSelectorWindow.tsx`
  - Added `viewMode` state (`tree` / `graph`).
  - Added toolbar toggle buttons to switch rendering mode.
  - Implemented graph-oriented grouped rendering while reusing existing selection state and apply flow.
- Updated `src/styles/views/_backup-selector-window.scss`
  - Added graph panel/card/node styles.
- Updated i18n keys:
  - `src/i18n/locales/ja.ts`
  - `src/i18n/locales/en.ts`
  - `src/i18n/types.ts`

### 8) Global select dropdown checkmark/text alignment

- Updated `src/styles/components/_ui-components.scss`
  - Added explicit option typography (`font-size`, `line-height`, native system font stack) for more stable native dropdown alignment on macOS.

## Verification

- `pnpm check`
- `pnpm build`

Both completed successfully after formatting fixes.
