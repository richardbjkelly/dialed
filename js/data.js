// dialed — Built-in recipes and the grinder database
// Plain scripts sharing one global scope, loaded in order: data, core, coffee, views, tools, app.

// ==================== RECIPE DATABASE ====================
// Sources: James Hoffmann YouTube / honestcoffeeguide.com / timer.coffee
const RECIPES = {
  'Pourover': [
    {
      id: 'v60-hoffmann',
      name: "James Hoffmann — Ultimate V60",
      author: "James Hoffmann",
      dose: 30, water: 500, temp: 100, ratio: '1:16.7',
      grindHint: 'Medium-fine', pours: 3, bloomRatio: '2×', totalTime: '3:30',
      steps: [
        "Rinse paper filter with hot water. Add 30g coffee, make a small well in the centre.",
        "0:00 — BLOOM: Pour 60g water (2× dose). Swirl gently to saturate all grounds.",
        "0:45 — POUR 2: Spiral pour to 300g total. Finish by 1:15.",
        "1:15 — POUR 3: Continue slowly to 500g total. Finish pouring by 1:45.",
        "1:45 — Stir once clockwise, once anti-clockwise to knock grounds off sides.",
        "~2:00 — Once drained slightly, give a gentle swirl to flatten the bed.",
        "Target drawdown: 3:30. Grind finer if faster, coarser if slower."
      ]
    },
    {
      id: 'v60-carly-green',
      name: "Carly Green — Kalita / Ceramic",
      author: "Carly Green (Q-Grader, Cherry Love)",
      dose: 15, water: 250, temp: 94, ratio: '1:16.7',
      grindHint: 'Medium', pours: 4, bloomRatio: '2×', totalTime: '2:30',
      steps: [
        "Rinse filter. Add 15g coffee.",
        "0:00 — BLOOM: Pour 30g water. Wait 30 seconds.",
        "0:30 — POUR 2: Steady pour to ~120g.",
        "1:00 — POUR 3: Steady pour to ~185g.",
        "1:30 — POUR 4: Steady pour to 250g total.",
        "Target total brew time: 2:00–2:30."
      ]
    },
    {
      id: 'v60-junchao',
      name: "Junchao Huang — Origami Conical",
      author: "Junchao Huang (UK Brewers Cup 3rd, Calico Coffee)",
      dose: 15, water: 230, temp: 92, ratio: '1:15.3',
      grindHint: 'Medium (600–800µm)', pours: 3, bloomRatio: '2×', totalTime: '2:30',
      steps: [
        "Rinse filter. Add 15g coffee. Preferred grind: 600–800µm particle size.",
        "0:00 — BLOOM: Pour 30g water. Wait 30 seconds.",
        "0:30 — POUR 2: Medium flow (~8g/s) to 120g total.",
        "1:15 — POUR 3: Fast centre pour to 230g total. Allow to drain.",
        "Note: temperature is secondary — focus on consistent grind and flow rate."
      ]
    },
    {
      id: 'v60-alexa',
      name: "Alexa Elizabeth Lee — Orea Flat Bottom",
      author: "Alexa Elizabeth Lee (UK Cup Tasters Champion 2024)",
      dose: 13, water: 215, temp: 94, ratio: '1:16.5',
      grindHint: 'Medium-fine (22–23 clicks Comandante)', pours: 2, bloomRatio: '3×', totalTime: '2:30',
      steps: [
        "Rinse filter in flat bottom brewer (Orea recommended). Add 13g coffee.",
        "0:00 — BLOOM: Pour 40g water (3× dose). Steep 45s–1 min (longer for fresher coffee).",
        "1:00 — POUR 2: Pour remaining 175g to reach 215g total.",
        "Allow to drawdown. Adjust grind to taste."
      ]
    },
    {
      id: 'v60-natdanai',
      name: "Natdanai Denham — 4-Pour Conical",
      author: "Natdanai Denham (3rd English AeroPress 2023, Jan Lek)",
      dose: 15, water: 225, temp: 94, ratio: '1:15',
      grindHint: 'Medium (27 clicks Comandante)', pours: 4, bloomRatio: '2×', totalTime: '2:50',
      steps: [
        "Rinse filter. Add 15g coffee. Water: 100–120ppm recommended.",
        "0:00 — BLOOM: Pour 30g water.",
        "0:30 — POUR 2: Pour 65g (95g total).",
        "1:10 — POUR 3: Pour 65g (160g total).",
        "1:50 — POUR 4: Pour 65g (225g total).",
        "Target brew time: 2:45–2:50."
      ]
    },
    {
      id: 'v60-ted',
      name: "Ted Longden — Clever Dripper All-In",
      author: "Ted Longden (3rd UK Barista 2023, WatchHouse)",
      dose: 15, water: 250, temp: 94, ratio: '1:16.7',
      grindHint: 'Medium', pours: 1, bloomRatio: 'N/A', totalTime: '2:30',
      steps: [
        "Set up Clever Dripper on a mug. Add 15g coffee.",
        "0:00 — Pour ALL 250g water at once. Stir immediately.",
        "2:30 — Place on mug to release and drain.",
        "No bloom needed — immersion brewing degasses naturally. Reliable 8/10 brew every time."
      ]
    },
    {
      id: 'v60-alan',
      name: "Alan Jarrar — Kalita 185",
      author: "Alan Jarrar (Jokes Aside Coffee)",
      dose: 30, water: 500, temp: 100, ratio: '1:16.7',
      grindHint: 'Medium (18 clicks Comandante)', pours: 3, bloomRatio: '2×', totalTime: '2:20',
      steps: [
        "Rinse filter. Add 30g coffee. Use Brita-filtered water, poured off boil into gooseneck.",
        "0:00 — BLOOM: Pour 60g at ~8g/s flow rate.",
        "0:30 — POUR 2: Pour to 330g total.",
        "Wait 20 seconds.",
        "POUR 3: Pour remaining 170g to reach 500g. Swirl after final pour.",
        "Target brew time: 2:05–2:35."
      ]
    },
    {
      id: 'v60-sharon',
      name: "Sharon Ip — FLO / Orea V4",
      author: "Sharon Ip (2nd English AeroPress 2024, TABxTAB)",
      dose: 18.5, water: 250, temp: 91, ratio: '1:13.5',
      grindHint: 'Medium (20 clicks Comandante)', pours: 4, bloomRatio: '3×', totalTime: '2:30',
      steps: [
        "Rinse Kalita Wave 185 paper in flat bottom brewer. Add 18.5g coffee. Water: 50–80ppm.",
        "0:00 — BLOOM: Pour 60ml water.",
        "0:40 — POUR 2: Circular pour to 130ml.",
        "POUR 3: Circular pour to 195ml.",
        "POUR 4: Centre pour to 250ml.",
        "Tip: this higher dose ratio gives punch and character. Bypass with water if too intense."
      ]
    },
    {
      id: 'v60-cleo',
      name: "Cleo Tsai — Simple 4-Pour V60",
      author: "Cleo Tsai (Canadian Brewers Cup Finalist 2024)",
      dose: 15, water: 250, temp: 93, ratio: '1:16.7',
      grindHint: 'Medium-coarse', pours: 4, bloomRatio: '4×', totalTime: '2:40',
      steps: [
        "Rinse filter. Add 15g coffee.",
        "0:00 — POUR 1: 60g in 6 seconds, circular pour.",
        "0:30 — POUR 2: 60g in 6 seconds (120g total).",
        "1:00 — POUR 3: 60g in 6 seconds (180g total).",
        "1:30 — POUR 4: 70g centre pour (250g total).",
        "Target brew time: 2:40. Works beautifully for almost any coffee."
      ]
    },
    {
      id: 'v60-gage',
      name: "Gage Quinn — Orea V3 Fast Flow",
      author: "Gage Quinn (Northern Filter Champion 2023)",
      dose: 12, water: 200, temp: 94, ratio: '1:16.7',
      grindHint: 'Medium (25 clicks Comandante)', pours: 3, bloomRatio: '2.5×', totalTime: '2:00',
      steps: [
        "Rinse filter in Orea V3. Add 12g coffee. Water: 80–100ppm.",
        "0:00 — BLOOM: Pour 30g slowly at 3g/s. Push down floating grounds.",
        "0:35 — POUR 2: Pour to 105g at 4g/s.",
        "1:15 — POUR 3: Pour to 200g at 5–6g/s (centre pour once surface is pale).",
        "Target brew time: ~2:00. Yields a sweet cup at ~1.30% strength."
      ]
    },
    {
      id: 'v60-kish',
      name: "Kish (Team Harmony) — 5-Pour V60",
      author: "Kish, Harmony Coffee",
      dose: 16, water: 250, temp: 93, ratio: '1:15.6',
      grindHint: 'Coarse-very coarse', pours: 5, bloomRatio: '3×', totalTime: '2:40',
      steps: [
        "Rinse filter. Add 16g coffee.",
        "0:00 — BLOOM: Pour 50g water.",
        "0:30 — POUR 2: Pour 50g (100g total).",
        "1:00 — POUR 3: Pour 50g (150g total).",
        "1:30 — POUR 4: Pour 50g (200g total).",
        "2:00 — POUR 5: Pour 50g (250g total).",
        "Target brew time: 2:40. Group pours if draining slowly. Adjust grind to control pace."
      ]
    },
    {
      id: 'v60-ben',
      name: "Ben (Team Harmony) — Orea V4 Fast",
      author: "Ben, Head of Coffee, Harmony Coffee",
      dose: 16, water: 250, temp: 94, ratio: '1:15.6',
      grindHint: 'Medium (26 clicks Comandante)', pours: 4, bloomRatio: '3×', totalTime: '2:00',
      steps: [
        "Rinse Sibarist Fast Flow paper in Orea V4. Add 16g coffee. Water: 88ppm (30 KH / 48 GH). Rest coffee 21+ days off roast.",
        "0:00 — BLOOM: 50g in 6 seconds, concentric circles.",
        "0:35 — POUR 2: 75g in 10 seconds (125g total).",
        "1:05 — POUR 3: 60g in 10 seconds (185g total).",
        "1:35 — POUR 4: 65g in 8 seconds (250g total).",
        "Target brew time: 1:50–2:00. Requires Orea + Sibarist fast papers for this timing."
      ]
    },
  ],
  'AeroPress': [
    {
      id: 'aeropress-hoffmann',
      name: "James Hoffmann — Ultimate AeroPress",
      author: "James Hoffmann",
      dose: 11, water: 200, temp: 100, ratio: '1:18',
      grindHint: 'Medium-fine',
      steps: [
        "Standard (upright) position. No need to rinse or preheat.",
        "Add 11g coffee.",
        "0:00 — Pour all 200g boiling water, wetting all grounds.",
        "0:10 — Insert plunger ~1cm to create vacuum seal.",
        "2:00 — Swirl gently.",
        "2:30 — Press slowly over 30 seconds.",
        "Stop just before the hiss."
      ]
    },
    {
      id: 'aeropress-wac-2025',
      name: "Némo Pop — WAC Champion 2025",
      author: "Némo Pop, Australia",
      dose: 18, water: 200, temp: 84, ratio: '1:11',
      grindHint: 'Fine-medium, sifted at 200µm',
      steps: [
        "Upright position. Flow Control Filter Cap + 2x paper filters (rinsed).",
        "Add 18g coffee (sifted at 200µm — remove fines).",
        "Water: 125ppm. Bypass water at 50°C ready.",
        "0:00 — Pour 50g at 84°C slowly.",
        "Press gently, add bypass water to taste.",
        "Source: 2025 World AeroPress Championship, Némo Pop."
      ]
    },
    {
      id: 'aeropress-wac-2024-1st',
      name: "George Stanica — WAC 1st 2024",
      author: "George Stanica, Romania",
      dose: 18, water: 150, temp: 96, ratio: '1:8.3',
      grindHint: 'Medium-coarse (870µm / 58 clicks C40)',
      steps: [
        "Inverted position. 1x Aesir filter, rinsed.",
        "Add 18g coffee.",
        "Water: ~85–90ppm, 96°C for extraction. Room temp bypass ready.",
        "0:00 — POUR 1: ~50g water via Melodrip (5–6 seconds).",
        "Wait, then press slowly. Add room temperature bypass water to dilute to taste.",
        "Source: 2024 World AeroPress Championship, George Stanica."
      ]
    },
    {
      id: 'aeropress-wac-2024-2nd',
      name: "Sophan Nugraha — WAC 2nd 2024",
      author: "Sophan Nugraha, Indonesia",
      dose: 18, water: 200, temp: 95, ratio: '1:11',
      grindHint: 'Medium',
      steps: [
        "Inverted position. Rinse filter.",
        "Add 18g coffee.",
        "0:00 — Pour 200g water at 95°C.",
        "0:15 — Stir gently.",
        "1:30 — Flip and press slowly over 30 seconds.",
        "Source: 2024 World AeroPress Championship, Sophan Nugraha."
      ]
    },
    {
      id: 'aeropress-wac-2022-1st',
      name: "Jibbi Little — WAC Champion 2022",
      author: "Jibbi Little, Australia",
      dose: 20, water: 200, temp: 85, ratio: '1:10',
      grindHint: 'Medium-fine',
      steps: [
        "Inverted position. Double filter, rinsed.",
        "Add 20g coffee.",
        "0:00 — Pour 50g water at 85°C. Stir.",
        "0:30 — Pour remaining 150g.",
        "1:30 — Flip carefully. Press slowly over 30 seconds.",
        "Source: 2022 World AeroPress Championship."
      ]
    },
    {
      id: 'aeropress-wac-2021-1st',
      name: "Tuomas Merikanto — WAC Champion 2021",
      author: "Tuomas Merikanto, Finland",
      dose: 16, water: 220, temp: 92, ratio: '1:13.75',
      grindHint: 'Medium',
      steps: [
        "Standard position. Rinse filter.",
        "Add 16g coffee.",
        "0:00 — Pour 220g water at 92°C.",
        "0:20 — Stir 3 times.",
        "1:30 — Press slowly over 25 seconds.",
        "Source: 2021 World AeroPress Championship, Tuomas Merikanto."
      ]
    },
    {
      id: 'aeropress-natdanai',
      name: "Natdanai Denham — 3rd English AeroPress 2023",
      author: "Natdanai Denham, Jan Lek",
      dose: 14, water: 200, temp: 93, ratio: '1:14.3',
      grindHint: 'Medium-fine',
      steps: [
        "Inverted position. Rinse filter.",
        "Add 14g coffee.",
        "0:00 — Pour 200g water at 93°C.",
        "0:10 — Stir 3 times.",
        "1:00 — Flip. Press slowly and evenly.",
        "Stop just before the hiss."
      ]
    },
    {
      id: 'aeropress-sharon',
      name: "Sharon Ip — 2nd English AeroPress 2024",
      author: "Sharon Ip, TABxTAB",
      dose: 16, water: 235, temp: 94, ratio: '1:14.7',
      grindHint: 'Medium-fine',
      steps: [
        "Standard position. 1x Aesir filter, rinsed.",
        "Add 16g coffee.",
        "0:00 — Pour 235g water at 94°C.",
        "0:15 — Stir gently.",
        "1:45 — Press slowly. Target TDS 1.4–1.5%.",
        "Source: Aeroprecipe.com — Apollon's Gold 2024."
      ]
    },
    {
      id: 'aeropress-inverted',
      name: "Classic Inverted",
      author: "Competition Style",
      dose: 14, water: 200, temp: 95, ratio: '1:14.3',
      grindHint: 'Medium',
      steps: [
        "Invert AeroPress. Add 14g coffee.",
        "0:00 — Pour 200g water at 95°C.",
        "0:15 — Stir 3 times.",
        "1:00 — Stir 3 more times.",
        "1:15 — Place rinsed filter cap. Carefully flip onto mug.",
        "1:30 — Press slowly over 30 seconds.",
        "Stop before the hiss."
      ]
    },
    {
      id: 'aeropress-tim-wendelboe',
      name: "Tim Wendelboe — Filter Style",
      author: "Tim Wendelboe Café, Oslo",
      dose: 15, water: 250, temp: 93, ratio: '1:16.7',
      grindHint: 'Medium',
      steps: [
        "Standard position. Rinse filter.",
        "Add 15g coffee.",
        "0:00 — Pour 250g water at 93°C.",
        "0:10 — Stir once.",
        "1:00 — Press slowly over 20 seconds.",
        "Produces a clean, filter-like cup. Source: Aeroprecipe.com."
      ]
    },
  ],
  'Chemex': [
    {
      id: 'chemex-classic',
      name: "Chemex Classic",
      author: "Classic",
      dose: 42, water: 700, temp: 94, ratio: '1:16.7',
      grindHint: 'Medium-coarse',
      steps: [
        "Rinse Chemex filter with hot water. Discard rinse water.",
        "Add 42g coffee. Place on scales.",
        "0:00 — Pour 80g water to bloom. Swirl gently.",
        "0:45 — Pour to 350g in slow spirals.",
        "1:30 — Pour to 700g total. Keep liquid level topped up.",
        "Allow full drawdown. Target total time ~4:00–4:30."
      ]
    },
    {
      id: 'chemex-hoffmann',
      name: "Hoffmann-Style Chemex",
      author: "James Hoffmann",
      dose: 30, water: 500, temp: 94, ratio: '1:16.7',
      grindHint: 'Medium-coarse',
      steps: [
        "Rinse filter. Add 30g coffee.",
        "0:00 — Bloom with 60g water. Swirl. Wait 45 seconds.",
        "0:45 — Pour to 300g in spiral motion by 1:15.",
        "1:15 — Slow pour to 500g by 1:45.",
        "1:45 — Stir once each direction. Swirl after brief drain.",
        "Full drawdown ~3:30–4:00."
      ]
    }
  ],
  'French Press': [
    {
      id: 'french-hoffmann',
      name: "James Hoffmann — Ultimate French Press",
      author: "James Hoffmann",
      dose: 30, water: 500, temp: 100, ratio: '1:16.7',
      grindHint: 'Medium-coarse',
      steps: [
        "Add 30g coffee to French press. Pour 500g boiling water immediately. Do NOT stir.",
        "4:00 — Gently break the crust on top with a spoon. Give 2–3 slow stirs to sink grounds.",
        "4:30 — Scoop off foam and floating grounds with 2 spoons. This is key for a clean cup.",
        "Place lid on press (do not plunge yet). Wait 5–8 more minutes for grounds to settle.",
        "9:30+ — Slowly push plunger down only to the surface of the liquid. Do NOT push to the bottom.",
        "Pour slowly. Do not empty the press — leave the last bit to avoid stirring up sediment."
      ]
    },
    {
      id: 'french-classic',
      name: "Classic French Press",
      author: "Classic",
      dose: 30, water: 500, temp: 95, ratio: '1:16.7',
      grindHint: 'Coarse',
      steps: [
        "Add 30g coarsely ground coffee.",
        "0:00 — Pour 500g water at 95°C. Stir briefly.",
        "4:00 — Place lid on, plunge slowly all the way down.",
        "Pour immediately. Enjoy."
      ]
    }
  ],
  'Moka Pot': [
    {
      id: 'moka-classic',
      name: "Classic Moka Pot",
      author: "Classic",
      dose: 20, water: 300, temp: 100, ratio: '1:15',
      grindHint: 'Medium-fine (not espresso fine)',
      steps: [
        "Fill lower chamber with hot water up to the pressure valve — do NOT overfill.",
        "Add 20g coffee to the basket. Level off, do not tamp.",
        "Assemble and place on medium-low heat. Leave lid open.",
        "When coffee starts flowing, reduce to lowest heat.",
        "Remove from heat as soon as gurgling begins — do not wait for sputter.",
        "Run base under cold water to stop extraction. Pour immediately."
      ]
    },
    {
      id: 'moka-hoffmann',
      name: "Hoffmann-Style Moka",
      author: "James Hoffmann",
      dose: 20, water: 300, temp: 100, ratio: '1:15',
      grindHint: 'Medium (coarser than espresso)',
      steps: [
        "Pre-boil your water — pour directly into the lower chamber hot. Do not heat cold water in the pot.",
        "Add 20g coffee (medium grind, not espresso fine — Moka pot is NOT an espresso machine).",
        "Assemble tightly. Medium heat. Leave lid open.",
        "Watch for coffee to flow — reduce heat to minimum as soon as it appears.",
        "Close lid. Remove at first sign of spluttering.",
        "Pour into a small cup. Optional: add hot water to taste."
      ]
    }
  ],
  'Cold Brew': [
    {
      id: 'cold-brew-classic',
      name: "Classic Cold Brew Concentrate",
      author: "Classic",
      dose: 100, water: 800, temp: 20, ratio: '1:8',
      grindHint: 'Extra-coarse',
      steps: [
        "Add 100g very coarsely ground coffee to a jar or container.",
        "Pour 800g cold or room-temperature water over the grounds.",
        "Stir gently to saturate all grounds.",
        "Cover and refrigerate for 12–24 hours.",
        "Filter through a fine mesh strainer, then through a paper filter.",
        "Dilute concentrate 1:1 with water or milk to serve. Keeps refrigerated for up to 2 weeks."
      ]
    }
  ],
  'Steep & Release': [
    {
      id: 'clever-hoffmann',
      name: "James Hoffmann — Clever Dripper",
      author: "James Hoffmann",
      dose: 15, water: 250, temp: 100, ratio: '1:16.7',
      grindHint: 'Medium-fine',
      steps: [
        "Rinse paper filter with hot water. Keep valve closed.",
        "Pour 250g boiling water into Clever Dripper FIRST (water before coffee).",
        "Quickly add 15g coffee. Stir briefly to wet all grounds.",
        "0:00 — Steep for 2 minutes.",
        "2:00 — Break the crust with a stir or gentle shake.",
        "2:30 — Place Clever Dripper on your mug to release. Drawdown ~45–60 seconds.",
        "Tip: if too bitter, grind coarser or shorten steep. If weak/hollow, grind finer."
      ]
    },
    {
      id: 'clever-classic',
      name: "Classic Steep & Release",
      author: "Classic",
      dose: 18, water: 300, temp: 94, ratio: '1:16.7',
      grindHint: 'Medium',
      steps: [
        "Rinse filter. Add 18g coffee to dripper.",
        "Pour 300g water at 94°C. Stir once.",
        "Steep 3 minutes.",
        "Place on mug — release and drawdown.",
        "Adjust steep time to taste."
      ]
    }
  ],
  'Other': []
};

