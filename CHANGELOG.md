# dialed — Change Notes

Specialty coffee dialling-in tracker · Single-file PWA / Android APK

---

## v1.0 — Initial Build
*Session started 8 March 2026*

### Core app
- Single self-contained HTML/CSS/JS file, no framework dependencies
- localStorage persistence (`dialin_v2` key)
- 5-tab navigation: Overview, Coffees, Recipes, Grinders, Compare
- Floating action button (FAB) for quick actions
- Google Fonts: Playfair Display, DM Mono, DM Sans
- Grain texture overlay, espresso/crema colour palette

### Coffee Library
- Add coffees with: name, roaster, country, region, varietal, process (Washed / Natural / Honey / Anaerobic / Wet Hulled / Other), roast level, roast date, tasting notes, altitude (masl)
- Coffee detail view with all origin metadata
- Brew log linked per coffee

### Brew Log
- Log brews with: coffee selector, grinder selector, brew method, grind setting, dose (g), water/yield (ml/g), time (sec), water temp (°C), extraction result (under/good/over), rating (1–5), tasting notes
- Yield vs Water label swaps automatically based on method (espresso = yield, all others = water)
- Brew methods: Espresso, V60, AeroPress, Chemex, Moka Pot, Cold Brew, French Press, Steep & Release, Other

### Grinder Database
- 58 grinders: 28 manual (m01–m28), 30 electric (e01–e30)
- Each entry: brand, model, type, settings, min/max µm range, notes
- Browse, search, set favourite grinder
- Favourite grinder shown on Overview dashboard
- Favourite pre-selected in Log Brew grinder selector

### Grinder Compare
- Select up to 5 grinders via ⊕ button
- Floating compare bar
- Side-by-side range bars (colour-coded), brew method compatibility matrix, spec cards

---

## v1.1
*Session 8 March 2026 (continued)*

### Recipes
- Added recipe database (RECIPES object) with built-in recipes per brew method
- Recipe dropdown in Log Brew modal (non-espresso methods only)
- Auto-fills dose, water, temp when recipe selected
- Step-by-step recipe card shown inline in Log Brew modal
- Built-in recipes:
  - **V60**: James Hoffmann Ultimate, Simple 1-Cup
  - **AeroPress**: James Hoffmann Ultimate, Classic Inverted
  - **Chemex**: Classic, Hoffmann-style
  - **French Press**: James Hoffmann Ultimate, Classic
  - **Moka Pot**: Classic, Hoffmann-style
  - **Cold Brew**: Classic Concentrate
  - **Steep & Release**: James Hoffmann Clever Dripper, Classic
- Recipe badge shown on saved brew log entries

### Custom Recipes
- New **My Recipes** tab
- Create recipes with: name, author, brew method, dose, water, temp, grind hint, unlimited steps
- Edit and delete custom recipes
- Custom recipes appear in Log Brew dropdown (marked with ★)
- Custom recipes accessible from FAB menu

---

## v1.2
*Session 8 March 2026 (continued)*

### Bag Label Photos
- Camera/gallery photo capture in Add Coffee form
- Label photo shown as thumbnail on coffee library cards
- Portrait thumbnail in coffee detail hero
- 48×48px thumbnail on all brew log cards (Recent Brews + Brew Log tab)

---

## v1.3
*Session 8 March 2026 (continued)*

### Icon & Branding
- Replaced ☕ emoji header logo with custom tea cup SVG (Streamline Feather)
- SVG coloured in crema accent colour

---

## v1.4
*Session 8 March 2026 (continued)*

### Appearance Settings (later removed)
- In-app settings panel (gear icon → slide-in drawer)
- 18 colour palette options across 4 moods: Warm & earthy, Cool & fresh, Dark/moody, Light/airy
- Display font picker (5 options: Playfair Display, Lora, Fraunces, Josefin Sans, Inter)
- Mono/UI font picker (4 options: DM Mono, Space Mono, Inter, Space Grotesk)
- Settings persisted to localStorage

---

## v1.5
*Session 8 March 2026 (continued)*

