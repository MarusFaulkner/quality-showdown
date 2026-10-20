// Run with: node --test tests/
// No dependencies; uses Node's built-in test runner (Node 18+).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const { normalize, matchScore, findAnswer } = require("../js/matching.js");

// questions.js is a plain browser script, so load it into a sandbox to read BANK.
const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "../js/questions.js"), "utf8") +
    "\nthis.BANK = BANK; this.ROUNDS_PER_GAME = ROUNDS_PER_GAME;",
  ctx
);
const { BANK, ROUNDS_PER_GAME } = ctx;

test("normalize strips case, punctuation, filler words and plurals", () => {
  assert.equal(normalize("The Calipers!"), "caliper");
  assert.equal(normalize("Don't document"), "dont document");
});

test("exact, typo and contained-word guesses match", () => {
  assert.equal(matchScore("scrap", "Scrap"), 3);
  assert.ok(matchScore("micrometr", "Micrometer") >= 2);
  assert.ok(matchScore("I'd tell my supervisor", "supervisor") >= 1);
});

test("short words need an exact match", () => {
  assert.equal(matchScore("cmn", "CMM"), 0);
});

test("unrelated guesses do not match", () => {
  const q = BANK.find(b => b.q.includes("disposition"));
  assert.equal(findAnswer("banana", q.a), -1);
});

test("every answer is reachable by its own display text", () => {
  for (const { q, a } of BANK) {
    a.forEach(([text], i) => assert.equal(findAnswer(text, a), i, `${q} -> ${text}`));
  }
});

test("question bank data is valid", () => {
  assert.ok(BANK.length >= ROUNDS_PER_GAME, "need at least one question per round");
  for (const { q, a } of BANK) {
    const total = a.reduce((s, [, pts]) => s + pts, 0);
    assert.ok(total <= 100, `${q} totals ${total} (> 100 people surveyed)`);
    assert.ok(a.length >= 4 && a.length <= 8, `${q} should have 4-8 answers`);
    // Compare as JSON: BANK comes from a separate vm realm, so array prototypes differ.
    const pts = a.map(x => x[1]);
    const sorted = [...pts].sort((x, y) => y - x);
    assert.equal(JSON.stringify(pts), JSON.stringify(sorted), `${q} answers should be sorted by points`);
  }
});
