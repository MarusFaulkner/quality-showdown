/* =========================================================
   FUZZY MATCHING
   normalize -> exact alias -> small typo allowance -> whole-word containment
   ========================================================= */
const FILLER = new Set(["a", "an", "the", "my", "your", "some", "their", "it", "to"]);

function normalize(s) {
  return s.toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(w => w && !FILLER.has(w))
    .map(w => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) ? w.slice(0, -1) : w)
    .join(" ");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

const tolerance = len => len <= 4 ? 0 : len <= 7 ? 1 : 2;

// 3 = exact, 2 = typo, 1 = every candidate word appears in the guess, 0 = no match
function matchScore(guess, candidate) {
  const g = normalize(guess), c = normalize(candidate);
  if (!g || !c) return 0;
  if (g === c) return 3;
  if (levenshtein(g, c) <= tolerance(c.length)) return 2;
  const gw = g.split(" ");
  const contained = c.split(" ").every(w => gw.some(x => levenshtein(x, w) <= tolerance(w.length)));
  return contained && c.length >= 3 ? 1 : 0;
}

function findAnswer(guess, answers) {
  let best = -1, bestScore = 0;
  answers.forEach(([text, , ...aliases], i) => {
    for (const cand of [text, ...aliases]) {
      const s = matchScore(guess, cand);
      if (s > bestScore) { bestScore = s; best = i; }
    }
  });
  return best;
}

/* Allow Node (tests) to import these helpers; ignored in the browser. */
if (typeof module !== "undefined") {
  module.exports = { normalize, levenshtein, tolerance, matchScore, findAnswer };
}
