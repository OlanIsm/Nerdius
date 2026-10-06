# Nerdungeon API

Express 5 API for the Vite frontend. Game state and uploaded PDFs/DOCX files are stored per Supabase Auth user. New users start with one tutorial expedition; forged expeditions are added to that account.

## Backend structure

`src/app.ts` composes shared HTTP middleware and module routers; `src/server.ts` starts Express. `src/modules/account/` owns token verification and `/api/me`. `src/modules/game/` owns game routes, rules, summon data, PDF validation and state persistence. `src/platform/supabase.ts` creates Supabase clients; `src/platform/gemini.ts` calls Gemini. Keep new game behavior inside the game module and provider setup in `platform`; wire routes in `app.ts`.

1. Start Docker Desktop. From the repository root, run `npm run supabase:start`. This starts local Auth, Postgres, Storage, and Studio in Docker and applies `supabase/migrations/20260930000000_game_backend.sql`.
2. Run `npm run supabase -- status --workdir backend -o env` to get the local `API_URL`, `PUBLISHABLE_KEY`, and `SECRET_KEY`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `frontend/.env`. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the same local URL/key in `backend/.env`, and set `SUPABASE_SECRET_KEY` there. The local config enables anonymous sign-ins. Never put the secret key in the frontend.
3. Copy `.env.example` files if needed. `PORT=4000` is already set in `backend/.env.example`. Run `npm run dev` from the repository root; open http://localhost:5173. Stop the local database with `npm run supabase:stop`. Docker preserves its database volume between stops.
   For PDF question generation, put a Google AI Studio key in `GEMINI_API_KEY` in **backend/.env only**. This is optional for the tutorial and parallax. `GEMINI_MODEL` defaults to `gemini-3.5-flash`; restart the backend after changing environment variables.

API: `GET /api/me`, `GET /api/game`, `POST /api/game` (`start`, `restart`, `exit`, `answer`, `complete`, `summon`), `POST /api/game/forge` (one PDF or DOCX, 25 MB max). Every API request needs a Supabase access token in `Authorization: Bearer <token>`. Vite proxies `/api` to Express on port 4000. An unauthenticated request should return JSON 401, never an HTML web page. The frontend rejects non-JSON responses with a connection error.

PDF forge checks the PDF structure, rejects encrypted/corrupt or zero-page documents, and sends the PDF bytes to Gemini. It generates 1-3 chapters with summaries, topics, study material and exactly 10 multiple-choice questions per chapter. Backend validation checks exact question count, field sizes, unique questions/options, answer indices and physical source-page ranges before uploading the source PDF and saving state. Blank/unreadable documents and generation failures return an error without a new expedition. DOCX retains the existing starter-chapter behavior; Gemini processing currently covers PDF only.

Generated question banks stay in server-side game state. Snapshots expose chapter material and the next battle question without its answer. After submission, feedback exposes that question's correct option and explanation. Page references come from Gemini; range validation does not guarantee factual correctness, so review real PDFs before an MVP claim. Existing uploaded expeditions are not regenerated automatically; chapters without question banks (including current DOCX starter chapters) cannot start a quiz. Existing tutorial chapters receive the built-in question bank without resetting resources or progress.

## Verified battles

- `start`: send `expeditionId` and integer `chapter`. Locked chapters are rejected. Starting the same unfinished chapter resumes its battle ID and saved answers; starting a different chapter replaces the unfinished attempt.
- `restart`: send the current `battleId`, `expeditionId` and `chapter`. Creates a fresh attempt with full HP and no answers; preserves account resources, completed chapter progress and result history. Stale battle IDs are rejected.
- `exit`: send the current `battleId`. Removes the saved attempt and its answers; the next start begins at question 1 with full HP. Completed chapter progress, earned resources and result history stay intact. Repeating exit after removal is safe; an old ID cannot remove a newer battle.
- `answer`: send `battleId`, `questionId` and integer `selectedIndex`. The backend accepts only the next question and computes correctness. Repeating the same answer is safe; changing an accepted answer is rejected.
- `complete`: send `battleId` after answering every question or reaching zero player HP. Start with 500 player HP and 100 enemy HP; a correct answer deals 50 enemy damage, a wrong answer deals 50 player damage. Defeated enemies respawn with 100 HP while questions remain. Surviving every question wins; zero HP loses. The first passing completion of a chapter gives 450 gold and 100 XP. Each defeated monster adds 100 gold and 50 gems to pending loot. A winning completion banks this loot, including on replays; the 450 gold/100 XP chapter bonus is paid only on the first clear. Failed attempts pay nothing; exit/restart discard pending loot. Retrying completion cannot duplicate rewards.

