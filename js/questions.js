/* =========================================================
   QUESTION BANK — quality & manufacturing
   Each answer: [display text, points, ...aliases]
   ========================================================= */
const BANK = [
  { q: "Name a shortcut people take when production is behind schedule.", a: [
    ["Skip an inspection", 32, "skip inspection", "skip inspecting", "no inspection"],
    ["Accept close enough", 24, "close enough", "pass bad parts", "let it slide"],
    ["Bypass a procedure", 16, "bypass procedure", "skip procedure", "skip steps", "skip a step"],
    ["Don't document", 12, "no paperwork", "skip paperwork", "dont write it up", "pencil whip"],
    ["Keep it quiet", 9, "hide it", "cover it up", "dont tell"],
    ["Cut sample size", 5, "smaller sample", "sample less", "reduce sampling"] ] },
  { q: "Name a reason a part fails inspection.", a: [
    ["Out of tolerance", 30, "out of spec", "wrong size", "dimension", "dimensional", "oversize", "undersize"],
    ["Scratch or dent", 22, "scratch", "dent", "cosmetic", "damage", "damaged", "ding"],
    ["Missing component", 18, "missing", "missing part"],
    ["Wrong label", 12, "label", "labeling", "mislabeled"],
    ["Bad weld", 8, "weld", "welding", "porosity"],
    ["Contamination", 6, "dirty", "dirt", "debris", "contaminated", "burr", "burrs"] ] },
  { q: "Name a tool a quality inspector uses every shift.", a: [
    ["Calipers", 34, "caliper", "vernier"],
    ["Micrometer", 22, "mic", "mike"],
    ["Height gauge", 14, "height gage"],
    ["Go/no-go gauge", 12, "go no go", "pin gauge", "pin gage", "plug gauge"],
    ["CMM", 10, "coordinate measuring machine"],
    ["Thread gauge", 6, "thread gage", "thread ring"] ] },
  { q: "Name something you'd find during a line audit.", a: [
    ["Missing paperwork", 28, "paperwork", "missing documentation", "documentation", "no records"],
    ["Expired calibration", 22, "calibration", "out of cal", "overdue cal", "cal sticker"],
    ["Wrong drawing revision", 16, "wrong revision", "old revision", "revision", "wrong drawing"],
    ["Unlabeled parts", 14, "unlabeled", "no label", "unidentified parts"],
    ["Messy workstation", 12, "housekeeping", "5s", "mess", "clutter"],
    ["No PPE", 6, "ppe", "safety glasses", "ppe violation"] ] },
  { q: "Name something you check on a first article inspection.", a: [
    ["Dimensions", 36, "dimension", "measurements", "size"],
    ["Material cert", 18, "material", "material certification", "cert", "certs"],
    ["Drawing revision", 14, "revision", "rev", "drawing"],
    ["Surface finish", 12, "finish", "roughness"],
    ["Hardness", 10],
    ["Thread fit", 6, "threads", "thread"] ] },
  { q: "Name something that goes on a nonconformance report.", a: [
    ["Part number", 28, "part no", "pn"],
    ["Defect description", 24, "description", "defect", "what's wrong"],
    ["Quantity", 16, "qty", "how many"],
    ["Lot number", 14, "lot", "batch", "batch number", "serial number"],
    ["Disposition", 10],
    ["Root cause", 6, "cause"] ] },
  { q: "Name one of the 6 M's on a fishbone diagram.", a: [
    ["Machine", 26, "equipment"],
    ["Method", 22, "process", "procedure"],
    ["Material", 18, "materials"],
    ["Manpower", 14, "man", "people", "operator", "personnel"],
    ["Measurement", 12, "measurements"],
    ["Mother Nature", 8, "environment", "nature"] ] },
  { q: "Name a reason a gauge fails calibration.", a: [
    ["Worn out", 30, "wear", "worn"],
    ["Dropped", 24, "drop", "it fell"],
    ["Overdue", 16, "expired", "out of date", "late"],
    ["Dirty", 12, "dirt", "contamination"],
    ["Damaged", 10, "broken", "bent"],
    ["Temperature", 6, "heat", "temp"] ] },
  { q: "Name a record an auditor asks to see.", a: [
    ["Calibration records", 28, "calibration", "cal records"],
    ["Training records", 24, "training"],
    ["Work instructions", 16, "procedures", "sop", "sops", "procedure"],
    ["Corrective actions", 14, "car", "capa", "corrective action"],
    ["Inspection records", 12, "inspection reports", "inspection"],
    ["Quality manual", 6, "manual"] ] },
  { q: "Name a disposition for a nonconforming part.", a: [
    ["Scrap", 36],
    ["Rework", 28],
    ["Use as is", 14, "use as-is", "deviation", "concession"],
    ["Return to vendor", 10, "rtv", "return to supplier", "send back"],
    ["Repair", 8],
    ["Sort", 4, "100 percent inspect", "screen"] ] },
  { q: "Name something an inspector wears on the floor.", a: [
    ["Safety glasses", 36, "glasses", "eye protection", "goggles"],
    ["Steel-toe boots", 22, "steel toe", "boots", "safety shoes"],
    ["Ear plugs", 16, "earplugs", "hearing protection", "ear protection"],
    ["Gloves", 12, "glove"],
    ["Badge", 8, "id badge", "lanyard"],
    ["Hi-vis vest", 6, "vest", "safety vest"] ] },
  { q: "Name what you do when something doesn't look right.", a: [
    ["Tell my supervisor", 30, "supervisor", "tell the lead", "tell boss", "report it", "speak up"],
    ["Stop the line", 22, "stop", "shut down", "stop production"],
    ["Quarantine it", 18, "quarantine", "tag it", "red tag", "hold"],
    ["Measure again", 14, "remeasure", "recheck", "double check", "verify"],
    ["Document it", 10, "write it up", "ncr", "document"],
    ["Call engineering", 6, "engineering", "engineer"] ] }
];

const ROUNDS_PER_GAME = 5;
const MAX_STRIKES = 3;