### Branding & Defaults
- App renamed from "Dial In" to **dialed** (all lowercase)
- Default palette changed to **Terracotta**
- Default font changed to **Inter** (both display and mono)
- Appearance settings panel removed (simplified to dark mode toggle only)
- **Dark mode** added: 🌙/☀ toggle button in header
  - Full dark mode CSS override system using `body.dark-mode` class
  - Deep near-black palette (`#111111` bg, `#1e1e1e` surfaces)
  - Preference saved to localStorage

---

## v1.6
*Session 8 March 2026 (continued)*

### Icons & Dark Mode
- Dark/light mode toggle icons replaced with custom SVGs (Streamline Feather moon, Streamline Mynaui sun)
- Brew log rating icons replaced with cup SVG (replacing ☕ emoji)
  - Rating buttons in Log Brew modal now use cup SVG
  - Rating display on brew cards uses small cup SVGs
- **Coffee rating out of 10** added to Add Coffee form
  - 10-cup icon rating row
  - Word descriptor label (e.g. "8/10 — Very good")
  - Rating shown on coffee library cards and detail hero

---

## v1.7
*Session 9 March 2026*

### PWA / APK Packaging
- Added `<link rel="manifest">` and PWA meta tags to HTML
- Created `manifest.json` with name, theme colour, display mode
- Generated 4 icon files:
  - `icon-any-192.png` — rounded square, 192×192
  - `icon-any-512.png` — rounded square, 512×512
  - `icon-maskable-192.png` — full-bleed, 192×192
  - `icon-maskable-512.png` — full-bleed, 512×512
- Icons use deep espresso background with cup illustration in crema accent
- Hosted on GitHub Pages: `https://richardbjkelly.github.io/dialed/`
- APK generated via PWABuilder

---

## v1.8
*Session 9 March 2026 (continued)*

### Grind Range Improvements
- Grinder cards and detail view now show **click range** (e.g. 0–18 clicks) where known, alongside µm range
- Added µm/click data for Timemore Sculptor 078S: ~25µm/click, 0–18 click range
  - Espresso: clicks 0–6 · V60/Pourover: clicks 7–12 · French Press: 14+
- Added µm/click data for Timemore Sculptor 078 (Turbo): ~25µm/click, 0–18 click range
  - Filter only — V60: clicks 7–12 · French Press: 12+
- Detail view shows dedicated µm/click spec block

### Navigation & UX
- **Default grinder pinned to top** of grinder library list
- **Android back gesture**: hardware back button intercepted via History API
  - Back from any tab → Overview
  - Double-back on Overview → "Press back again to exit" toast
  - Back closes open modals first
- **Time-of-day greeting** on Overview subtitle:
  - Before 5am: "burning the midnight oil ☽"
  - 5–9am: "good morning ☀"
  - 9–12pm: "morning brew time ☕"
  - 12–2pm: "midday refuel ☕"
  - 2–5pm: "afternoon pick-me-up ☕"
  - 5–8pm: "evening cup ☕"
  - After 8pm: "winding down ☽"

### Coffee Library
- **Finished bag** feature: mark a coffee as finished from its detail view
  - Greyed out (opacity + grayscale filter) in coffee library
  - FINISHED pill shown on card
  - Excluded from brew log coffee selector
  - Brew history fully retained
  - Toggle back to active at any time

### Grinder Compare
- **Compare tab removed** from navigation
- Comparison integrated inline into Grinders tab
  - Floating compare bar "Compare" button expands an inline panel above the grinder list
  - Panel shows range bars and compatibility matrix
  - "✕ Close" to collapse

### Recipes
- **Brew log moved to Overview** (Recent Brews section, last 10 shown)
  - "View all (n) →" link jumps to full Brew Log tab
