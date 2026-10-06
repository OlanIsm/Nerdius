# Nerdungeon

Browser app with a mobile-sized layout. React + Vite renders Hub, Expedition, Bazaar, Bag, navigation, and battle controls. Phaser 3.90 renders the adventure world: the walk atlas, monsters, and eleven WebP parallax layers.

## Run

Use Node 24. Install dependencies once:

```sh
npm ci
npm --prefix frontend ci
npm --prefix backend ci
```

Start the API and web app together:

```sh
npm run dev
```

Open http://localhost:5173. Vite proxies /api to the Nerdungeon Express API on http://127.0.0.1:4000. Keep `PORT=4000` in backend/.env. Port 3000 may belong to another app; pointing the proxy there can return HTML instead of API JSON. To run services separately, use `npm run backend:dev` and `npm run frontend:dev`. Stop existing Nerdungeon dev processes before starting the combined command. Vite refuses a busy frontend port. Set VITE_API_URL in frontend/.env only when using another API origin. This is a web app; Expo Go and Android/iOS builds are no longer used.

## Local database

The app uses a local Supabase stack in Docker for Auth, Postgres, and Storage. Start Docker Desktop, then run:

```sh
npm run supabase:start
npm run supabase -- status --workdir backend -o env
```

Copy the local `API_URL` and `PUBLISHABLE_KEY` into `frontend/.env`. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `backend/.env` to the same local API URL and publishable key. Copy `SECRET_KEY` to `SUPABASE_SECRET_KEY` in `backend/.env` only. Keep secret keys out of the frontend and Git. The local config enables anonymous sign-in, and the existing game migration runs on startup.

Then run `npm run dev` and open http://localhost:5173. Stop the local Supabase stack with `npm run supabase:stop`; Docker keeps its database volume between stops. Local data is separate from the hosted Supabase project. PDF generation still needs `GEMINI_API_KEY` in `backend/.env`; the tutorial and parallax work without it.

## Game and data

Phaser loads when entering Battle and is destroyed on exit. Doors slide shut before game assets load, remain closed for at least 1.5 seconds, and reopen when the scene is ready. The game stays inactive until opening completes. Walking stops during encounters, pause, and hidden browser tabs. Canvas resizes with the app shell. Reduced motion disables walking animation and door motion while keeping the loading hold.

Express verifies answers, HP, rewards and progress. Supabase Auth creates one anonymous account per browser; Postgres and private Storage keep each account's data. Each account starts with one playable tutorial adventure, three regions with 10 questions each. PDF uploads up to 25 MB generate 1-3 regions with exactly 10 questions each through Gemini. DOCX still has starter chapters without generated questions.

Combat starts with 500 player HP and 100 enemy HP. Each correct answer deals 50 damage to the enemy; a wrong answer costs 50 player HP. A defeated enemy is replaced while questions remain. Finish all 10 questions with player HP above zero to win; zero HP loses. First-time chapter wins grant 450 gold and 100 XP. Saved answers make refresh/resume and identical retries safe. The tutorial upgrades for existing accounts; older PDF banks need a new upload before starting a new attempt.

Battle uses two rows: the upper Phaser scene and enemy HP, followed by player HP and the scrollable quiz. Quiz content never overlays the canvas. Forge loading can be minimized after three seconds; its status moves to Study scrolls while you navigate. Success or failure adds a red Hub badge, cleared when you open Hub or its ready adventure. Progress tracking requires the tab to stay open; this does not create a persistent background job.

## Verify

```sh
npm run typecheck
npm run lint
npm run build
npm run test:game
npm run test:web
npm run test:forge
npm --prefix backend test
npm --prefix backend run typecheck
npm --prefix backend run verify:pdf
npm run test:learning
```

Run the web app before test:web. Its browser test mocks API/Auth and checks combat win/defeat, HTML API errors, every React page, upload/summon, gate timing, Phaser animation, resize and engine cleanup. `verify:pdf` uses real Gemini/Supabase with two temporary accounts. `test:learning` needs both services and checks a real browser tutorial/PDF battle, network retry and account persistence. Live tests consume Gemini quota and clean up temporary users/files. Tests use installed Chrome; CHROME_PATH overrides it. APP_URL can target another frontend URL. Screenshots go into ignored test-results/.

Production output is frontend/dist. Configure the deployment to proxy /api to the backend or build with VITE_API_URL. Hashed assets support browser caching when the host sends suitable cache headers.

The old ignored `backend/data` stays on disk but is not imported into Supabase automatically.