Answers, the active battle and the latest 20 completed attempts persist in the account's `game_states` JSON. HP and enemy defeat counts are derived from accepted answers by the backend and included in the battle snapshot. Visual encounters end when an enemy dies or the chapter finishes. After acknowledging kill feedback, the hero walks for 5.5 seconds before the next enemy; the enemy HP bar is hidden during this walk. Coin/gem assets burst from the defeated enemy, land with colored trails, then move to the walking hero. The final kill has a collection walk before completion. Snapshot pendingGold/pendingGems reflect unclaimed loot; goldReward includes the chapter bonus plus monster gold, and gemsReward records banked gems. Older results without gemsReward display zero gems. Phaser cannot grant rewards. Longer audit history will need a separate result table. Existing tutorial banks expand to 10 while preserving accepted answers and resource/progress values. Older PDF banks may finish an active attempt, but new attempts require uploading the PDF again.

Generation is synchronous with one 90-second timeout shared across all attempts. A Gemini HTTP 503 triggers up to two retries (three attempts total), with increasing delays and jitter. Quota/configuration/invalid-PDF errors are not retried. Persistent overload returns an error without saving an expedition or source file. If large PDFs regularly exceed the timeout, move processing into a background job. On Windows PowerShell, use `npm.cmd` if `npm.ps1` is blocked.

HTTP 503 alone does not prove a PDF exceeded the context window. Explicit input/context/payload-limit errors return a distinct 422 message asking for smaller PDFs. Diagnostics record model, byte/page counts, provider status, elapsed time and token counts when available; they do not log keys, document text or generated answers. The upload UI can minimize after three seconds and keeps tracking during navigation, with a Hub badge for completion/failure. Tracking is browser memory; reloading/closing the tab loses its pending UI, and the backend has no durable job queue.

## Verification

| Command from repository root | Checks |
| --- | --- |
| `npm --prefix backend test` | Battle ordering, scores, failed attempts, reward retries, locked chapters, PDF validation and summons. |
| `npm --prefix backend run typecheck` / `npm run typecheck` / `npm run lint` / `npm run build` | Backend/frontend types, frontend lint and production build. |
| `npm run test:web` | Mocked browser regression: auth session, upload, summon, quiz, Phaser traversal, resize, gate loading, reduced motion and asset retry. Requires frontend dev server. |
| `npm run test:forge` | Delayed mock forge: three-second minimize threshold, Study scrolls status, navigation without interruption, ready/failure Hub badges, acknowledgement, retry and mobile/desktop. Requires frontend dev server. |
| `npm --prefix backend run verify:pdf` | Live Gemini/Supabase: two accounts, PDF/Storage, ordered battle, saved results, concurrent retries, token refresh, invalid uploads and denied cross-account access. |
| `npm run test:learning` | Live browser: tutorial, wrong-answer feedback, answer retry after an injected 503, resume after reload, real PDF generation, battle rewards and session persistence on mobile/desktop. Requires frontend and backend dev servers. |

Live checks use local environment keys, Gemini quota and temporary anonymous accounts; they remove their test users/files in `finally`. The browser check uses installed Chrome on Windows by default; set `CHROME_PATH` to override. Synthetic PDFs demonstrate the integration, not the quality of arbitrary textbooks. Screenshots are saved under ignored `test-results/`. No deployment is performed by these commands.