- **Recipes tab** renamed to "Brew Recipes" (later "Recipes") — now shows recipe library
- Two-panel layout: **Built-in** / **My Recipes** sub-tabs
- **Method filter bar** (All, Pourover, AeroPress, etc.) in Built-in panel
- **Expanded V60 / Pourover recipes** (12 total, from Harmony Coffee guide):
  - James Hoffmann Ultimate V60
  - Carly Green (Q-Grader, Cherry Love)
  - Junchao Huang (UK Brewers Cup, Calico Coffee)
  - Alexa Elizabeth Lee (UK Cup Tasters Champion 2024, Orea)
  - Natdanai Denham (3rd English AeroPress 2023, Jan Lek)
  - Ted Longden (3rd UK Barista 2023, WatchHouse) — Clever Dripper All-In
  - Alan Jarrar (Jokes Aside Coffee) — Kalita 185
  - Sharon Ip (2nd English AeroPress 2024, TABxTAB) — FLO/Orea
  - Cleo Tsai (Canadian Brewers Cup Finalist 2024)
  - Gage Quinn (Northern Filter Champion 2023) — Orea V3
  - Kish (Team Harmony) — 5-Pour V60
  - Ben (Team Harmony, Head of Coffee) — Orea V4 Fast
- **Expanded AeroPress recipes** (10 total, from WAC + aeroprecipe.com):
  - James Hoffmann Ultimate AeroPress
  - Némo Pop — WAC Champion 2025
  - George Stanica — WAC 1st 2024
  - Sophan Nugraha — WAC 2nd 2024
  - Jibbi Little — WAC Champion 2022
  - Tuomas Merikanto — WAC Champion 2021
  - Natdanai Denham — 3rd English AeroPress 2023
  - Sharon Ip — 2nd English AeroPress 2024
  - Classic Inverted
  - Tim Wendelboe — Filter Style
- V60/Pourover recipes include: pours count, bloom ratio, target total time (shown in dropdown card)
- **⧉ Duplicate & Edit**: any built-in recipe can be duplicated to My Recipes for customisation
- Built-in recipes are read-only (no edit button)

### Backup / Restore
- **Export Backup** button at bottom of Overview: downloads dated JSON file (`dialed-backup-YYYY-MM-DD.json`)
- **Import Backup** button: reads JSON file, restores all coffees, brews, custom recipes and settings

### Bug Fixes
- Coffee detail back button now works correctly (restores full library view)
- Coffee detail text contrast improved (roaster, date, tasting notes)

---

## v1.9
*Session 9 March 2026 (continued)*

### Recipes
- V60 renamed to **Pourover** throughout (method selector, filter bar, grinder compatibility matrix, custom recipe dropdown)
- Built-in recipe names retain "V60" in title where accurate (e.g. "Ultimate V60")

---

## v2.0
*Session 9 March 2026 (continued)*

### Coffee Library Overhaul
- **New fields** added to Add/Edit Coffee form:
  - Producer (person who grew/processed the coffee)
  - Farm name
  - Roaster City
  - Roaster Country
- **Edit Coffee**: ✏ Edit button in coffee detail view opens pre-filled modal
  - All fields editable including photo and rating
  - Saves back to existing coffee record, returns to detail view
- **Custom process entry**: Process dropdown now includes:
  - Carbonic Maceration
  - Extended Fermentation
  - "Other…" → reveals free-text input for any custom process
- Producer, farm, and roaster location shown in coffee detail hero with icons

### UI / Contrast Fixes
- Form labels: use `var(--text)` at 75% opacity (was `var(--text-muted)`)
- Meta pills: stronger border and text colour
- Coffee card roaster name: improved contrast
- Recipe count on cards: improved contrast
- Custom recipe step text in My Recipes: full text colour (was muted)
- Custom recipe card header subtitle: improved opacity

### App Icon
- Header icon reduced from 32px to 24px (was appearing too large/zoomed)

---

## v2.1
*Session 9 March 2026 (continued)*

### Design System
- **Fonts changed**:
  - Headers / titles: **Space Grotesk** (app title, modal titles, section titles, coffee names, recipe titles, grinder names)
  - Body / labels / UI: **Space Mono** (all other text, metadata, stats, form inputs, brew log)
- **Colour palette replaced** with forest green scheme:
  - `#123C27` — deep forest green (header, nav bar, hero backgrounds, primary buttons)
  - `#FAFAF7` — warm off-white (page background)
  - `#FFFFFF` — pure white (cards, modals)
  - `#52796F` — sage green (accent, active states, meta pills, muted text)
  - `#E5E7EB` — light grey (borders)
- **Dark mode** updated to deep forest green scheme:
  - `#0a1f14` background
  - `#112b1c` surfaces
  - `#163624` cards
  - `#7aaa96` muted text
