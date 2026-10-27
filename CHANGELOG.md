# dialed — Change Notes

Specialty coffee dialling-in tracker · PWA (index.html + css/ + js/) / Android APK

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

## v3.24
*30 September 2026*

### Grid tiles: frosted glass
- The photo now fills the whole tile; name, roaster, summary and brews sit on a blurred dark-green glass panel over the lower part
- Rating and DECAF badges moved to the top of the photo; photos are framed slightly towards the top, where most labels put the name
- Same look in light and dark mode; phones without blur support get a solid panel instead

---

## v3.25
*30 September 2026*

### Log Brew rating
- The row of ten cup buttons is now a 0–10 slider, starting at "Not rated"
- Live label shows the choice, e.g. "8/10 · Great"; slide back to the start to clear
- Editing a brew shows its saved rating; each new brew starts unrated
- Value and description are stacked in a fixed-width column (e.g. "10/10" over "Outstanding"), so the slider stays the same length at every value and text size

---

## v3.26
*30 September 2026*

### Taste profile
- Each slider's number is now a small chip: once set it shows the value with a ×; tap it to clear that one slider
- A "Clear all" link appears beside the Taste profile heading whenever any slider is set
- Cleared sliders aren't saved; editing a brew lets you clear values it already had

---

## v3.27
*1 October 2026*

### Brew log cards
- Clearer text hierarchy below the Grind / Dose / Time boxes: date and days off roast small and quiet; recipe numbers (water, ratio, temperature, cost) in full-strength text with units and separators dimmed
- Taste scores in one segmented bubble — number on top, short label below (Sweet / Acid / Body / Bitter), with roomy cells; only the scores you set are shown
- Rating on the right as 9/10; notes in larger text with a terracotta opening quote
- DECAF badge next to the result tag for decaf coffees
- Same look on Overview, Insights and each coffee's Brew Log, in light and dark mode and at every text size

---

## v3.28
*1 October 2026*

### Log Brew: last & best brew
- When the selected coffee has brews, Log Brew shows a one-line summary of your last brew that opens into Last and Best side by side (best highlighted)
- Each side shows the date, Over / Good / Under, the recipe and method used (e.g. "Hoffmann · Ultimate AeroPress"), grind with grinder, dose → water, temperature, time and rating
- "Use" on either side fills the form with that brew's coffee, method, recipe, grinder, grind, dose, water and temperature, keeping a running timer and any notes
- Follows the coffee you pick and updates as soon as you switch; one brew shows a single "Last & best" card; unrated brews show "Last" only
- Collapsing it is remembered; hidden while editing a brew
- Even 20px spacing above and below the panel, with or without a recipe card above it
- Replaces Suggested Start for coffees you've already brewed (Suggested Start still covers new coffees)

---

## v3.29
*1 October 2026*

Fixes from the full audit (32 issues found; see the status list in the session report).

### Your data is safer
- Damaged or unexpected saved data no longer breaks the app: it is checked on load, a copy of anything unreadable is kept and can be exported, and nothing is overwritten until you choose
- Import Backup checks the file first, asks before replacing your data, and offers Undo afterwards
- Backups now include your settings; "Photos in Backups" switch for smaller files; on iPhone Home Screen the share sheet is used
- Editing a brew of a finished coffee keeps it on that coffee (it used to move to another one)
- The app asks the browser to keep its storage, and Settings shows whether that was granted
- A warning appears if a label photo couldn't be saved

### Security
- All text you type or import (names, notes, recipes) is always shown as text and can never run as code
- Imported values and ids are validated; duplicate or unsafe ids are regenerated
- Content policy added: scripts, fonts and images only load from the app itself
- Fonts are now served by the app instead of Google Fonts; exchange rates are only looked up when you enter a price in another currency
- Privacy note and app version in Settings › About

### Behaviour
- Deleting a brew refreshes the page you're on straight away
- Brew timer keeps running when the sheet is closed, with a pill to return to it; screen wake-lock is released after 15 minutes
- Phone back button closes Settings; double-tapping Save no longer creates two entries
- Out-of-range entries (negative dose, 500°C, 99 seconds…) are rejected with a message
- "colombia", "Colombia " and "COLOMBIA" count as one category; existing spellings are suggested as you type
- Insights period is a rolling 12 months by default and remembers your choice
- Brews without a date show "Unknown date" and sort last
- Logging a brew with only finished bags explains why and offers Add Coffee
- "Update available — Reload" prompt when a newer version is published

