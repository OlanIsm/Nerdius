# Nerdungeon — Stitch mobile UI

The five named screens in `docs/stitch/nerdungeon-educational-rpg-ui` are the
approved visual authority. Mode: Operate with an RPG game interface.

## Materials and palette
Warm parchment (#fff8f1, #fcedc9), timber (#6f4315, #5c3a21), gold (#ffba20),
and teal (#006a62). Preserve the supplied fantasy landscape, woodland map,
vault chest, equipment and pixel characters. Artwork provenance is recorded
in `frontend/assets/stitch/sources.json`.

## Type and controls
Rubik headings, Epilogue body, Space Grotesk labels, bundled with Expo fonts.
Wooden beveled buttons, inset parchment panels, compact resource badges,
four bottom navigation destinations. Navigation uses the supplied full-color
house, map scroll, treasure chest and backpack illustrations; resource badges
use the supplied coin, gem and XP artwork. Touch targets are at least 48 dp.

## Composition
Phone portrait first, scrollable content below a shared player HUD and above
fixed bottom navigation. Hub opens directly on the study forge and expeditions.
Map uses a 470 dp illustrated stage selector. Bazaar centers the original
chest and three relics. Armory shows the player, equipment grid and inspector.
Battle replaces navigation with Exit, HP bars, two original sprites and a
wood-framed three-option question.

The shared HUD follows the supplied game-status reference on every screen:
profile portrait on the left; level, player name, XP progress and rank in the
middle; then coin and gems in dark resource capsules. The shared header uses
the proportionally contained `frontend/assets/GUI/header.webp` frame, with its
compact profile and resources centered inside the wooden bounds.

Scrollable page content uses the blue patterned background artwork from
`frontend/assets/GUI/background.webp` instead of a flat application color.

Bottom navigation is icon-only at rest. The selected destination reveals a
rounded gold tile from below around its icon, animates its label into view and
gives the larger icon a contained pop in scale without crossing into page
content. The inactive destinations sit on the supplied four-slot wooden
`frontend/assets/GUI/navbar.webp` artwork, cropped proportionally rather than
stretched. The bar overlays scrolling content so the artwork's transparent
areas reveal the page beneath it.

The Study Forge uses `frontend/assets/GUI/scroll.webp` as its primary frame;
upload and action controls stay inside the parchment safe area.

Primary gold actions are resolution-independent layered gradients with a
subtle, periodic shine pass, heavy brown-gold labels and no leading icon.

## Implementation boundaries
Actual React Native primitives, no embedded HTML or WebView. Preview state
is local; backend rules and purchases are not implemented. Larger widths
center the portrait game frame. This release targets phones.


## September 2026: expedition, vault, and armory redesign

The supplied fantasy RPG references supersede the Stitch look for Expedition,
Region Detail, Bazaar, and Bag. Hub retains its existing blue background and
Study Forge parchment artwork. The illustrated region map remains intact.

These redesigned surfaces use charcoal timber (#211c19, #352b25), warm ivory
text (#f5e7c7), muted parchment (#cbb797), and brass edging (#967047, #dfb66d).
Framed briefing panels use inset borders and corner rivets. Primary actions
use a restrained brass bevel, an icon, and a diamond stud. Existing bundled
Rubik, Epilogue, and Space Grotesk fonts remain in use.

Expedition entries show region illustrations, source filenames, and segmented
chapter progress. The vault centers an isolated chest illustration above
summon actions, with relic previews and disclosed demo odds below. The armory
uses the MC artwork between equipment slots and a dark inventory tray rather
than scroll frames. Region briefing includes the selected region illustration,
readable objectives, encounter counts, and a Start Adventure action.

Verification: React Native Web captures at 320px and 520px; expedition-to-fight
navigation passed without browser page errors. Native rendering has not been
visually verified for this redesign.


### Warm fantasy correction
The user rejected the dark palette. Redesigned screens now use a repeating
map-paper background with a light cream wash, parchment panels, dark brown
text, honey-gold buttons, and olive equipment accents. Region briefing keeps
its approved composition. Hub shares the map-paper background, and its active
expeditions use the same card component and data as the Expedition list. Shared
RealmFrame and RealmButton components own the lighter palette.

## October 2026: Settings extension (React/Vite web)

Settings extends the existing parchment, sage, teal and honey-gold world. The player header opens a two-column bento: a wide character/name Profile tile, compact Preference and Account tiles, then a wide gold Plan tile. Preserve the existing bundled character and icons; no new raster artwork was introduced.

Use warm brown text and beveled borders, gently rounded tiles (16px), Rubik headings, Epilogue body text and Space Grotesk labels. Tiles have a short lift/press response. Keep the compact two-column arrangement on phones; below 370px, reduce tile padding and avatar size. Back buttons and form controls have 48px minimum height, visible focus states, and headings receive focus after section navigation.

Profile and preferences use concise parchment forms with explicit save/error feedback. Names persist in this browser; sound shares the existing Bazaar setting, and reduced motion respects both the saved preference and the OS. Account presents real authenticated identity with loading/error/retry states. Plan cards show Free Rp0, Traveler Rp35.000 and Master Rp80.000 per month, with disabled Coming soon actions for paid plans. No billing, benefits or entitlements are implied.

Keep navigation copy short: no expedition percentage indicators; upload guidance is PDF, DOCX · Max 25 MB. Finish review: **ship**, no material findings after inspection of mobile/desktop captures. This section records only this existing-world web extension; earlier platform metadata is outside its scope.
