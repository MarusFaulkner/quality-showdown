/* =========================================================
   SOUND PACKAGE — original, synthesized live with the Web Audio API
   No audio files, so nothing to license and nothing to download.

   Public API (all safe to call before audio is unlocked; they no-op):
     Sound.unlock()         call from a user gesture (browsers require it)
     Sound.intro()          show open fanfare; returns its length in seconds
     Sound.ding()           answer revealed
     Sound.buzz()           strike
     Sound.tension()        rising cue into the final round; returns seconds
     Sound.win()            win sting (board cleared / PASS)
     Sound.fail()           "wah-wah" for a REWORK result
     Sound.startMusic(opts) low background loop; opts.tempo (bpm)
     Sound.stopMusic()      fade the loop out
     Sound.setMuted(bool) / Sound.isMuted()
   ========================================================= */
const Sound = (() => {
  const MUTE_KEY = "qs-muted";
  let ctx = null, master, sfxBus, musicBus;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch {}

  // Music scheduler state
  let musicOn = false, tempo = 108, nextNoteTime = 0, step = 0, timerId = null;

  /* ---------- Setup ---------- */
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;                    // very old browser: play silently
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      // Gentle compressor keeps stacked sounds from clipping on phone speakers
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master.connect(comp).connect(ctx.destination);
      sfxBus = gainNode(0.7, master);
      musicBus = gainNode(0.0, master);       // faded in by startMusic
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  const ready = () => ctx && ctx.state !== "closed";
  const now = () => ctx.currentTime;
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);   // MIDI note -> frequency

  function gainNode(value, dest) {
    const g = ctx.createGain();
    g.gain.value = value;
    if (dest) g.connect(dest);
    return g;
  }

  /* One enveloped oscillator note.
     o: { type, gain, attack, release, dest, detune, glideTo, filter } */
  function tone(freq, start, dur, o = {}) {
    const osc = ctx.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, start);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, start + dur);
    if (o.detune) osc.detune.value = o.detune;

    const env = ctx.createGain();
    const peak = o.gain ?? 0.3, a = o.attack ?? 0.005, r = o.release ?? 0.08;
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(peak, start + a);
    env.gain.setValueAtTime(peak, Math.max(start + a, start + dur - r));
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    let node = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = o.filter;
      node.connect(f);
      node = f;
    }
    node.connect(env).connect(o.dest || sfxBus);
    osc.start(start);
    osc.stop(start + dur + 0.05);
    return osc;
  }

  // Short filtered noise burst (hi-hats, swells)
  let noiseBuf = null;
  function noise(start, dur, o = {}) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.band ? "bandpass" : "highpass";
    f.frequency.value = o.freq || 7000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(o.swell ? 0.0001 : (o.gain ?? 0.1), start);
    if (o.swell) env.gain.exponentialRampToValueAtTime(o.gain ?? 0.1, start + dur * 0.95);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f).connect(env).connect(o.dest || sfxBus);
    src.start(start);
    src.stop(start + dur + 0.05);
  }

  // A "brass" note: two detuned saws through a lowpass
  function brass(midi, start, dur, gain = 0.12) {
    tone(hz(midi), start, dur, { type: "sawtooth", gain, attack: 0.02, release: 0.12, detune: -6, filter: 2200 });
    tone(hz(midi), start, dur, { type: "sawtooth", gain, attack: 0.02, release: 0.12, detune: 6, filter: 2200 });
  }

  /* ---------- Cues ---------- */

  // Intro: bright pickup run into a held big-band chord (C major, ~2.6s)
  function intro() {
    if (!ready()) return 0;
    const t = now() + 0.05, b = 0.14;                       // b = sixteenth-ish
    [67, 72, 76, 79].forEach((n, i) => brass(n, t + i * b, b * 0.9, 0.11));
    [76, 79].forEach((n, i) => brass(n, t + (4 + i) * b, b * 0.9, 0.11));
    const hold = t + 6 * b;
    [60, 64, 67, 72, 76].forEach(n => brass(n, hold, 1.6, 0.09));
    tone(hz(48), hold, 1.6, { type: "triangle", gain: 0.35, release: 0.5 });   // bass
    noise(hold, 1.2, { freq: 6000, gain: 0.06 });                              // cymbal
    [84, 88, 91].forEach((n, i) => tone(hz(n), hold + 0.6 + i * 0.07, 0.6, { gain: 0.05 })); // sparkle
    return 6 * b + 1.6;
  }

  // Ding: bell built from inharmonic partials, quick strike, long ring
  function ding() {
    if (!ready()) return;
    const t = now() + 0.01, f = hz(88);                     // E7-ish bell
    [[1, 0.28], [2.01, 0.12], [3.0, 0.06], [4.2, 0.04]].forEach(([ratio, g]) =>
      tone(f * ratio / 2, t, 1.3, { gain: g, attack: 0.002, release: 1.1 }));
    tone(hz(76), t, 0.25, { type: "triangle", gain: 0.1, release: 0.2 });       // body
  }

  // Buzz: harsh low square pair with tremolo, ~0.65s
  function buzz() {
    if (!ready()) return;
    const t = now() + 0.01, d = 0.65;
    const trem = ctx.createGain();
    trem.gain.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 28;
    const depth = gainNode(0.3);
    lfo.connect(depth).connect(trem.gain);
    trem.connect(sfxBus);
    [98, 103.5].forEach(f => tone(f, t, d, { type: "square", gain: 0.16, attack: 0.004, release: 0.06, filter: 1400, dest: trem }));
    tone(49, t, d, { type: "sawtooth", gain: 0.12, release: 0.06, filter: 600, dest: trem });
    lfo.start(t);
    lfo.stop(t + d + 0.05);
  }

  // Tension: rising sweep + accelerating drum pulses + swell, ends on a sub hit (~2.8s)
  function tension() {
    if (!ready()) return 0;
    const t = now() + 0.05, d = 2.6;
    tone(hz(45), t, d, { type: "sawtooth", gain: 0.1, attack: 0.3, release: 0.05, glideTo: hz(69), filter: 1800 });
    tone(hz(52), t, d, { type: "sawtooth", gain: 0.08, attack: 0.3, release: 0.05, glideTo: hz(76), filter: 1800 });
    noise(t, d, { swell: true, freq: 3000, gain: 0.08 });
    let p = 0, gap = 0.36;                                  // pulses speed up
    while (p < d - 0.1) {
      tone(hz(36), t + p, 0.18, { type: "sine", gain: 0.45, glideTo: hz(31), release: 0.12 });
      p += gap;
      gap = Math.max(0.08, gap * 0.82);
    }
    tone(hz(28), t + d, 0.9, { type: "sine", gain: 0.6, release: 0.7 });       // impact
    brass(60, t + d, 0.8, 0.08);
    brass(66, t + d, 0.8, 0.08);                                               // tritone stab
    return d + 0.3;
  }

  // Win: quick arpeggio up into a sparkling major chord (~1.8s)
  function win() {
    if (!ready()) return;
    const t = now() + 0.03, s = 0.09;
    [72, 76, 79, 84].forEach((n, i) => brass(n, t + i * s, s * 1.2, 0.1));
    const c = t + 4 * s;
    [72, 76, 79, 84, 88].forEach(n => brass(n, c, 1.3, 0.07));
    tone(hz(48), c, 1.3, { type: "triangle", gain: 0.35, release: 0.5 });
    noise(c, 1.0, { freq: 6500, gain: 0.07 });
    [96, 100, 103, 108].forEach((n, i) => tone(hz(n), c + 0.2 + i * 0.06, 0.4, { gain: 0.04 }));
  }

  // Fail: descending muted-trumpet "wah-wah-wah-waaah"
  function fail() {
    if (!ready()) return;
    const t = now() + 0.03;
    [[67, 0.35], [66, 0.35], [65, 0.35], [64, 1.0]].reduce((at, [n, d]) => {
      const o = tone(hz(n), at, d, { type: "sawtooth", gain: 0.12, attack: 0.04, release: 0.15, filter: 900 });
      if (d > 0.5) {                                        // vibrato on the last note
        const lfo = ctx.createOscillator(), dep = gainNode(6);
        lfo.frequency.value = 5;
        lfo.connect(dep).connect(o.frequency);
        lfo.start(at);
        lfo.stop(at + d);
      }
      return at + d;
    }, t);
  }

  /* ---------- Background music ----------
     A modern TV game-show "thinking" bed in A minor (Am – F – C – G): four-on-the-floor kick,
     clap, offbeat hats, straight driving bass, a wide sustained synth pad, and a soft
     16th-note arpeggio that joins on every other pass. No bouncy oom-pah bass or plucky
     major-key melody, so it reads as studio tension, not a carnival.
     Scheduled a little ahead of time so it stays steady. */
  const PROG = [                    // [bass root, pad chord] per bar
    [33, [57, 60, 64, 69]],         // Am
    [29, [57, 60, 65, 69]],         // F
    [36, [55, 60, 64, 67]],         // C
    [31, [55, 59, 62, 67]]          // G
  ];
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3];   // index into the pad chord, one per 16th (an octave up)
  const STEPS = 16 * 8;             // 8 bars: 4 bed, 4 bed + arpeggio

  function scheduleStep(i, time) {
    const s16 = 60 / tempo / 4, k = i % 16, barN = Math.floor(i / 16), bar = barN % 4, M = musicBus;
    const [root, chord] = PROG[bar];
    // kick on every beat, clap on 2 and 4, hats on the offbeat 8ths
    if (k % 4 === 0) tone(140, time, 0.18, { type: "sine", gain: 0.5, glideTo: 40, attack: 0.002, release: 0.12, dest: M });
    if (k === 4 || k === 12) noise(time, 0.12, { band: true, freq: 1700, gain: 0.1, dest: M });
    if (k % 4 === 2) noise(time, 0.04, { freq: 8000, gain: 0.045, dest: M });
    // snare build into the top of the loop
    if (barN === 7 && k >= 8) noise(time, 0.05, { band: true, freq: 2000, gain: 0.03 + (k - 8) * 0.008, dest: M });
    // straight 8th-note bass
    if (k % 2 === 0) tone(hz(root), time, s16 * 1.7, { type: "sawtooth", gain: 0.17, attack: 0.005, release: 0.06, filter: 480, dest: M });
    // sustained pad, one chord per bar
    if (k === 0) chord.forEach((n, j) => {
      const len = s16 * 16;
      tone(hz(n), time, len, { type: "sawtooth", gain: 0.022, attack: 0.25, release: 0.4, filter: 1100, detune: j % 2 ? 7 : -7, dest: M });
    });
    // soft arpeggio on the second pass
    if (i >= 64) tone(hz(chord[ARP[k % 8]] + 12), time, s16 * 0.8, { type: "triangle", gain: 0.05, attack: 0.004, release: 0.05, filter: 2800, dest: M });
    // swell at the top of each 8-bar pass
    if (i === 0) noise(time, 1.4, { freq: 5000, gain: 0.035, dest: M });
  }

  function scheduler() {
    while (nextNoteTime < now() + 0.12) {
      scheduleStep(step, nextNoteTime);
      nextNoteTime += 60 / tempo / 4;
      step = (step + 1) % STEPS;
    }
  }

  function startMusic(opts = {}) {
    if (!ready()) return;
    tempo = opts.tempo || 108;
    if (!musicOn) {
      musicOn = true;
      step = 0;
      nextNoteTime = now() + 0.05;
      timerId = setInterval(scheduler, 25);
    }
    musicBus.gain.cancelScheduledValues(now());
    musicBus.gain.setTargetAtTime(0.22, now(), 0.4);        // keep it low under the game
  }

  function stopMusic() {
    if (!ready() || !musicOn) return;
    musicBus.gain.cancelScheduledValues(now());
    musicBus.gain.setTargetAtTime(0, now(), 0.25);
    clearInterval(timerId);                                 // notes already queued finish under the fade
    musicOn = false;
  }

  /* ---------- Mute ---------- */
  function setMuted(m) {
    muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch {}
    if (ready()) {
      master.gain.cancelScheduledValues(now());
      master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05);
    }
  }

  return { unlock, intro, ding, buzz, tension, win, fail, startMusic, stopMusic, setMuted, isMuted: () => muted };
})();