- Inline badge colours (grinder, recipe) updated to complement new palette
- Extraction tag colours updated to green palette

---

## v2.2 – v2.5
*Session 30 September 2026*

### Features
- Long-press on coffees and brews for Edit / Trends / Delete overlay
- Brew editing; brew rating now out of 10; mins:secs brew time for non-espresso methods
- Combined trend chart per coffee (taste score area line, extraction-coloured points, temp °C and grind values, brew time sub-chart), opened via 📈 Trends
- Coffee stats on Overview with period filter (year / 6m / 3m / month / all) and single stacked bar per category
- Overview category picker in Settings (origin, process, roaster, roaster country, varietal, roast level)
- Tracker tab: full brew list with coffee / method / result filters and sorting
- Settings panel (Recipes, Grinders, dark mode, overview options, backup/restore)
- Bottom navigation with outline icons; centred header
- Decaf checkbox on coffees
- Label photo lightbox (tap any label photo)
- Confirm-delete dialog for brews and custom recipes; inline ✕ removed from brew cards

### Fixes
- New brews overwriting previous brews (stale edit ID)
- Editing always opening the same coffee
- Recipe selection not autofilling dose / water / temp
- Long-press Cancel re-opening the coffee (tap loop)
- Dark mode toggle not applying; white panels and invisible text in dark mode
- New Recipe button invisible in light mode
- Full debug run: three script errors that stopped the whole app responding (escaped template literals in stats, leftover backup reference on Overview, undefined variables in coffee detail) — verified in a headless browser with real taps

---

## v2.6
*30 September 2026*

### Fixes
- Coffee cards were nested inside each other (missing closing tag), causing: every coffee opening the first one, the long-press menu appearing on the wrong card, and the Cancel loop that blocked Settings and Log Brew
- Long-press now cancels when you scroll, and lifting your finger no longer triggers whatever sits under it
- "New Custom Recipe" in the + menu was white-on-white
- Dark mode toggle in Settings was nearly invisible in light mode
- Tested on an emulated Android phone with real touch input

---

## v2.7
*30 September 2026*

### Fixes
- App crashed on launch whenever it had saved data (Overview drew before settings existed), hiding stats and breaking taps
- Saved settings (dark mode, fonts) never loaded on launch
- Dark mode: base palette now swaps, so no panels stay white (e.g. Overview Stats in Settings)
- Older coffees without a creation date now count in stats (via first brew date; always in All Time)

### Deployment
- Changes now pushed straight to GitHub (richardbjkelly/dialed) instead of copy/paste

---

## v2.8
*30 September 2026*

### Features
- Coffee price, currency (15 options) and bag weight; converted to £ at the day's ECB rate and shown as £/100g
- Avg price per 100g and total spent on Insights

### Fixes
- Decaf checkbox stayed ticked for a new coffee
- Pills on dark headers unreadable

---

## v2.9
*30 September 2026*

### Features
- Brew timer in Log Brew: fills the time on Stop, accurate through screen lock, keeps screen awake
- Plan next brew after logging: grind finer/coarser and hotter/cooler pre-selected from the extraction result, with steppers
- Up next list on Overview with Brew now (pre-fills Log Brew); Plan next on any brew's menu

### Fixes
- Editing a brew didn't highlight its coffee, grinder, method or result
- Toasts moved to the top so they don't cover open sheets

---

## v3.0
*30 September 2026*

### Data protection
- Label photos compressed on upload (~4MB → ~150KB) and stored in IndexedDB instead of the ~5MB localStorage; existing photos migrated automatically
- Save failures show a clear warning instead of failing silently
- Monthly backup reminder; storage use and last backup date in Settings

### Offline
- Service worker: app opens and works without signal; updates show on the next open

### Dialling in
- Grams left per bag, low/empty warnings, prompt to mark finished
- Cost per cup (on brews, coffee page, and live while logging)
- Days off roast on brews and coffees; taste-by-roast-age chart in Trends
- Brew ratio as 1:x, live in Log Brew
- Best brew per coffee with one-tap Repeat
- Guided recipe steps on the timer (current step, countdown, buzz on change)
- Optional taste profile sliders (sweetness, acidity, body, bitterness)