// ==================== GRINDER DATABASE ====================
// Grind ranges based on data from honestcoffeeguide.com
const GRINDERS = [
  // MANUAL
  {id:'m01',brand:'1Zpresso',model:'JX-Pro',type:'manual',settings:90,min:80,max:1200,notes:'Excellent espresso-to-filter range. Magnetic catch cup. Highly recommended.'},
  {id:'m02',brand:'1Zpresso',model:'J-Max',type:'manual',settings:100,min:60,max:900,notes:'Ultra fine range for espresso enthusiasts. Precise 10-step per rotation.'},
  {id:'m03',brand:'1Zpresso',model:'K-Max',type:'manual',settings:90,min:100,max:1300,notes:'Wide range leaning toward filter. Excellent build quality.'},
  {id:'m04',brand:'1Zpresso',model:'K-Ultra',type:'manual',settings:90,min:80,max:1300,notes:'Titanium burrs. K series flagship.'},
  {id:'m05',brand:'1Zpresso',model:'Q2 S',type:'manual',settings:60,min:100,max:900,notes:'Compact and portable. Great travel grinder.'},
  {id:'m06',brand:'1Zpresso',model:'ZP6 Special',type:'manual',settings:90,min:60,max:800,notes:'Titanium burrs. Premium build for espresso specialists.'},
  {id:'m07',brand:'Comandante',model:'C40 MK4',type:'manual',settings:45,min:100,max:1100,notes:'Iconic German design. High-nitro blade steel. Industry standard.'},
  {id:'m08',brand:'Comandante',model:'C40 MK4 Red Clix',type:'manual',settings:90,min:100,max:1100,notes:'Red Clix upgrade doubles click resolution to 90 per rotation.'},
  {id:'m09',brand:'Comandante',model:'C60 Baracuda',type:'manual',settings:50,min:100,max:1200,notes:'Larger 60mm burr set. Faster grind than C40.'},
  {id:'m10',brand:'Hario',model:'Skerton PRO',type:'manual',settings:20,min:200,max:1300,notes:'Classic Japanese manual. Good value entry point.'},
  {id:'m11',brand:'Hario',model:'Mini Mill PLUS',type:'manual',settings:16,min:300,max:1200,notes:'Compact, lightweight and ultra-portable.'},
  {id:'m12',brand:'Hario',model:'Mini Mill Slim PRO',type:'manual',settings:16,min:300,max:1200,notes:'Slim profile, good for backpacking.'},
  {id:'m13',brand:'KINGrinder',model:'K6',type:'manual',settings:72,min:100,max:1100,notes:'Great value for money. Titanium-coated burrs.'},
  {id:'m14',brand:'KINGrinder',model:'K4',type:'manual',settings:72,min:120,max:1000,notes:'Versatile mid-range manual with adjustable crank.'},
  {id:'m15',brand:'KINGrinder',model:'K2',type:'manual',settings:72,min:150,max:1000,notes:'Budget-friendly KINGrinder entry. Solid performer.'},
  {id:'m16',brand:'Timemore',model:'Chestnut C3',type:'manual',settings:36,min:150,max:1100,notes:'Popular budget option. S2C burrs. Reliable.'},
  {id:'m17',brand:'Timemore',model:'Chestnut G1',type:'manual',settings:36,min:100,max:1000,notes:'Fold-flat titanium-coated burrs. Travel friendly.'},
  {id:'m18',brand:'Timemore',model:'Slim Plus',type:'manual',settings:36,min:150,max:1000,notes:'Slim stainless steel profile.'},
  {id:'m19',brand:'Knock',model:'Feldgrind 2',type:'manual',settings:39,min:100,max:900,notes:'Precision espresso capability. All stainless steel.'},
  {id:'m20',brand:'Knock',model:'Aergrind',type:'manual',settings:24,min:150,max:900,notes:'Slim to fit inside AeroPress. Perfect travel setup.'},
  {id:'m21',stepless:true,brand:'Kinu',model:'M47 Classic',type:'manual',settings:50,min:100,max:900,notes:'German-engineered. Exceptional precision and build quality.'},
  {id:'m22',stepless:true,brand:'Kinu',model:'M47 Phoenix',type:'manual',settings:50,min:100,max:900,notes:'Entry Kinu. Stainless body with polymer base.'},
  {id:'m23',brand:'Goat Story',model:'Arco',type:'manual',settings:60,min:100,max:1100,notes:'Dual burr system switches between espresso and filter modes.'},
  {id:'m24',brand:'Helor',model:'101',type:'manual',settings:48,min:150,max:1100,notes:'Korean-made. Precise adjustment, strong ergonomic handle.'},
  {id:'m25',brand:'Porlex',model:'Mini II',type:'manual',settings:16,min:200,max:1200,notes:'Japanese ceramic burrs. Compact travel grinder.'},
  {id:'m26',brand:'JavaPresse',model:'Manual Grinder',type:'manual',settings:18,min:200,max:1200,notes:'Budget entry level. Good for beginners exploring coffee.'},
  {id:'m27',stepless:true,brand:'Lido',model:'ET',type:'manual',settings:30,min:200,max:1400,notes:'Excellent for pour-over and French press. Side-handle design.'},
  {id:'m28',stepless:true,brand:'Orphan Espresso',model:'Lido 3',type:'manual',settings:30,min:200,max:1400,notes:'Strong, consistent coarser grind. Popular with filter lovers.'},

  // ELECTRIC
  {id:'e01',brand:'Baratza',model:'Encore',type:'electric',settings:40,min:250,max:1100,notes:'The classic beginner electric. 40 stepped settings. Easy to use.'},
  {id:'e02',brand:'Baratza',model:'Encore ESP',type:'electric',settings:40,min:180,max:1100,notes:'Encore with espresso-capable burrs. Great all-rounder entry.'},
  {id:'e03',brand:'Baratza',model:'Virtuoso+',type:'electric',settings:40,min:220,max:1100,notes:'Digital timer. Quality hardened steel burrs. Quiet.'},
  {id:'e04',brand:'Baratza',model:'Vario W+',type:'electric',settings:230,min:150,max:1200,notes:'Weight-based dosing. Wide range covers all methods.'},
  {id:'e05',brand:'Baratza',model:'Sette 270',type:'electric',settings:270,min:150,max:1300,notes:'Conical burr with micro-step adjustment. Espresso focused.'},
  {id:'e06',brand:'Fellow',model:'Ode Brew Gen 2',type:'electric',settings:90,min:350,max:1200,notes:'Filter-focused flat burr. Anti-static. Quiet motor. Beautiful design.'},
  {id:'e07',brand:'Fellow',model:'Opus',type:'electric',settings:41,min:200,max:1300,notes:'All-purpose conical. Espresso to cold brew. Compact.'},
  {id:'e08',brand:'Breville',model:'Smart Grinder Pro',type:'electric',settings:60,min:200,max:1300,notes:'60 grind settings. Digital display. Popular mid-range choice.'},
  {id:'e09',brand:'Breville',model:'Dose Control Pro',type:'electric',settings:25,min:200,max:1100,notes:'Dose by weight or time. Compact footprint.'},
  {id:'e10',stepless:true,brand:'Eureka',model:'Mignon Specialità',type:'electric',settings:350,min:100,max:900,notes:'Stepless adjustment. Flat burr. Very quiet. Italian-made.'},
  {id:'e11',stepless:true,brand:'Eureka',model:'Mignon Silenzio',type:'electric',settings:350,min:100,max:900,notes:'Sound-dampened body. Espresso focused stepless.'},
  {id:'e12',stepless:true,brand:'Eureka',model:'Mignon Classico',type:'electric',settings:350,min:100,max:900,notes:'Entry-level Mignon. Stepless. Italian craftsmanship.'},
  {id:'e13',stepless:true,brand:'Niche',model:'Zero',type:'electric',settings:360,min:100,max:1000,notes:'Single dose, near-zero retention. Stepless conical. Cult favourite.'},
  {id:'e14',stepless:true,brand:'Niche',model:'Duo',type:'electric',settings:360,min:100,max:1300,notes:'Dual burr stack. Handles espresso and filter simultaneously.'},
  {id:'e15',brand:'Wilfa',model:'Svart Aroma',type:'electric',settings:17,min:250,max:1100,notes:'Scandinavian design. Popular budget electric option.'},
  {id:'e16',brand:'Mahlkönig',model:'X54',type:'electric',settings:220,min:150,max:1200,notes:'Home flat burr. Professional quality for all brew methods.'},
  {id:'e17',stepless:true,brand:'Mahlkönig',model:'E65S GbW',type:'electric',settings:250,min:100,max:700,notes:'Professional espresso grinder. Gravimetric dosing. Café standard.'},
  {id:'e18',stepless:true,brand:'Lelit',model:'William PL72',type:'electric',settings:340,min:120,max:900,notes:'Italian flat burr. Espresso-focused. Stepless micrometric.'},
  {id:'e19',stepless:true,brand:'DF64',model:'Gen 2',type:'electric',settings:200,min:100,max:1200,notes:'Single dose. 64mm flat burr. Highly regarded enthusiast choice.'},
  {id:'e20',brand:'Capresso',model:'Infinity Plus',type:'electric',settings:16,min:250,max:1200,notes:'Slow-speed burr. Quiet. Good home value.'},
  {id:'e21',brand:'Oxo',model:'Brew Burr Grinder',type:'electric',settings:38,min:250,max:1200,notes:'One-touch timer. User-friendly design.'},
  {id:'e22',stepless:true,brand:'Rocket',model:'Faustino',type:'electric',settings:300,min:100,max:900,notes:'Italian espresso-focused. Stepless micrometric adjustment.'},
  {id:'e23',stepless:true,brand:'Compak',model:'K3 Touch',type:'electric',settings:100,min:100,max:900,notes:'Commercial-grade home grinder. Touchscreen interface.'},
  {id:'e24',brand:'Flair Espresso',model:'Royal Grinder',type:'electric',settings:80,min:100,max:600,notes:'Espresso-only. Pairs perfectly with Flair manual presses.'},
  {id:'e25',stepless:true,brand:'Timemore',model:'Sculptor 064S',type:'electric',settings:200,min:100,max:1000,notes:'Single dose flat burr. Stepless. Beautiful aesthetics.'},
  {id:'e26',brand:'Comandante',model:'MC6 Goat',type:'electric',settings:90,min:100,max:1100,notes:'Electric version of legendary C40 with same burr geometry.'},
  {id:'e27',brand:'Cuisinart',model:'DBM-8',type:'electric',settings:18,min:250,max:1300,notes:'Budget electric. Good entry-level starting point.'},
  {id:'e28',brand:'De\'Longhi',model:'KG89',type:'electric',settings:14,min:280,max:1300,notes:'Affordable home grinder. Auto-dosing. Beginner-friendly.'},
  {id:'e29',stepless:true,brand:'Timemore',model:'Sculptor 078S',type:'electric',settings:36,min:235,max:1235,clickMin:0,clickMax:18,step:0.1,notes:'Dial 0–18 with fine adjustment, about 55µm per number. Espresso ≈0–2.6, pourover ≈3–8.3, French press ≈8.2–18 (Honest Coffee Guide).'},
  {id:'e30',stepless:true,brand:'Timemore',model:'Sculptor 078',type:'electric',settings:36,min:370,max:1270,clickMin:0,clickMax:18,step:0.1,notes:'Filter-only Turbo burrs, about 50µm per number. Approximate: pourover ≈0.6–6.6, French press ≈6.4–18.'},
];