### Speed
- Label photos are shared across cards instead of being embedded in each one (a 70-brew list was tens of MB)
- Brew lists show 30 at a time with "Show more"

### Prices
- The exchange rate and date are stored with each price; editing other details no longer re-converts it
- "≈" marks £ figures that used an approximate (offline) rate

### Accessibility
- Tiles, chips and pickers work from a keyboard and are announced as buttons; selected state is announced
- Sheets are proper dialogs: focus moves in, Tab stays inside, Escape closes, focus returns afterwards
- Every field has a linked label; icon-only buttons have spoken names; visible focus ring
- Pinch-zoom is allowed; smallest text raised from 7–10px to 11px
- Emoji icons replaced with outline icons matching the rest of the app

### Housekeeping
- Removed dead code, unused settings and references to fonts that were never loaded; fonts set once via variables
- Manifest and icons use relative paths (the app survives a repo rename or custom domain)
- New ids are random rather than time-based
- Automated tests are now in the repo under `/tests` (31 suites) with a one-command runner, run on every push
- Service worker cache bumped to v3

---

## v3.30
*2 October 2026*

No visible changes — two structural changes behind the scenes.

### Strict content policy
- The browser now refuses to run any script that isn't one of the app's own files: no inline scripts and no inline tap handlers
- All 204 tap/input handlers moved out of the markup's `on…` attributes; a small dispatcher reads them and can only call a fixed list of 102 app functions with plain values
- Tests confirm injected scripts and handlers do not run

### App split into files
- `index.html` (markup, ~700 lines), `css/styles.css`, and six scripts in `js/`: data, core, coffee, views, tools, app
- Files are versioned (`?v=3.30`) so an update can never mix old and new files; the service worker stores them for offline use
- Service worker, app and `version.json` share one version number, checked by the tests

---

## v3.31
*2 October 2026*