### UI
- Visible ⋯ button on coffee and brew cards
- Stats moved to a new Insights tab (was Tracker); Overview shows Up next + 5 recent brews
- Only Space Grotesk and Space Mono loaded, applied from the stylesheet

### Fixes
- Picking a recipe in Log Brew threw an error

---

## v3.1
*30 September 2026*

### Grind ↔ microns
- Every grind setting converted to approximate particle size (µm) using the grinder database, so grinds compare across grinders
- Live readout under Grind in Log Brew, with a warning when outside the method's usual range
- µm shown on brew cards and in Plan next; saved with each new brew for future use
- Grinder page: setting → µm converter, same grind on your default grinder, and a "where to start" table per method

### Starting-point suggestions (on-device)
- Log Brew suggests grind (as a setting on your grinder), temperature, ratio and a recipe, with Apply and a "Why?" breakdown
- General guidance from method, roast level, altitude, process, decaf and roast age
- Learns from your own good brews: shifts toward how you actually brew, weighting similar coffees more
- Uses your best brew when a coffee is already dialled in; hidden when editing or brewing from Up next
- Nothing leaves the phone

### Fixes
- Sculptor 078S/078 data corrected: about 55µm/50µm per dial number (not 25µm/click); guidance now matches published figures (078S espresso ≈0–2.6, pourover ≈3–8.3); decimal settings supported
- Micron units no longer render as "MM" in capitalised labels

---

## v3.2
*30 September 2026*

### Stepless grinders
- 17 grinders marked stepless: Timemore Sculptor 064S/078/078S, Niche Zero/Duo, DF64 Gen 2, Eureka Mignon (3), Mahlkönig E65S, Lelit William, Rocket Faustino, Compak K3, Kinu M47 (2), Lido ET, OE Lido 3
- Labelled "stepless" / "stepless dial 0–18" instead of "clicks"; µm per number/click shown for every grinder
- Suggestions and conversions give fine positions (e.g. 4.8) on stepless grinders, whole clicks on stepped ones
- Plan next nudges by ~20µm (filter) or ~6µm (espresso) on stepless grinders, one click on stepped ones, with the step shown
- Settings outside a grinder's range are flagged instead of converted

### Fixes
- Micron units no longer capitalised to "ΜM" anywhere

---

## v3.3
*30 September 2026*

### Transitions (low-risk set)
- Tabs fade in when switching (~0.16s), only on navigation, not when a screen refreshes
- Coffee detail slides in from the right and back out to the left (~0.22s)
- Sheets slide down and the backdrop fades when closing (~0.22s); a closing sheet never blocks taps, and a timer guarantees it always finishes
- Android's "Remove animations" setting turns all motion off

### Fixes
- Tapping the Coffees tab from a coffee's detail page did nothing
- App no longer re-saves all data on every launch (only after migrating old photos)

### Held for later
- Press feedback on cards/buttons, charts drawing in, + button rotation, timer step pulse

---

## v3.4
*30 September 2026*

### Suggestions respect recipes
- Recipes are fixed: suggestions never change dose, water, ratio, steps or step timings
- A recipe you've chosen is always kept (previously Apply could swap it for one from your history)
- Only grind and water temperature are tuned; temperature starts from the recipe's own value and shifts for the coffee (e.g. +2°C light roast, capped at 100°C)
- A recipe is only proposed when none is chosen, and is then used as written
- Suggestion updates when you change recipe

### UI
- Settings icons (Recipes, Grinders, Export, Import) are now outline icons matching the bottom bar

---

## v3.5
*30 September 2026*

### Settings
- New Brewing section with a **Suggested Start** switch; turning it off hides the suggestion card in Log Brew (saved between sessions, on by default)

### Recipe autofill
- Dose and Water (ml) fill in from the recipe whenever one is picked, and when Log Brew opens with a remembered recipe
- Both stay editable; switching method tab only replaces values you haven't changed yourself
- Choosing "No recipe / custom" clears the recipe values

---

## v3.6
*30 September 2026*

### New app icon
- White coffee cup on dialed green, cropped by the tile edge, handle on the right
- Maskable (Android) version scaled into the safe zone so the handle survives circle/squircle masks
- Added apple-touch-icon (180px) and a browser-tab favicon
- Service worker cache bumped to `dialed-v2` so the new icons are picked up

