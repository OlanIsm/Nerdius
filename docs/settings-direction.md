# Settings and concise game navigation

Scope: existing React/Vite web app. Operate mode. The current code and user screenshots are visual authority; older product metadata describing React Native is stale and is not being repaired as part of this change.

## Direction contract

THESIS: Put personal settings behind the player header. Let the chapter map communicate progress; remove percentage badges and flavor copy.

OWN-WORLD: Keep parchment, sage, timber edges, teal controls, honey gold, bundled type, and the existing character art.

STORY: Open Settings, choose Profile, Preference, Plan, or Account, then return to the previous screen. Names and preferences persist on the device; account identity comes from the API.

FIRST VIEWPORT: Back and Settings title above an asymmetric bento: wide avatar/name tile, two compact preference/account tiles, and a wide gold Plan tile. Show monthly plan prices on the Plan page without invented benefits or payment behavior.

FORM: User-pinned bento inside the established world; no concept seed or image comp is needed for this precise extension.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Confirmed prices per month: Free Rp0, Traveler Rp35.000, Master Rp80.000. Payment integration and paid entitlements are not present; paid plans must remain explicitly unavailable. Reuse existing assets; no new rasters.

## Built / Verification

Built in the React/Vite web app: the player header opens the four Settings tiles; Back returns to the previous screen. Profile names and preferences persist in this browser, sound shares the Bazaar preference, and reduced motion also follows the OS. Account reads authenticated `/api/me` with loading/error/retry states. Plans show the confirmed monthly prices; paid actions are disabled Coming soon, without billing, benefits or entitlements. Hub/expedition copy is shortened, percentage indicators removed, and upload guidance reads PDF, DOCX · Max 25 MB. Existing artwork is reused; no new rasters.

Finish reviewer disposition: **ship**, no material findings. Mobile/desktop Settings, Plans, Profile, Preference, Account, Hub and expedition captures were inspected. `test:settings`, `test:forge`, `test:summon`, `test:game`, `test:web`, 16 backend tests, frontend/backend typechecks, lint and build passed. Browser tests use mocked Auth/API with real backend game rules. This proves local behavior, not public deployment or paid subscriptions.
