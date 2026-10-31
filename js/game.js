/* =========================================================
   GAME STATE
   ========================================================= */
let state;
const $ = id => document.getElementById(id);

function newGame() {
  const order = BANK.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, ROUNDS_PER_GAME);
  return { order, round: 0, score: 0, strikes: 0, revealed: [], roundDone: false, finished: false, msg: null, history: [] };
}
const current = () => BANK[state.order[state.round]];
const multiplier = () => state.round === ROUNDS_PER_GAME - 1 ? 2 : 1;
const maxPossible = () => state.order.reduce((sum, qi, r) =>
  sum + BANK[qi].a.reduce((s, a) => s + a[1], 0) * (r === ROUNDS_PER_GAME - 1 ? 2 : 1), 0);

function loadBest() { try { return Number(localStorage.getItem("qs-best")) || 0; } catch { return 0; } }
function saveBest(v) { try { localStorage.setItem("qs-best", String(v)); } catch {} }

/* Host poses: the host image swaps with each reaction (art in assets/host_*.webp) */
const POSES = ["point", "thumbs", "shock", "cheer", "crossed"];
POSES.forEach(p => { const i = new Image(); i.src = `assets/host_${p}.webp`; });   // preload
function setHost(pose) {
  const h = $("host"); if (!h || h.dataset.pose === pose) return;
  h.dataset.pose = pose; h.src = `assets/host_${pose}.webp`;
  h.classList.remove("pop"); void h.offsetWidth; h.classList.add("pop");
}

/* Host reaction: message on the podium screen + stamp/shake on the stage art */
function say(text, tone, pose) {
  setHost(pose || (tone === "good" ? "thumbs" : tone === "bad" ? "shock" : "point"));
  const b = $("bubble");
  b.textContent = text;
  b.className = "panel msg" + (tone ? " " + tone : "");
  const stage = $("stage");
  stage.classList.remove("good", "bad");
  void stage.offsetWidth;                // restart the animation
  if (tone) stage.classList.add(tone);
  $("react").textContent = tone === "bad" ? "✕" : "✓";
  state.msg = { text, tone, pose };
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
  $("stage").closest(".stagecol").hidden = fin;
  $("qpanel").hidden = fin;
  $("bubble").hidden = fin;
  if (fin) {
    const max = maxPossible(), pct = state.score / max, pass = pct >= 0.5;
    const RANKS = ["Trainee", "Inspector", "Quality Specialist", "Quality Champion", "MISTER QUALITY"];
    const clearedN = state.history.filter(h => h.cleared).length;
    let k = pct >= .85 ? 4 : pct >= .65 ? 3 : pct >= .5 ? 2 : pct >= .3 ? 1 : 0;
    if (k === 4 && clearedN < 3) k = 3;            // the top title also needs at least 3 full boards
    const best = loadBest();
    $("endhero").classList.toggle("rework", !pass);
    $("end-img").src = pass ? "assets/end_pass.webp" : "assets/end_rework.webp";
    $("end-img").alt = pass ? "Mister Quality celebrating at the podium" : "Mister Quality disappointed at the podium";
    $("final-stamp").textContent = pass ? "PASS" : "REWORK";
    $("final-sub").textContent = pass ? "Lot accepted · final inspection" : "Lot on hold · final inspection";
    $("rank-name").textContent = RANKS[k];
    $("ladder").innerHTML = RANKS.map((r, i) => `<span class="${i === k ? "on" : ""}">${r}</span>`).join("");
    $("final-score").textContent = state.score;
    $("final-note").textContent = state.score >= best && state.score > 0 ? "New best score!" : `Score · best ${best}`;
    $("final-pct").textContent = Math.round(pct * 100) + "%";
    const found = state.history.reduce((a, h) => a + h.found, 0), total = state.history.reduce((a, h) => a + h.total, 0);
    $("final-found").textContent = `${found}/${total}`;
    $("final-cleared").textContent = `${state.history.filter(h => h.cleared).length}/${ROUNDS_PER_GAME}`;
    const rc = $("recap"); rc.innerHTML = "";
    state.history.forEach(h => {
      const row = document.createElement("div"); row.className = "rq";
      const q = document.createElement("div"); q.className = "q"; q.textContent = h.q;
      const a = document.createElement("div"); a.className = "a" + (h.top ? "" : " ok"); a.textContent = h.top || "Board cleared ✓";
      const sc = document.createElement("div"); sc.className = "s"; sc.textContent = h.top ? h.topPts : "";
      row.append(q, a, sc); rc.appendChild(row);
    });
    renderHud();
    scrollTo(0, 0);
    return;
  }
  renderBoard();
  renderHud();
  if (state.msg) say(state.msg.text, state.msg.tone, state.msg.pose);
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
    cleared: ["Board cleared. That's what verified work looks like.", "good", "cheer"],
    strikes: ["Three strikes. Here's what the survey said.", "bad", "shock"],
    gaveup:  ["Fair call. Here's the rest of the board.", null, "crossed"]
  };
  say(...msgs[reason]);
  const q = current(), missed = q.a.map((a, i) => i).filter(i => !state.revealed.includes(i));
  state.history.push({ q: q.q, found: state.revealed.length, total: q.a.length, cleared: reason === "cleared",
    top: missed.length ? q.a[missed[0]][0] : null, topPts: missed.length ? q.a[missed[0]][1] : 0 });
  Sound.stopMusic();
  if (reason === "cleared") setTimeout(Sound.win, 450);   // let the last DING ring first
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
    if (t) { t.classList.add("open", "flash"); }
    Sound.ding();
    say(`Survey says… "${q.a[i][0]}"! +${pts}`, "good");
    renderHud();
    if (state.revealed.length === q.a.length) endRound("cleared");
    return;
  }

  state.strikes++;
  Sound.buzz();
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
    state.score / maxPossible() >= 0.5 ? Sound.win() : Sound.fail();
    return;
  }
  state.round++;
  state.strikes = 0;
  state.revealed = [];
  state.roundDone = false;
  state.msg = null;
  render();
  say(multiplier() > 1 ? "Final round. Every answer counts double." : "Next question. Verify before you answer.", null, multiplier() > 1 ? "crossed" : "point");
  if (multiplier() > 1) {
    // Final round: tension cue, then the loop comes back faster
    const len = Sound.tension();
    setTimeout(() => { if (!state.roundDone) Sound.startMusic({ tempo: 124 }); }, len * 1000);
  } else {
    Sound.startMusic();
  }
  focusAnswer();
}