---

## v3.7
*30 September 2026*

### Header
- Title and subtitle left-aligned; small cup line icon removed
- The app-icon cup now bleeds off the right edge of the banner (decorative, ignored by screen readers)
- Subtitle shortened to "Coffee Tracker"; dark-mode button sits left of the cup

---

## v3.8
*30 September 2026*

### Settings
- New **Show Costs** switch under Brewing (on by default, saved between sessions)
- Off hides every cost figure: bag price, £/100g tags, cost per brew/cup, average cost per cup, and the Avg Price / Spent cards on Insights
- Price and currency can still be entered on a coffee while costs are hidden, so nothing is lost

---

## v3.9
*30 September 2026*

### Delete coffees
- ✕ Delete added to the ⋯ menu on each coffee card, and a Delete coffee button at the bottom of a coffee's page
- Confirmation names the coffee and how many brews go with it; deleting also removes its brews, planned brews and label photo
- Delete confirmation title now matches what's being deleted (coffee, brew or recipe)

---

## v3.10
*30 September 2026*

### Dark mode fix
- Under / Good / Over now fill with blue / green / red when selected in dark mode (a dark-mode override was hiding the selected colour)

---

## v3.11
*30 September 2026*

### Plan next
- Grind − / + arrows replaced with a slider: 0.1 steps on stepless grinders, the grinder's own click size on stepped ones
- Slider covers roughly ±150µm around the last setting (at least ±10 steps), kept inside the grinder's range; shows µm and the step size
- Temperature slider from 80 to 100°C in 1°C steps; can now set a temperature even when the last brew had none (hidden for Cold Brew)
- Finer / Same / Coarser and Cooler / Same / Hotter chips still work as one-step shortcuts

### Up next
- Drag the ⠿ handle to reorder planned brews (arrow keys also work on a focused handle)
- New plans join the end of the queue; re-planning the same coffee + method keeps its place

---

## v3.12
*30 September 2026*