### Full-screen brew mode
- Starting the brew timer now opens a full-screen view: very large clock, coffee and recipe name, dose / water / grind, the current step in large type and a bar counting down to the next step
- The whole recipe is listed underneath as a timeline: finished steps fade and tick, the current one is marked, the next is bold; long recipes scroll and keep the current step in view
- At the last step the bar shows how far over you are and Stop becomes "Stop & save time"
- Minimise (or the phone's Back button, or Escape) returns to the form with the timer still running; a "Full screen" button and the timer pill bring it back
- Recipes without timed steps show the clock on its own

### Cancel a brew
- New Cancel button for an accidental start. It asks "Cancel this brew?" first (Keep brewing / Yes, cancel brew); the timer keeps running until you confirm
- Cancelling resets the timer to 0:00 and returns to the form; everything else you entered is kept and nothing is saved

### Fix
- On a fresh launch, the phone's Back button with a sheet or brew mode open left the app (losing a running timer). The first Back press is now always handled by the app

---

## v3.32
*2 October 2026*

### Score a brew later
- Stopping the timer in brew mode now shows "Brew finished" with the recipe summary and two choices: **Save & remind me to score** (5, 10 or 15 minutes; your choice is remembered) or **Score now**
- "Save & remind me" stores the brew straight away as awaiting a score. "Score now" returns to the form as before; nothing is saved until you log it
- Log Brew also has a **Save & score later** button for brews made without the timer
- Overview shows an **Awaiting score** card for each such brew, with "Score this brew" and a × to leave it unscored; the brew's card carries an **Unscored** badge you can tap; the app icon shows a count where the phone supports it
- **Score brew** sheet: only extraction, rating, taste profile and notes, with the recipe shown at the top. Saving completes the brew and then offers Plan next brew (which waits for the score, since it depends on taste)
- Correcting the recipe of an awaiting brew (e.g. the dose) keeps it awaiting; giving it a rating or extraction result completes it

### Reminder (best effort)
- When the reminder is due and the app is open, it shows a message and vibrates. If the app is in the background and still running, it shows a notification; tapping it opens the Score brew sheet
- The app asks for notification permission the first time you choose to score later
- There is no server, so if the phone has closed the app the notification will not arrive; the Overview card is always there when you next open it
- Settings › Brewing › **Score Later** switches the prompt and button off

---

## v3.33
*3 October 2026*

### Log Brew: new order and sliders
- The recipe part of Log Brew now runs: **Grind** slider, **Water temp** slider, **Dose** and **Water** side by side, the **Start Brew** timer, then **Time** last (the timer fills it in)
- Grind slider: moves in 0.1 on stepless grinders and in the grinder's own clicks on stepped ones. It spans the usual range for the chosen brew method on your grinder, so it is easier to set precisely, and widens to the grinder's full range if you type a value outside it
- Temperature slider: 80–100°C in 1°C steps
- Each slider has a number box beside it, so exact values (or a temperature outside 80–100) can still be typed; the two stay in step, including when a recipe, Use, Apply or an edit fills them in
- With no grinder selected the grind slider is switched off and the box is used on its own

---

## v3.34
*3 October 2026*

### Settings in collapsible categories
- Six categories, each opened or closed by tapping its heading: **Library** (Recipes, Grinders, Roasters), **Logging a brew** (Suggested Start, Score Later), **Display** (Dark Mode, Text Size, Show Costs), **Insights**, **Backup & storage**, **About**
- Library and Logging a brew are open each time Settings opens; the rest start closed
- Show Costs moved from Brewing to Display
- Backup & storage opens by itself while an "Undo last restore" is available

### Tasting notes one at a time
- A coffee's bag tasting notes are now entered individually: type a note and press Enter or a comma, and it becomes a chip with a × to remove it
- Notes used on other coffees are suggested as you type, and their spelling is reused
- Existing notes are split into chips automatically; they are still stored and shown as one list ("Blueberry, jasmine, dark chocolate") exactly as before

### Roasters
- **Roaster website** field on a coffee; "https://" is added for you, and anything that isn't a web address is rejected
- Choosing a roaster you've used before fills in its city, country and website
- **Roaster page**: tap the roaster name on a coffee's page to see where it is, a link to its website, "Find on map", how many coffees and brews you've had from it, your average rating and spend, and the list of its coffees
- **Roasters** list under Settings › Library, with **Find roasters near me** and **Coffee shops near me**. These open your maps app, which uses its own location; the app itself never sees where you are

### Fix
- The hidden message bubble near the top of the screen could swallow a tap on whatever was underneath it

---

## v3.35
*3 October 2026*

### Log Brew: selected coffee first
- The coffee you're brewing is now always at the top of the coffee list in Log Brew, so it's visible without scrolling. This applies to Brew now from Up next, Repeat, Use, Edit, and a plain Log Brew (where it's the coffee you used last)
- The list doesn't jump around when you tap a different coffee; the new order applies the next time the sheet opens

---

## v3.36
*4 October 2026*

### Brew mode readable at a glance
- Everything on the full-screen brewing view is larger, for reading from the counter without picking the phone up: the clock, the current step (now 32px), the countdown to the next step, dose / water / grind, the step list (18px), and the Cancel and Stop buttons
- The time left until the next step is the largest thing after the clock and the current step; the progress bar is thicker
- On smaller phones, where the step list has to scroll, it starts at the next step (the current one is already shown large above)

---

## v3.37
*5 October 2026*

### Blends
- **Blend** tick box in Add Coffee, under Decaf. Ticking it shows a counter for the number of coffees in the blend (2 to 4) and one collapsible card per coffee
- Each card has the same origin fields as a single-origin coffee — country, region, altitude, producer, farm, varietal and process — plus an optional **share of the blend (%)**. Everything is optional: fill in what the bag tells you
- Anything already typed as a single origin becomes Coffee 1 when you tick Blend
- Shares must be given for every coffee or none, and must total 100%
- Unticking Blend, or reducing the count, asks for confirmation when details would be lost. Turning Blend off keeps Coffee 1 as the coffee's origin
- **Coffee page**: "Blend · 2 coffees" and the joined origins ("Brazil + Ethiopia") in the header, then an "In this blend" section with a share bar and each coffee's details
- **Library**: Blend badge on tiles and joined origins in the summary
- **Insights**: on the Origin country, Process and Varietal charts a blend counts once, as "Blend". Tap that entry to see what your blends are made of, weighted by share (equal parts where no share was given), and the list of blends
- Name, roaster, roast, weight, price, tasting notes, rating and photo stay once for the whole bag

---

## v3.38
*7 October 2026*

### Back from a coffee returns to the Coffee Library
- Swiping back (or pressing the phone's Back button) on a coffee's page now returns to the Coffee Library instead of jumping to Overview. A second Back goes to Overview, and from there "Press back again to exit" as before
- The library reopens at the place you had scrolled to, both for the swipe and for the on-screen "← Back"
- Open sheets, Settings and brew mode still close first, as before

### Roaster country: US and UK
- "US", "USA", "United States", "United States of America" (and "U.S.", "America") are all stored and counted as **US**
- "UK", "United Kingdom" (and "U.K.", "Great Britain", "Britain", "GB") are all stored and counted as **UK**
- Applies to new entries and to coffees already saved, so Insights and roaster pages no longer split them

---

## v3.39
*8 October 2026*

### Log Brew: coffees in roast-date order
- The coffee list in Log Brew is now sorted by roast date, oldest at the top, so the bag to use up first is easiest to reach. Coffees without a roast date follow, in library order
- Each coffee shows how many days off roast it is beside the roaster (e.g. "Square Mile · 18 days off roast")
- The coffee you're brewing (Brew now, Repeat, Use, Edit, or the one you used last) still goes to the very top; on a first Log Brew the oldest roast is selected

### Lock the ratio
- A **Lock ratio** button beside the ratio line in Log Brew. With it on, changing the dose changes the water to keep the same ratio, and changing the water changes the dose
- It locks whatever ratio you have when you tap it; choosing a recipe, Use or Apply sets a new locked ratio from the numbers they fill in
- The lock stays on between brews until you tap it again

### Recipes follow your dose and water
- When your dose or water differs from the recipe's, the gram and ml amounts in its steps are recalculated to match (e.g. Hoffmann's V60 at 15g: "Pour 30g water … to 150g total … 250g total"), highlighted, with a note showing the recipe's own numbers
- The coffee amount follows your dose; pour amounts follow your water. Times are unchanged
- The scaled steps are also what the timer guide and brew mode show

### Brew mode
- Water temperature is now shown on the brewing screen alongside dose, water and grind

---

## v3.40
*19 October 2026*

### Wider grind slider in Log Brew
- The grind slider now covers the usual range for the brew method plus half as much again on each side. For pourover that's roughly 250–850µm instead of 400–700µm, converted to your grinder's settings
- Applies to every method; typing a value outside the slider still widens it to the grinder's full range

---

## v3.41
*20 October 2026*

### Log Brew in two screens
- **Step 1 · Set up**: coffee, grinder, method, recipe, Last & best, grind and temperature sliders, dose and water (with the ratio lock) and time. The footer holds **▶ Start brew** (opens brew mode) and **Skip timer**
- **Step 2 · How was it?**: extraction, rating, taste profile, notes and "finish this bag", with a strip summarising the brew (coffee, recipe, grind, dose → water, temperature, time). The footer holds **Score later** and **Save brew**
- Stopping the timer takes you to step 2 (via the Score now / later choice if Score Later is on); "‹ Set up", the phone's Back button or Escape returns to step 1 without losing anything
- A progress bar and "Step 1 of 2" sit under the title, with a ✕ to close
- The coffee and grinder lists show just the current choice, with "Change ▾" to open the full list; picking one closes it again
- Brew methods sit on one sideways-scrolling row
- The recipe card folds its steps away ("Show the 7 steps ▾"); they're still on the timer and brew-mode screens
- The timer card appears once a brew has started (to resume, reset or go full screen); until then Start brew lives in the footer
- Editing a brew shows **Next ›** instead of Start brew; Score brew opens straight on step 2

---

## v3.42
*20 October 2026*

### Log Brew in three screens
- **Step 1 · Choose**: coffee (oldest roast first), grinder, brew method and recipe. Footer: **Cancel** / **Next ›**
- **Step 2 · Dial in**: a strip showing coffee, grinder and method, then Last & best, Suggested start, the grind and temperature sliders, dose and water (with the ratio lock), the timer card once a brew starts, and time. Footer: **Skip timer** / **▶ Start brew**
- **Step 3 · How was it?**: unchanged
- **‹ Back**, the phone's Back button and Escape each go back one screen; Back on step 1 closes Log Brew
- Repeat, Use these settings and Brew now open straight on Dial in, as the coffee and recipe are already chosen. Editing a brew starts on Choose
- Problems with the numbers send you to Dial in; a missing coffee sends you to Choose
- The footer buttons are taller (58px), and their text is centred both ways and kept on one line. **▶ Start brew** is larger and bolder

### Grind slider covers the whole grinder
- The slider now runs from the grinder's finest to its coarsest setting
- The usual range for the brew method is drawn as a terracotta band on the track, with a key underneath: "Suggested for Pourover · 26–50 clicks"
- Wide grinders get the same fine step across the whole range, and you can still type an exact value
- With no grinder chosen, the slider stays off and you type the setting

---

## v3.43
*20 October 2026*

### Dial in fits on one screen
- Brewing from **Up next** (or any Log Brew) now fits on one screen on Dial in without scrolling. Checked on Pixel 7, Pixel 5, iPhone 13 and Galaxy S9+ sizes
- **Last & best** starts folded. Its strip already shows the rating, grind and temperature; tap it to see the full brews, and it stays open if you leave it open
- The "Dialling in a recipe" subtitle and the "Grind & Dose" heading are dropped on Dial in
- The suggested-range key sits on the same line as the slider's end values ("Suggested 26–50"), and the particle-size line is shorter ("≈ 354µm (fine) · finer than usual")
- The Suggested start card is shorter: the recipe goes on one line, and where the suggestion comes from is now under "Why?"
- On shorter phones, Dial in tightens its spacing, hides the "Log Brew" title and lets the sheet use a little more of the screen

---

## v3.44
*21 October 2026*

### Start brew in dark mode
- In dark mode, the main footer button (**▶ Start brew**, **Next ›**, **Save brew**) is now light sage with dark text, so it stands out from the dark-green sheet. The secondary button beside it is outlined
- **Skip timer** and **Start brew** are now exactly the same height and line up. A stray top margin on the primary button had made Skip timer 8px taller

### Fixes from a general pass
- **Large text on narrow phones:** the footer buttons could push **Start brew** off the right edge. They now shrink to fit, and wrap only if the text is very large
- **Taste profile:** the Sweetness, Acidity, Body and Bitterness sliders didn't line up, and at larger text sizes the value pushed off-screen. The labels now have a fixed column, so the sliders align and stay on screen
- **Dial in summary:** a long coffee name made the chips wrap onto two lines, which pushed Dial in into scrolling. The chips now stay on one line, and a long name shortens with "…" (the full name shows on long-press or hover)
- **Extra-large text on small phones:** the Overview stats row (Coffees / Brews / Dialled in) made the page wider than the screen, nudging the bottom nav's Settings tab off the edge. The stats now fit, and the nav tabs share the width evenly
- New checks cover these on two phone sizes, three text sizes, and light and dark modes

---

## v3.45
*23 October 2026*

### The page behind sheets stays still
- While Log Brew, Settings, the recipe editor, brew mode or any other sheet is open, the page behind no longer scrolls. Scrolling inside a sheet stops at its ends instead of carrying on to the page underneath
- When the sheet closes, you're back where you were

### Recipe editor
- **Deleting steps:** the ✕ beside each step was 15px wide and very faint (nearly invisible in dark mode), so taps usually landed in the text box and opened the keyboard instead. It's now a full 44px button, clearly visible in both modes, and removing a step renumbers the rest
- **Keyboard closing while editing:** dragging inside the editor could scroll the page behind it, which pushed the field you were typing in out of view. That scrolling is now blocked, and the misfired taps on ✕ no longer bounce focus in and out of the text boxes
- Steps containing `<`, `>` or `&` now show exactly as typed (they could previously be cut short or garbled)

### Sage buttons across dark mode
- Every main action button in dark mode (New Coffee, Save Recipe, Add to Up next, Brew now, Apply on Suggested start, and so on) now uses the same light sage with dark text as Start brew
- Buttons coloured on purpose keep their colours: red Delete, the Log Brew tile, outlined buttons, and the grinder Favourite/Compare toggles

---

## v3.46
*27 October 2026*

### Brew from the Coffee Library
- Every open bag in the Coffee Library has a **Brew** button, in both list and grid view. It opens Log Brew with that coffee already chosen
- A coffee's own page has **Log brew** at the top

### Coffee Library in oldest-roast order
- Open bags are listed oldest roast first (most days off roast). Bags with no roast date come after them
- Next comes a **Freezer** group, then **Finished** bags, each with a heading

### Freezer
- **❄ Freeze** a coffee from its page or its ⋯ menu. Its days-off-roast clock pauses until you **Thaw** it, and freezing again later adds another pause
- Time in the freezer is never counted: cards, the coffee page, Log Brew, Suggested start, and "oldest first" ordering all use the paused age. A brew logged before freezing keeps the age it had at the time
- Frozen coffees can't be brewed. They're left out of Log Brew's coffee list, and Brew now (Up next) or Repeat on a frozen coffee asks "Thaw and brew?" first. If every open bag is frozen, Log Brew says so
- A frozen card shows "❄ Frozen · 12d off roast" with a **Thaw** button. The coffee page says when it went in and where its clock is paused
- Finishing a frozen bag takes it out of the freezer. Freezing and thawing on the same day leaves no pause behind
- Backups keep freezer history, and imported freezer data is checked and cleaned up

### Bigger Finer / Coarser steps in Plan next
- One Finer or Coarser tap now changes particle size by the same amount on every grinder: half a number on the Timemore Sculptor 078S (about 28µm), up from 0.1
- Other grinders get the nearest equivalent their adjustment allows, and never less than one step. For example: 0.6 on a Sculptor 078, 2 clicks on a 1Zpresso JX-Pro, 1 click on a Comandante C40, about 12 on a stepless Eureka Mignon
- The slider still fine-tunes in the grinder's smallest step, and Plan next shows both sizes

---

## v3.47
*27 October 2026*

### Smaller Finer / Coarser step for espresso
- In Plan next, one Finer or Coarser tap on an **espresso** brew now moves a fifth of a number on the Timemore Sculptor 078S (about 11µm), down from half a number. Small grind changes have a much bigger effect on espresso
- Other grinders get the same change in particle size, rounded to what they can do, and never less than one step. For example: 0.2 on a Sculptor 078, 1 click on a 1Zpresso JX-Pro, 2 steps on a Baratza Vario, about 5 on a stepless Eureka Mignon
- Filter methods keep the larger step from v3.46 (half a number on the 078S, about 28µm)

---

## v3.48
*27 October 2026*

### Water & minerals (optional)
- Turn on **Water & minerals** in Settings › Logging a brew. It's off by default, and when off, nothing about water appears anywhere
- **Water page** (Settings › Library › Water):
  - Your two mineral bottles: A for hardness (GH) and B for buffer (KH), with their strength per g/L and what's in them
  - Drops per gram, and the water styles: Bright & juicy (GH 60 / KH 15), Balanced (45 / 22.5), Sweet & creamy (45 / 30) and Delicate & floral (30 / 15)
  - Each style shows how many g/L of each bottle it takes and the TDS reading you should expect
- **Mix it:** tap a water and pick an amount (100 ml to 4 L, or any amount) to see drops and grams of each bottle, plus the expected TDS meter reading. Adjust GH or KH and save it as your own water
- **Tap / bottled water:** save waters like tap or a bottled brand, with optional GH/KH, to compare against
- **Make new bottles:**
  - Tick the salts you have (magnesium chloride, Epsom salt, calcium chloride hydrated or anhydrous, baking soda, potassium bicarbonate). It suggests what to put in each bottle for a 20 g, 50 g, 100 g or 250 g batch, at the same strength as now, so your waters don't change
  - With both magnesium and calcium, choose mostly magnesium, even, or mostly calcium. With both buffers, choose both evenly, or just one
  - Epsom salt and calcium aren't put in the same bottle (they'd cloud out as gypsum), and you get a warning if a bottle can't be made
- **Calibrate drops:** count drops onto a scale to set your drops per gram. There's also an optional TDS meter check: enter drops of A and B, the amount of water and your reading, and it tells you whether your bottles and drop count look right
- **Log Brew:** a Water picker on the Choose screen. It defaults to the water you last used for that coffee (or last used overall) and shows the drops for your cup. "Not recorded" leaves it off
- Each brew stores the water it used, so renaming or deleting a water later doesn't change history. Brew cards show it, and Repeat, Up next and Edit keep it
- **Insights › Water:** average rating for each water, filtered by coffee and method (2+ rated brews each), with a line on which water rates highest so far
- Backups include water settings, and imported water data is checked and cleaned up

---

## v3.49
*27 October 2026*

### Drops reminder after brewing
- When you stop the timer, the **Brew finished** sheet and **How was it?** show "💧 Add to your cup now", with the drops of A and B for the water you picked. Example: Bright & juicy, 15 g → 250 ml gives 9 drops of A and 4½ drops of B
- The count is for the coffee actually in the cup:
  - Filter: your water less what the grounds hold back (about 2 g per g of coffee), so 15 g → 250 ml is about 220 ml
  - Espresso: the yield
  - No water amount entered: it shows per 250 ml and asks for the amount
- New setting on the Water page, **I add the drops: Cup / Water**. Cup (the default) gives the reminder. Water means you mineralise the brew water beforehand, so there's no reminder
- No reminder for tap/bottled water, "Not recorded", editing a brew, or scoring a brew saved earlier

---

## v3.50
*27 October 2026*

### New text font: Inter (option B)
- Text, labels, buttons and numbers now use **Inter**, a sans-serif made for reading on screens, in place of Space Mono. Headings and coffee names keep **Space Grotesk**, so dialed still looks like dialed
- Numbers use same-width digits, so grind, dose and time line up in columns
- Spacing on capitalised labels and buttons is tightened to suit the new font
- The font is bundled with the app, so it works offline and loads nothing from other sites. It's cut down to the characters dialed uses: 127 KB, smaller than the two Space Mono files it replaces (now removed)
- Dark mode: the selected brew method and Insights period now use the light sage highlight, so the choice is easy to see

---

## Pending / Roadmap
- Rebuild the APK once to pick up the new cup icon
- Opt-in pooled data + trained model (see feasibility notes): backend, consent, deletion, ICO registration
- Google Drive sync (deferred — manual backup/restore and reminder in place)
- Screenshot showcase for PWABuilder
- Play Store listing
- Reliable score reminders (real push notifications) — needs the backend that sync will bring
- Small server function (the shared foundation for the items below; no accounts or stored data to begin with)
- Scan a bag label or paste a roaster's product link to pre-fill Add Coffee, with a review step; later, search the farm to suggest missing details such as altitude. Needs the server and an AI API key; add a daily usage cap
- Free and premium tiers — preferred route: Google Play Billing through the existing Android package (Digital Goods API), so Google handles identity and payment and no separate sign-in or Stripe is needed. One-off "Premium unlock" is the simplest product. On-device features such as cost tracking can be locked now, since there are no other users yet; scans and other server features are verified by the server. To prove on a test build first. Needs: Play developer account, closed test (12 testers for 14 days), store listing, privacy policy, package rebuilt with billing enabled; decide whether the browser version stays free-tier or is closed off; make the repo private and move hosting when going commercial. iPhone would need a separate App Store listing. Stripe on the web remains the fallback
- In-app list of nearby roasters and cafés using Google Places (needs a server to keep the API key private)
- Accounts with shared ratings and recipes, Vivino-style (needs a backend; on hold)
- Compare brew methods (parked)
- On hold: sharing with friends — start with share links (coffee + best recipe via the phone's share sheet, imported by tapping the link); connected friends/feed later if wanted

---

*Document maintained automatically. Last updated: v3.50*