/* On phones, don't pop the keyboard on its own (it would cover the board); when the player
   taps the answer box, scroll so the question and box sit at the top of what's left. */
const TOUCH = matchMedia("(pointer: coarse)").matches;
function focusAnswer() { if (!TOUCH) $("guess-input").focus(); }
$("guess-input").addEventListener("focus", () => {
  if (TOUCH && matchMedia("(orientation: portrait)").matches)
    setTimeout(() => $("qpanel").scrollIntoView({ block: "start", behavior: "smooth" }), 300);
});

/* ---------- Wiring ---------- */
$("guess-form").addEventListener("submit", e => {
  e.preventDefault();
  submitGuess($("guess-input").value);
  $("guess-input").value = "";
  $("guess-input").focus();          // keep the keyboard up between guesses
});
$("action-btn").addEventListener("click", () => state.roundDone ? nextRound() : endRound("gaveup"));
$("restart-btn").addEventListener("click", () => {
  state = newGame();
  render();
  say("New lot on the bench. Let's go.", null);
  Sound.startMusic();
});

/* ---------- Sound toggle ---------- */
function renderSoundBtn() {
  const m = Sound.isMuted();
  $("sound-btn").textContent = m ? "Sound off" : "Sound on";
  $("sound-btn").setAttribute("aria-pressed", String(!m));
}
$("sound-btn").addEventListener("click", () => {
  Sound.unlock();
  Sound.setMuted(!Sound.isMuted());
  renderSoundBtn();
});

/* ---------- Show open ----------
   Browsers only allow audio after a tap, so the show starts from a button.
   The intro plays, then the background loop starts under round 1. */
$("start-btn").addEventListener("click", () => {
  Sound.unlock();
  $("curtain").hidden = true;
  $("host").classList.remove("offstage");
  say("Round one. We surveyed 100 inspectors. Type your best answer.", null, "point");
  $("guess-input").disabled = false;
  $("guess-btn").disabled = false;
  const len = Sound.intro();
  setTimeout(() => { if (!state.roundDone && !state.finished) Sound.startMusic(); }, len * 1000);
  focusAnswer();
});

/* ---------- Boot ---------- */
state = newGame();
render();
say("Welcome to the floor. Type your best answer.", null);
renderSoundBtn();
$("guess-input").disabled = true;     // until the show starts
$("guess-btn").disabled = true;