### Dark mode contrast
- Muted green text lightened (#7aaa96 → #9EC4B3) and the accent green used for text (titles, dividers, active tab, grinder tags, labels) lightened to #9FCCBF
- Contrast on dark cards goes from about 4.4–5:1 (as low as 2.4:1 for the old accent green) to 6–7.5:1
- Under / Good / Over result tags given lighter blue / green / red in dark mode so they read on dark cards
- Light mode unchanged

---

## v3.13
*30 September 2026*

### Coffee Library layout
- Grid tiles show country, process, roast level and varietal first, then a "+N" tag for the rest (altitude, £/100g, grams left, days off roast); list view still shows every tag
- Grid tiles: several varietals collapse to the first plus a count ("Castillo, Colombia, Caturra" → "Castillo +2"); any other tag too long for the tile ends in "…"; tiles no longer clip tags
- Small list / grid switch on the right of the Coffee Library subtitle
- Grid shows two coffees per row with compact tiles (smaller type, up to three rows of tags); list is the original full-width tiles
- Choice is remembered, including after opening a coffee and coming back

---

## v3.14
*30 September 2026*

### Text size
- Settings › Appearance › Text Size: Small (90%), Default, Large (115%), Extra large (130%)
- Scales text, buttons and spacing together; saved between sessions
- Full-height sheets, the Settings panel and photo viewer still fit the screen at every size
- Extra large shows one coffee per row even in grid view
- Drag-to-reorder in Up next corrected for the scaling

### Coffee Library
- Grid tiles are all the same size: equal height across the library, fixed header area (name up to 2 lines, roaster on 1 line with "…"), brew count and DECAF pinned to the bottom
- Decaf coffees show a small DECAF label at the bottom right of the tile (grid and list)

---

## v3.15
*30 September 2026*

### Coffee Library order
- Coffees sorted by most recently brewed first
- Coffees with no brews yet come next (newest added first); finished bags sit at the bottom

---

## v3.16
*30 September 2026*

### Insights bars
- New "Roastery" palette replaces the greens: terracotta, slate blue, ochre, plum, sky, rose, violet; neutral grey for Other
- Validated for colour-blind separation and lightness in both modes; dark mode uses its own steps and redraws when toggled
- 2px gaps between segments
- Fix: charts silently dropped everything past the top 5 (so shares were wrong). Now up to 7 named segments; beyond that, top 6 plus a grey "Other · N more" covering the rest

---

## v3.17
*30 September 2026*

### Insights grouping (for when charts get busy)
- Switches on automatically when a chart has more than 7 categories; charts with 7 or fewer are unchanged
- Origin country and roaster country → region (Africa, Middle East, Central America, Caribbean, South America, Asia, Oceania, plus Europe / North America for roasters)
- Process → family (Washed, Natural, Honey & pulped natural, Wet-hulled, Experimental, Decaf process)
- Roast level → Light / Medium / Dark
- A note under the chart title says what's grouped; tap any group (or "Other") to see what's inside with counts
- Unrecognised values go to a grey "Other regions / process / roast" at the end; roasters and varietals keep top 6 + Other

---

## v3.18
*30 September 2026*

### Quick fixes
- FINISHED badge now readable in both modes: finished tiles fade their parts individually instead of the whole card, so the badge stays at full strength
- "+ Add Coffee" button always shows in the Coffee Library (previously only after returning from a coffee's page)
- Insights colours follow the entry, not its rank: each value keeps its all-time colour when you switch period (e.g. Ethiopia stays blue in This year even if it's the top origin)

---

## v3.19
*30 September 2026*

### Transitions (the held-back set)
- Press feedback: buttons, chips, tabs and tiles shrink slightly while pressed; nav icons dip; Settings rows tint
- + button rotates into × while its menu is open, and back when it closes (all five ways of closing checked)
- Insights bars sweep in from the left; trend and days-off-roast lines draw in, with dots and shading fading in after
- Brew timer: the step guide pulses when it moves to the next step (alongside the existing vibration), once per step
- All of it is switched off when the phone's Reduce Motion setting is on
- Tested: 44 checks with motion on and 44 with Reduce Motion, plus every earlier test suite

### Insights
- Bars slightly thinner (16px → 12px)

---

## v3.20
*30 September 2026*

### Finish bag
- New Finish bag sheet asks for final ratings: overall rating out of 10 (pre-filled if already rated), "Would you buy it again?" Yes / Maybe / No, and optional final notes; shows brews logged, how many were dialled in and the best brew
- Reach it from: Log Brew ("Last brew from this bag — finish it after saving"; opens instead of Plan next), the ⋯ menu on library tiles (✓ Finish / ↺ Reopen), the Finish bag button on the coffee's page, and the empty-bag prompt
- Finished coffee pages show date finished, final rating, buy-again and notes; the grams-left gauge is replaced by grams used
- Reopening is immediate and keeps the ratings; "Not now" leaves the bag active

---

## v3.21
*30 September 2026*

### Fix
- ⋯ on a brew in a coffee's Brew Log did nothing: the same brew is also drawn (hidden) on Overview and Insights, and the menu opened on the hidden copy. Menus now open on the copy you can see; checked from all three screens, including Edit, Plan next and Delete

---

## v3.22
*30 September 2026*

### Coffee rating
- Cup icons replaced with plain text: "8/10" on library tiles, "Rating 8/10" on the coffee's page

---

## v3.23
*30 September 2026*

### Coffee Library grid: photo-banner tiles
- Grid tiles redesigned: the label photo runs across the top (patterned placeholder with the coffee's initial when there's no photo)
- Rating (8/10), DECAF and FINISHED sit as badges on the photo; ⋯ menu in the photo's corner
- Below: name (up to 2 lines), roaster (1 line), a one-line origin summary (country · process · roast) and brew count
- Every tile is the same height, including at Extra large text; long values end in "…"
- List view keeps the full-width tiles with every tag

---

## Pending / Roadmap
- Rebuild the APK once to pick up the new cup icon
- Opt-in pooled data + trained model (see feasibility notes): backend, consent, deletion, ICO registration
- Google Drive sync (deferred — manual backup/restore and reminder in place)
- Screenshot showcase for PWABuilder
- Play Store listing

---

*Document maintained automatically. Last updated: v3.23*
