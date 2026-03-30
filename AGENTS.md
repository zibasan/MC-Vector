# AGENTS Guide

## Project Summary

MC-Vector is a desktop app (Tauri + React + TypeScript) for Minecraft server management.
Frontend UI is built with React and Tailwind, with SCSS partials used to keep repetitive view styling out of TSX.

## Tech Stack

- Frontend: React 19, TypeScript, Vite, TailwindCSS, SCSS
- Desktop shell: Tauri v2 (Rust backend in src-tauri)
- Package manager: pnpm

## Common Commands

- Install dependencies: `pnpm install`
- Dev frontend: `pnpm dev`
- Dev with Tauri: `pnpm tauri:dev`
- Build frontend: `pnpm build`
- Build desktop app: `pnpm tauri:build`
- Lint/format: `pnpm biome:check`, `pnpm lint`, `pnpm format`

## Frontend Styling Rules

1. Keep short utility usage in TSX when it is local and truly one-off.
2. Move long/repeated class chains into SCSS classes under `src/styles`.
3. Group styles by responsibility:
	- `src/styles/base`: global base/reset rules
	- `src/styles/components`: reusable UI primitives
	- `src/styles/layout`: app shell/layout rules
	- `src/styles/modals`: modal-specific styles
	- `src/styles/views`: per-view styles
4. Import styles only through `src/styles/index.scss` from `src/main.tsx`.
5. Avoid invalid Tailwind `@apply` values (for example `bg-white/3`). Use explicit CSS color values when needed.

## TypeScript/React Conventions

1. Prefer explicit interfaces for component props and shared data structures.
2. Keep async file/system operations in `src/lib` wrappers; UI components should call wrappers, not raw APIs.
3. Preserve existing user-facing behavior when refactoring.
4. When extracting repeated UI patterns, prefer semantic class names over anonymous utility chains.

## Type Safety Guardrails

1. Do not introduce `any` in production code. Use `unknown` for external input and narrow with type guards.
2. Every API payload consumed from Modrinth/Hangar/Spigot must be parsed through runtime guards before UI use.
3. Keep discriminated unions explicit for platform-specific behavior (for example plugin source switching).
4. Treat optional properties as nullable and provide safe fallbacks in rendering and install flows.
5. If a guard cannot prove shape safety, fail with a user-visible error instead of unsafe casting.

## Phase Execution Rules

1. Implement large requests by phase, not by scattered partial edits.
2. Complete all tasks in the active phase before proposing the next phase.
3. After each phase, run build and diagnostics, then report unresolved risks.
4. Keep one commit scope per phase unless a single phase becomes too large and must be split.
5. Align feature phases with `docs/engineering-requirements.md` and update status after significant changes.

## Refactor Checklist

Before finishing a refactor:

1. Run `pnpm build` and ensure it succeeds.
2. Confirm there are no stale style imports/paths.
3. Update README structure notes when directory layout changed.
4. Keep diffs focused; avoid unrelated formatting churn.

## Safety Notes

1. Do not use destructive git commands (`reset --hard`, `checkout --`) unless explicitly requested.
2. Do not revert user changes outside the requested scope.
3. If unexpected modifications are detected, pause and ask for confirmation before proceeding.

### General
Commit messages must be in English and use the prefixes feat:, fix:, refactor:, or docs:.
After completing an implementation, edit, or a single prompt task, check for any remaining items within the current phase. If all items in the current phase have been completed, check if there are items to be implemented in the next phase. If so, ask the user in question mode to select where to proceed with implementation. Do this after every implementation until all implementations in every phase are complete—that is, until the project is ready for release. Additionally, after that question, generate a command that includes a commit message appropriate for the changes made in that implementation, and ask the user in question mode whether to actually execute that command. Do not ask about generating a commit command for every change or implementation within the same phase. However, an exception is made for changes or implementations within the same phase if the scope of each individual implementation is large. Furthermore, even if the user chooses not to execute the commit command, if there are still tasks to be implemented within the same phase or if the next phase remains, continue implementation and repeat the cycle of “question → implementation → question” indefinitely until implementation is complete. The “question” referred to here is not a question asked in the form of text output by you, but rather the multiple-choice questions used when defining requirements in Plan mode. The format for the commit command should be git commit -m “message” -m ‘message’ -m “message”, summarizing the implemented content broadly and using the -m option to separate each line with a newline.
Perform Git operations by entering commands directly in the terminal within VSCode. Do not use MCP or similar tools; enter the commands directly.
Adding files: git add .
Commit: As described in the bullet point above, use the format that includes a commit message appropriate for the changes made in each implementation. git commit -m “message” -m ‘message’ -m “message”
Push: git push origin main
If you run a reset command such as git reset --soft HEAD^ due to some issue, I will notify you. In that case, you must perform a force push (git push -f -u origin main) to avoid conflicts and rejection.
After completing the implementation or editing for the given prompt, before building, read all files (.java, .ts, .json, .yml, etc.) from the background. If there are any errors or warnings, investigate the details and cause of the errors and fix them. Since a single fix may not resolve the issue, retrieve the errors from the background again after making the fix and continue the process until there are zero errors and warnings.
If there are multiple updates or additions, number them sequentially (1, 2, 3) and assign them to separate tasks. Additionally, all tasks with these numbers must be implemented in a single prompt. Proceed with implementation step by step, reporting the progress of each step to the user as you go.
For example, if there are three tasks—1. Converting to binary IPC (removing Base64), 2. Adaptive FPS control, and 3. Extending rectangular difference rendering on the Java side—and you are instructed to “complete tasks 1 through 3,” you must finish implementing all of them in a single round of prompts.
