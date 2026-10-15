# Architecture and maintenance

Nerdungeon is one Express modular monolith with a React/Vite client and a Phaser renderer. The API remains `/api`, the backend listens on port 4000, and Vite serves port 5173 and proxies `/api`. Modules use functions and concrete adapters; there is no dependency injection container or separate service deployment.

## Backend ownership

| Area | Responsibility |
| --- | --- |
| `src/app.ts`, `src/server.ts` | Compose middleware, authenticate requests, mount routers, translate errors, start the server. |
| `modules/account/index.ts` | Verify Supabase access tokens and expose account identity through request locals and `/api/me`. |
| `modules/game/index.ts` | HTTP input/output and multipart limits. Delegate game actions and forging. |
| `modules/game/types.ts` | Domain data types, with no imports from HTTP, database, or AI adapters. |
| `modules/game/state.ts`, `battle.ts`, `summon.ts`, `tutorial.ts` | Game rules, rewards, attempts, content, and initial state. No network I/O. |
| `modules/game/snapshot.ts` | Build public responses. Remove question banks; expose an answer key only in feedback for an answered question. |
| `modules/game/store.ts` | Read/create state, upgrade legacy tutorial banks, and save with optimistic concurrency. |
| `modules/game/forge.ts` | Validate the uploaded source, generate content, store the source, save the expedition, and compensate a failed state write by removing the source. |
| `modules/game/pdf.ts` | Validate PDF structure, own learning instructions/schema, validate generated content, and assemble an expedition. Accept a generation function for tests or a future provider. |
| `platform/supabase.ts`, `platform/gemini.ts`, `platform/errors.ts` | Provider clients, Gemini HTTP transport/retries, and safe public HTTP errors. |

Game actions operate on a cloned state. `store.ts` writes only when the persisted version still matches, retries a conflict up to five times, and recomputes the action from the latest state. External I/O belongs outside this retry callback. Answer and completion retries remain idempotent; summon purchases do not gain automatic HTTP retries.

## Frontend ownership

| Area | Responsibility |
| --- | --- |
| `App.tsx` | Shell, navigation, page lifetime, and wiring callbacks into screens. |
| `src/modules/game/types.ts`, `tutorial.ts` | Public game DTOs and initial tutorial display metadata. No backend question bank. |
| `src/modules/game/api.ts` | Game/forge HTTP requests and JSON response/error handling. |
| `src/modules/game/useGame.ts` | Load/update the account game snapshot and publish successful responses into React state. |
| `src/modules/game/useAdventure.ts` | Expedition/chapter selection, recent adventure, battle entry, start/restart sequencing. |
| `src/modules/game/useForge.ts` | File selection, one in-flight forge, minimize/retry state, and result notification. |
| `src/platform/auth.ts` | Supabase browser session and anonymous sign-in. |
| `src/screens/`, `src/components/` | Screen-specific presentation, interactions, and reusable UI. |
| `src/game/` | Phaser scene, traversal simulation, chunk pooling, and visual loot. Never grant account rewards. |

The API layer imports domain DTOs, not screen components. React screen state and asynchronous operations live in focused hooks. Presentation may keep animation/dialog state because those states belong to the rendered interaction.

## Upload sequence and failure behavior

```mermaid
sequenceDiagram
    participant UI as Hub / useForge
    participant API as Game router
    participant Forge as Forge service
    participant PDF as PDF module
    participant AI as Gemini adapter
    participant Storage as Private Storage
    participant State as State repository
    UI->>API: Authenticated multipart PDF
    API->>Forge: Source and account identity
    Forge->>PDF: Validate structure and generate expedition
    PDF->>AI: PDF bytes, schema, grounded instructions
    AI-->>PDF: JSON or provider error
    PDF-->>Forge: Validated expedition
    Forge->>Storage: Store account-owned source
    Forge->>State: Append expedition with version check
    alt State write succeeds
        State-->>API: Persisted game
        API-->>UI: Public snapshot
    else State write fails
        Forge->>Storage: Remove uploaded source
        API-->>UI: Error; no successful expedition response
    end
```

Validation or generation failure occurs before Storage/state writes. PDFs require 1–1000 pages and at most 25 MB. Each new region requires exactly ten validated questions, four distinct options, and valid physical page references. Unreadable documents fail explicitly. DOCX preserves its existing starter chapters and does not generate a playable question bank.

Gemini retries only HTTP 503, at most three attempts, under one 90-second deadline. Quota, invalid inputs, missing models, and authentication failures are not retried. Logs include model, byte/page count, provider status, duration, and token counts; never keys, tokens, PDF text, or raw provider messages.

## SOLID in this codebase

Single responsibilities are separated at the route, domain, application, persistence, provider, and presentation boundaries. The PDF module accepts a generation function with a small input/output contract; replacing the provider must still pass the same content validator. Callers use narrow callbacks rather than a generic manager. Substitution means preserving those contracts and failure behavior; it does not require introducing class hierarchies or interfaces for every function.

Keep new behavior in its owning module. Do not put network calls in game rules, import screens into API/domain code, or repeat reward rules in React. Split a module when its responsibilities diverge, not to hit a target file size.

## Verification and current limits

Run backend tests/typecheck, frontend typecheck/lint/build, traversal tests, and browser `test:web`, `test:forge`, and `test:summon`. Browser gates use mocked Auth/API responses and the real backend game domain. `backend verify:pdf` and `test:learning` use actual providers and temporary accounts.

The 2026-10-07 refactor passed all sixteen backend tests, backend/frontend typechecks, frontend lint/production build, traversal, and browser web/forge/summon gates. Mobile/desktop screenshots were inspected. An initial web run during editing timed out on card reveal; the final run with editing stopped passed. The build retains the existing large Phaser chunk warning. Direct API and Vite proxy checks both returned JSON 401 without a token. These are local regression results; they do not establish public deployment readiness.

On 2026-10-07, a live 1-page, 1129-byte synthetic PDF reached Gemini but `gemini-3.5-flash` returned HTTP 503 `UNAVAILABLE` after three attempts. The same live check with `gemini-3.8-flash` also returned 503; `gemini-2.5-flash` returned 404 during generation despite appearing in the model catalog. These checks demonstrate an external generation blocker, not successful PDF conversion or a defect proven for the user's original document. No provider was changed automatically.

The owner deferred further PDF/provider work on 2026-10-07 and intends to consider a local model later. A local adapter is not implemented or verified by this refactor; it must satisfy the same generation contract and validation gates before replacing Gemini.

The monolith is synchronous during PDF generation, forge tracking lasts only while the browser tab remains open, and completed battle history retains twenty attempts. Storage and Postgres have compensation rather than one distributed transaction; failed cleanup is logged and still needs an orphan cleanup process before production. Anonymous account recovery, abuse limits, deployment proof, real-document quality review, and security/operational gates remain outstanding. Local `backend/data/` files are preserved and are not imported automatically.
