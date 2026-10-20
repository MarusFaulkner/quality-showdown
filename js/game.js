/* =========================================================
   GAME STATE
   ========================================================= */
let state;
const $ = id => document.getElementById(id);

function newGame() {
  const order = BANK.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, ROUNDS_PER_GAME);
  return { order, round: 0, score: 0, strikes: 0, revealed: [], roundDone: false, finished: false, msg: null };
}
const current = () => BANK[state.order[state.round]];
const multiplier = () => state.round === ROUNDS_PER_GAME - 1 ? 2 : 1;
const maxPossible = () => state.order.reduce((sum, qi, r) =>
  sum + BANK[qi].a.reduce((s, a) => s + a[1], 0) * (r === ROUNDS_PER_GAME - 1 ? 2 : 1), 0);

function loadBest() { try { return Number(localStorage.getItem("qs-best")) || 0; } catch { return 0; } }
function saveBest(v) { try { localStorage.setItem("qs-best", String(v)); } catch {} }

/* Host reaction: message on the podium screen + stamp/shake on the stage art */
function say(text, tone) {
  const b = $("bubble");
  b.textContent = text;
  b.className = "panel msg" + (tone ? " " + tone : "");
  const stage = $("stage");
  stage.classList.remove("good", "bad");
  void stage.offsetWidth;                // restart the animation
  if (tone) stage.classList.add(tone);
  $("react").textContent = tone === "bad" ? "✕" : "✓";
  state.msg = { text, tone };
}

/* ---------- Rendering ---------- */
function renderBoard() {
  const q = current();
  $("question").textContent = q.q;
  $("eyebrow").innerHTML = multiplier() > 1
    ? 'We surveyed 100 inspectors · <span class="double">Double points</span>'
    : "We surveyed 100 inspectors";
  const board = $("board");
  board.innerHTML = "";
  q.a.forEach(([text, pts], i) => {
    const hit = state.revealed.includes(i);
    const open = hit || state.roundDone;
    const tile = document.createElement("div");
    tile.className = "tile" + (open ? " open" : "") + (open && !hit ? " missed" : "");
    tile.id = "tile-" + i;
    tile.innerHTML = `<div class="tile-inner">
        <div class="face front"><span class="num">${i + 1}</span></div>
        <div class="face back"><span class="mark">${hit || !open ? "✓" : "✕"}</span><span class="ans"></span><span class="pts">${pts}</span></div>
      </div>`;
    tile.querySelector(".ans").textContent = text;
    board.appendChild(tile);
  });
}

function renderHud() {
  $("round-label").textContent = `${state.round + 1}/${ROUNDS_PER_GAME}`;
  $("score").textContent = state.score;
  $("best").textContent = loadBest();
  for (let i = 0; i < MAX_STRIKES; i++) $("s" + i).classList.toggle("on", i < state.strikes);
  const locked = state.roundDone;
  $("guess-input").disabled = locked;
  $("guess-btn").disabled = locked;
  const last = state.round === ROUNDS_PER_GAME - 1;
  $("action-btn").textContent = locked ? (last ? "Final score" : "Next round") : "Give up round";
  $("action-btn").className = locked ? "gold" : "ghost";
}

function render() {
  const fin = state.finished;
  $("final").hidden = !fin;
  $("controls").hidden = fin;
  $("board").hidden = fin;
  if (fin) {
    $("question").textContent = "That's the shift. Here's your score.";
    $("eyebrow").textContent = "Final inspection";
    $("final-score").textContent = state.score;
    const pct = state.score / maxPossible();
    $("final-stamp").textContent = pct >= 0.5 ? "PASS" : "REWORK";
    $("final-stamp").className = "stamp" + (pct >= 0.5 ? "" : " fail");
    const best = loadBest();
    $("final-note").textContent = state.score >= best ? "New best score!" : `Best so far: ${best}`;
    renderHud();
    say(pct >= 0.5 ? "Solid work. That's a lot I'd sign off on." : "Not bad, but this lot needs rework. Run it again.", pct >= 0.5 ? "good" : null);
    return;
  }
  renderBoard();
  renderHud();
  if (state.msg) say(state.msg.text, state.msg.tone);
}

/* ---------- Actions ---------- */
function endRound(reason) {
  state.roundDone = true;
  current().a.forEach((_, i) => {
    if (!state.revealed.includes(i)) {
      const t = $("tile-" + i);
      if (t) { t.classList.add("open", "missed"); t.querySelector(".mark").textContent = "✕"; }
    }
  });
  const msgs = {
    cleared: ["Board cleared. That's what verified work looks like.", "good"],
    strikes: ["Three strikes. Here's what the survey said.", "bad"],
    gaveup:  ["Fair call. Here's the rest of the board.", null]
  };
  say(...msgs[reason]);
  renderHud();
}

function submitGuess(raw) {
  const guess = raw.trim();
  if (!guess || state.roundDone) return;
  const q = current();
  const i = findAnswer(guess, q.a);

  if (i >= 0 && state.revealed.includes(i)) {
    say(`"${q.a[i][0]}" is already on the board. No strike.`, null);
    return;
  }
  if (i >= 0) {
    state.revealed.push(i);
    const pts = q.a[i][1] * multiplier();
    state.score += pts;
    const t = $("tile-" + i);
    if (t) t.classList.add("open");
    say(`Survey says… "${q.a[i][0]}"! +${pts}`, "good");
    renderHud();
    if (state.revealed.length === q.a.length) endRound("cleared");
    return;
  }

  state.strikes++;
  const x = $("bigx");
  x.classList.remove("show"); void x.offsetWidth; x.classList.add("show");
  say(`"${guess}"? Not on the board.`, "bad");
  renderHud();
  if (state.strikes >= MAX_STRIKES) endRound("strikes");
}

function nextRound() {
  if (state.round === ROUNDS_PER_GAME - 1) {
    state.finished = true;
    if (state.score > loadBest()) saveBest(state.score);
    render();
    return;
  }
  state.round++;
  state.strikes = 0;
  state.revealed = [];
  state.roundDone = false;
  state.msg = null;
  render();
  say(multiplier() > 1 ? "Final round. Every answer counts double." : "Next question. Verify before you answer.", null);
  $("guess-input").focus();
}

/* ---------- Wiring ---------- */
$("guess-form").addEventListener("submit", e => {
  e.preventDefault();
  submitGuess($("guess-input").value);
  $("guess-input").value = "";
  $("guess-input").focus();
});
$("action-btn").addEventListener("click", () => state.roundDone ? nextRound() : endRound("gaveup"));
$("restart-btn").addEventListener("click", () => {
  state = newGame();
  render();
  say("New lot on the bench. Let's go.", null);
});

/* ---------- Boot ---------- */
state = newGame();
render();
say("Welcome to the floor. Type your best answer.", null);
