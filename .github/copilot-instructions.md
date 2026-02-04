<!-- Copilot instructions for contributors and AI agents -->
# Copilot Guidance — kenstar-pos

Purpose: quickly orient AI coding agents to the repository structure, conventions, and important integration points so edits are safe, consistent, and productive.

- Project type: Next.js (App Router) TypeScript app scaffolded by `create-next-app`.
- App entry: `src/app/` (root `src/app/layout.tsx`, pages in `src/app/*`). Use server components by default; opt into client behavior only where `window` or browser APIs are used.

Architecture & key boundaries
- UI primitives: `src/components/ui/` — small, reusable building blocks (e.g., `button.tsx`, `card.tsx`, `dialog.tsx`). Prefer these over ad-hoc HTML; they use `class-variance-authority` (`cva`) + `cn` (`src/lib/utils.ts`) for class composition.
- Domain components: `src/components/pos/` for point-of-sale UI (example: `CategoryFilters.tsx`). Keep domain logic in these components or lift to `src/lib` for reuse.
- Pages: `src/app/pos/page.tsx`, `src/app/inventory/page.tsx` — use the app router conventions (default export `page` components). Check `src/app/layout.tsx` for global layout and font setup.

Data & integrations
- Supabase: client created in `src/lib/supabase.ts` (`createClient`). This repo currently has a hard-coded URL/key in that file — treat as sensitive and prefer moving secrets to environment variables (`process.env`) when modifying.
- Printing: `src/lib/printService.ts` opens a popup and calls `window.print()` — client-only; guard with `if (typeof window === 'undefined') return;` (already used). Be cautious: printing requires popup permissions.
- Storage: public assets referenced via Supabase storage URLs (see `printService.ts` for the logo URL). When changing image paths, verify public access.

Conventions & patterns
- Styling: Tailwind CSS (see `globals.css`) + `tailwind-merge` + `clsx`. Use `cn()` from `src/lib/utils.ts` to combine classes.
- Component variants: many UI primitives export CVA variant helpers (e.g., `buttonVariants`) and `asChild`/`Slot` patterns — preserve data attributes like `data-slot`/`data-variant` when refactoring to keep styling/selector assumptions intact.
- Import alias: `@/*` maps to `./src/*` (see `tsconfig.json`). Use `@/` imports for internal modules.
- TypeScript: strict settings are enabled. Keep exports typed; prefer small type changes and avoid disabling `strict` rules.

Developer workflows
- Local dev: `npm run dev` (Next default). Build: `npm run build`. Start production server: `npm run start`. Lint: `npm run lint`.
- VS Code task: workspace may include a `build` task that runs `msbuild` on Windows — unrelated to Next.js flow; ignore unless you know the task is intentionally added for native components.

Safety notes for AI edits
- Do not commit secrets: `src/lib/supabase.ts` currently contains keys; if you modify this file, replace secrets with `process.env.*` and add instructions to the README.
- Client vs Server: prefer server components for data fetching unless UI requires browser APIs (e.g., `window`, `localStorage`, printing). Use `"use client"` at top of files needing client runtime.
- DOM manipulation & popups: `printService.ts` opens windows — keep guards and user-notification behavior intact.

Useful files to inspect when making changes
- Root layout: `src/app/layout.tsx`
- POS page: `src/app/pos/page.tsx`
- UI primitives: `src/components/ui/*` (e.g., `button.tsx`)
- Domain components: `src/components/pos/*`
- Utilities & integrations: `src/lib/supabase.ts`, `src/lib/printService.ts`, `src/lib/utils.ts`

If unclear: ask for the intended runtime (server vs client), whether secrets can be stored in env, and which deployment target (Vercel vs custom). After edits, run `npm run dev` and verify the POS flows and printing locally.

— End