// Brew method grind ranges (microns) — data from honestcoffeeguide.com
const BREW_METHODS = [
  {name:'Turkish',    min:40,   max:220,  color:'#8b3a3a'},
  {name:'Espresso',   min:180,  max:380,  color:'#c8873a'},
  {name:'Moka Pot',   min:360,  max:660,  color:'#9a6020'},
  {name:'AeroPress',  min:320,  max:960,  color:'#2a7a6a'},
  {name:'Pourover',   min:400,  max:700,  color:'#4a7a28'},
  {name:'Siphon',     min:375,  max:800,  color:'#5a6a2a'},
  {name:'Pour Over',  min:410,  max:930,  color:'#3a8a4a'},
  {name:'Filter Drip',min:300,  max:900,  color:'#6a7a3a'},
  {name:'Cupping',    min:460,  max:850,  color:'#7a5a2a'},
  {name:'French Press',min:690, max:1300, color:'#2a5080'},
  {name:'Cold Drip',  min:820,  max:1270, color:'#4a2a8a'},
  {name:'Cold Brew',  min:800,  max:1400, color:'#3a3a8a'},
];

const CHART_MIN = 0, CHART_MAX = 1500;
const COMPARE_COLORS = ['#c8873a','#2a5080','#4a7a28','#8b1a1a','#5c2d8e'];
