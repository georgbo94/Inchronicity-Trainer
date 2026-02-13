(() => {
  // ----------------- Helpers -----------------
  const $ = (id) => document.getElementById(id);
  const el = {
    countIn: $("countIn"),
    tempoToggle: $("tempoToggle"),
    tempoSwitch: $("tempoSwitch"),
    tempoTag: $("tempoTag"),
    tempoStatRow: $("tempoStatRow"),
    tempoDynRow: $("tempoDynRow"),
    bpmStat: $("bpmStat"),
    bpmStart: $("bpmStart"),
    bpmEnd: $("bpmEnd"),
    tempoBars: $("tempoBars"),
    tempoBarsLabel: $("tempoBarsLabel"),
    tempoCurve: $("tempoCurve"),

    sigBeats: $("sigBeats"),
    sigP: $("sigP"),
    swingPct: $("swingPct"),

    freeToggle: $("freeToggle"),
    freeSwitch: $("freeSwitch"),
    freeTag: $("freeTag"),
    freeRow: $("freeRow"),
    intrLen: $("intrLen"),

    randToggle: $("randToggle"),
    randSwitch: $("randSwitch"),
    randTag: $("randTag"),
    randLocal: $("randLocal"),
    randMute: $("randMute"),

    grid: $("grid"),
    hint: $("hint"),

    elongToggle: $("elongToggle"),
    elongSwitch: $("elongSwitch"),
    elongTag: $("elongTag"),
    elongStatRow: $("elongStatRow"),
    elongDynRow: $("elongDynRow"),
    elongStat: $("elongStat"),
    elongStatMode: $("elongStatMode"),
    elongFinal: $("elongFinal"),
    elongReps: $("elongReps"),

    elongGrowth: $("elongGrowth"),

    decToggle: $("decToggle"),
    decSwitch: $("decSwitch"),
    decTag: $("decTag"),
    decPatterns: $("decPatterns"),
warn: $("warn"),
    startBtn: $("startBtn"),
    bpmPill: $("bpmPill"),
    barPill: $("barPill"),  };

  const LS = {
    get(k, fallback=null){ try{ const v = localStorage.getItem(k); return v===null?fallback:JSON.parse(v);}catch{return fallback;} },
    set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }
  };

  function clampInt(v, lo, hi){ v = (v|0); return Math.max(lo, Math.min(hi, v)); }
  function clampFloat(v, lo, hi){ v = +v; if (!Number.isFinite(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  function mod(n, m){ return ((n % m) + m) % m; }
  function showWarn(msg){ el.warn.style.display = msg ? "block" : "none"; el.warn.textContent = msg || ""; }

  function nowIso(){ return new Date().toISOString().slice(11, 23); } // HH:MM:SS.mmm
  function logLine(s){}

  // ----------------- Pattern storage -----------------
  const patCache = new Map(); // key->Array(0/1) (stable ref)
  const patStoreKey = (k)=>`pattern:${k}`;
  const sigKey = (beats,p)=>`m:${beats}:${p}`;
  const lenKey = (L)=>`f:${L}`;

  function loadPattern(key, length){
    const existing = patCache.get(key);
    if (existing && existing.length === length) return existing;

    const raw = LS.get(patStoreKey(key), null);
    let arr;
    if (raw && Array.isArray(raw) && raw.length === length){
      arr = raw.map(x => x ? 1 : 0);
} else {
  // default patterns only when not stored yet:
  // - meter: hits on beats only
  // - free: first step only
  arr = new Array(length).fill(0);

  if (key.startsWith("m:")) {
    const parts = key.split(":"); // ["m", beats, p]
    const p = Math.max(1, parseInt(parts[2], 10) || 1);
    for (let i = 0; i < length; i += p) arr[i] = 1;
  } else {
    if (length > 0) arr[0] = 1;
  }

  LS.set(patStoreKey(key), arr);
}

    patCache.set(key, arr);
    return arr;
  }

  function savePattern(key){
    const arr = patCache.get(key);
    if (!arr) return;
    LS.set(patStoreKey(key), arr.map(x => x ? 1 : 0));
  }

  // ----------------- UI state -----------------
  const ui = {
    tempoMode: "stat",
    elongMode: "stat",
    free: false,
    decOn: false,
    randOn: false,

    barPillHidden: false,
    editKey: "",
    editArr: []
  };

  const committed = {
    bpmStat: 120,
    bpmStart: 120,
    bpmEnd: 160,
    tempoBars: 16,
    tempoCurve: "lin",
    swingPct: 50,

    randLocal: 1,
    randMute: 0
  };

  function readIntField(elem, fallback){
    const v = parseInt(elem.value, 10);
    return Number.isFinite(v) ? v : fallback;
  }

  function readFloatField(elem, fallback){
    const v = parseFloat(elem.value);
    return Number.isFinite(v) ? v : fallback;
  }

  // CHANGED: percent (0..100) in UI -> ratio (0..1) internal
  function commitRandLocalFromField(){
    const pct = clampInt(Math.round(readFloatField(el.randLocal, committed.randLocal * 100)), 0, 100);
    committed.randLocal = 1- pct / 100;
    el.randLocal.value = String(pct);
  }

  // CHANGED: percent (0..100) in UI -> ratio (0..1) internal
  function commitRandMuteFromField(){
    const pct = clampInt(Math.round(readFloatField(el.randMute, committed.randMute * 100)), 0, 100);
    committed.randMute = pct / 100;
    el.randMute.value = String(pct);
  }

  function commitSwingFromField(){
    const v = clampInt(readIntField(el.swingPct, committed.swingPct), 10, 90);
    committed.swingPct = v;
    el.swingPct.value = String(v);
  }

  function commitBpmStatFromField(){
    const v = clampInt(readIntField(el.bpmStat, Math.round(committed.bpmStat)), 20, 400);
    committed.bpmStat = v;
    el.bpmStat.value = String(v);
  }

  function commitBpmStartFromField(){
    const v = clampInt(readIntField(el.bpmStart, Math.round(committed.bpmStart)), 20, 400);
    committed.bpmStart = v;
    el.bpmStart.value = String(v);
  }

  function commitBpmEndFromField(){
    const v = clampInt(readIntField(el.bpmEnd, Math.round(committed.bpmEnd)), 20, 400);
    committed.bpmEnd = v;
    el.bpmEnd.value = String(v);
  }

  function commitTempoBarsFromField(){
    const v = clampInt(readIntField(el.tempoBars, committed.tempoBars), 1, 512);
    committed.tempoBars = v;
    el.tempoBars.value = String(v);
  }

  function commitTempoCurveFromField(){
    const v = el.tempoCurve.value === "exp" ? "exp" : "lin";
    committed.tempoCurve = v;
    el.tempoCurve.value = v;
  }

  function syncCommittedFromDom(){
    commitBpmStatFromField();
    commitBpmStartFromField();
    commitBpmEndFromField();
    commitTempoBarsFromField();
    commitTempoCurveFromField();
    commitSwingFromField();
    commitRandLocalFromField();
    commitRandMuteFromField();
  }

  function setBpmStatFromCurrent(bpm){
    const v = clampFloat(bpm, 20, 400);
    committed.bpmStat = v; // may be fractional (for seamless mode switching)
    el.bpmStat.value = String(Math.round(v));
  }

  function setBpmStartFromCurrent(bpm){
    const v = clampFloat(bpm, 20, 400);
    committed.bpmStart = v; // may be fractional (for seamless mode switching)
    el.bpmStart.value = String(Math.round(v));
  }

function setToggleVisual(sw, tagEl, onLabel, offLabel, on){
    sw.classList.toggle("on", !!on);
    tagEl.innerHTML = on ? `<strong>${onLabel}</strong>` : `<strong>${offLabel}</strong>`;
  }

function updateBarPillHidden(){
  if (!el.barPill) return;
  el.barPill.textContent = ui.barPillHidden ? "—" : el.barPill.textContent;
}

  function setTempoMode(mode){
    ui.tempoMode = mode;
    const isDyn = mode === "dyn";
    setToggleVisual(el.tempoSwitch, el.tempoTag, "Dyn.", "Stat.", isDyn);
    el.tempoDynRow.style.display = isDyn ? "" : "none";
    el.tempoStatRow.style.display = isDyn ? "none" : "";
  }

  function currentTempoForModeSwap(){
    if (eng.running) return readBpmNow();
    return ui.tempoMode === "dyn" ? committed.bpmStart : committed.bpmStat;
  }

function toggleTempoModeCarry(){
    const current = clampFloat(currentTempoForModeSwap(), 20, 400);

    if (ui.tempoMode === "stat"){
      // Stat → Dyn: set dyn start so tempo doesn't jump
      setBpmStartFromCurrent(current);
      setTempoMode("dyn");

      if (eng.running){
        tempoDynRetargetFromValue(current);
      }
    } else {
      // Dyn → Stat: snapshot current tempo (may be fractional internally)
      setBpmStatFromCurrent(current);
      setTempoMode("stat");
    }

    persistSettings();
  }

  function setElongMode(mode){
    const wasDyn = ui.elongMode === "dyn";
    ui.elongMode = mode;

    eng.elongBlockedIncreasePending = false;
    eng.elongBlockedIncreaseUsed = false;
    const isDyn = mode === "dyn";
    setToggleVisual(el.elongSwitch, el.elongTag, "Dyn.", "Stat.", isDyn);
    el.elongDynRow.style.display = isDyn ? "" : "none";
    el.elongStatRow.style.display = isDyn ? "none" : "";
    const hideBars = isDyn;

// Dynamic elongation: re-activation resets at the next pattern boundary.
    if (isDyn && !wasDyn){
      if (eng.running){
        eng.elongDynResetPending = true;
      } else {
        eng.elongDynCycleBase = 0;
        eng.elongDynResetPending = false;
      }
    }
  }

  function setFree(on){
    ui.free = !!on;
    setToggleVisual(el.freeSwitch, el.freeTag, "Free", "Sig.", ui.free);
    el.freeRow.style.display = ui.free ? "" : "none";
    setEditContext();
    persistSettings();
  }

  function setDec(on){
    ui.decOn = !!on;
    setToggleVisual(el.decSwitch, el.decTag, "On", "Off", ui.decOn);
    persistSettings();
  }

  function setRand(on, doPersist=true){
    ui.randOn = !!on;
    setToggleVisual(el.randSwitch, el.randTag, "On", "Off", ui.randOn);
    if (doPersist) persistSettings();
  }

  function uiSig(){
    return {
      beats: clampInt(+el.sigBeats.value, 1, 32),
      p: clampInt(+el.sigP.value, 1, 16),
      swingPct: committed.swingPct
    };
  }
  function barLenFromSig(sig){ return sig.beats * sig.p; }

  function uiPrimitiveLen(){
    if (ui.free) return clampInt(+el.intrLen.value, 1, 2048);
    return barLenFromSig(uiSig());
  }

  function uiPatternKey(){
    if (ui.free) return `f:${uiPrimitiveLen()}`;
    const sig = uiSig();
    return `m:${sig.beats}:${sig.p}`;
  }

  function shouldShowBeatMarks(){ return !ui.free; }

  function renderGrid(){
    const L = ui.editArr.length;
    el.grid.innerHTML = "";
    for (let i=0;i<L;i++){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cell" + (ui.editArr[i] ? " on" : "");
      b.dataset.i = String(i);

      if (shouldShowBeatMarks()){
        const p = uiSig().p;
        if (i % p === 0){
          const m = document.createElement("div");
          m.className = "beatMark";
          b.appendChild(m);
        }
      }
      el.grid.appendChild(b);
    }
  }

  // swipe painting (mouse + touch)
  let painting = false;
  let paintValue = 1;
  let lastIdx = -1;

  function cellAtPoint(x, y){
    const t = document.elementFromPoint(x, y);
    return t ? t.closest?.(".cell") : null;
  }

  function startPaint(ev){
    const cell = ev.target.closest?.(".cell");
    if (!cell) return;
    ev.preventDefault();

    const idx = +cell.dataset.i;
    paintValue = ui.editArr[idx] ? 0 : 1;
    setCell(idx, paintValue);
    painting = true;
    lastIdx = idx;

    el.grid.setPointerCapture?.(ev.pointerId);
  }

  function movePaint(ev){
    if (!painting) return;

    // safety: if mouse button released, stop
    if (ev.pointerType === "mouse" && (ev.buttons & 1) === 0){
      painting = false;
      lastIdx = -1;
      return;
    }

    const cell = cellAtPoint(ev.clientX, ev.clientY);
    if (!cell) return;
    const idx = +cell.dataset.i;
    if (idx === lastIdx) return;
    setCell(idx, paintValue);
    lastIdx = idx;
  }

  function endPaint(ev){
    if (!painting) return;
    painting = false;
    lastIdx = -1;
    try{ el.grid.releasePointerCapture?.(ev.pointerId); }catch{}
  }

  el.grid.addEventListener("pointerdown", startPaint);
  el.grid.addEventListener("pointermove", movePaint);
  el.grid.addEventListener("pointerup", endPaint);
  el.grid.addEventListener("pointercancel", endPaint);

  function setCell(i, v){
    v = v ? 1 : 0;
    if (ui.editArr[i] === v) return;
    ui.editArr[i] = v;
    savePattern(ui.editKey);
    const cell = el.grid.querySelector(`.cell[data-i="${i}"]`);
    if (cell) cell.classList.toggle("on", !!v);
  }

  function setEditContext(){
    ui.editKey = uiPatternKey();
    const L = uiPrimitiveLen();
    ui.editArr = loadPattern(ui.editKey, L);
    renderGrid();
  }

  function swingRatioFromPct(pct){
    pct = clampInt(pct, 10, 90);
    if (pct === 33 || pct === 34) return 1/3;
    if (pct === 66 || pct === 67) return 3/4;
    return pct / 100;
  }

  // ----------------- Decrescendo (pure functions) -----------------
  function countOn(arr){
    let H = 0;
    for (let i=0;i<arr.length;i++) if (arr[i]) H += 1;
    return H;
  }

function dbToAmp(db){
    return Math.pow(10, db/20);
  }

  // -------- Decrescendo (hits-only) --------
  const DEC_END_DB = -60; // last hit ~ -60 dB (~0.001 amp)

function decComputeForHit(idx, total){
  total = Math.max(1, total|0);
  idx = Math.max(0, idx|0);
  if (total <= 1) return { amp: 1, total, idx: 0, t: 0 };

  const t = clamp01(idx / total);

  const db = DEC_END_DB * t;
  const amp = clamp01(dbToAmp(db));
  return { amp, total, idx, t };
}

  // ----------------- Engine -----------------

  const eng = {
    running:false,
    ctx:null,
    master:null,
    lookahead:0.12,
    timer:null,
    nextTime:0,

    barIndex:1,
    barDisplay:0,
    barEvents:[],
    subInBar:0,
    beatInBar:0,
    subInBeat:0,

    sigBeats:4,
    sigP:2,

    freeActive:false,
    key:"",
    primitiveLen:8,
    arr:[],
    phase:0,
    cycleCount:0,
    elongDynCycleBase:0,
    elongDynResetPending:false,

    // decrescendo (hits-only)
    decN:1,
    decLatchedH:0,
    decTotalHits:1,
    decHitIndex:0,
    decRandOnLatched:false,
    decMuteLatched:0,

    // run-state
    patternActive:false,

    // elongation
    elongK:1,
    elongApply:"stretch",

    elongBlockedIncreasePending:false,
    elongBlockedIncreaseUsed:false,

    tempoDynBarCounter:0,

    // dynamic tempo engine state (jump-free retarget)
    tempoDynStartBpm:120,
    tempoDynGoalBpm:160,
    tempoDynBars:16,
    tempoDynCurve:"lin",

    countingIn:false,
    countInRemaining:0,
    pendingInitAtBeat:false,

    lastBpm:120
  };

  function ensureAudio(){
    if (eng.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.9;

    // iOS PWA lock-screen stability: route WebAudio through a media element
    const dest = ctx.createMediaStreamDestination();
    master.connect(dest);

    const audioEl = document.createElement("audio");
    audioEl.srcObject = dest.stream;
    audioEl.autoplay = true;
    audioEl.loop = true;
    audioEl.playsInline = true;
    audioEl.setAttribute("playsinline", "");
    audioEl.style.display = "none";
    document.body.appendChild(audioEl);

    audioEl.play().catch(()=>{});

    eng.ctx = ctx;
    eng.master = master;
    eng.mediaAudio = audioEl;
  }

  // iOS can suspend audio on lock/background; try to resume when returning
  document.addEventListener("visibilitychange", () => {
    if (!eng.running) return;
    if (eng.ctx && eng.ctx.state !== "running") {
      eng.ctx.resume().catch(()=>{});
    }
    eng.mediaAudio?.play?.().catch(()=>{});
  });

  // Sounds (exactly two)
  function countInSound(time, strong=false){
    const ctx = eng.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1400, time);

    const peak = strong ? 1.15 : 0.85;
    const len  = strong ? 0.09 : 0.05;
    const stopLen = strong ? 0.11 : 0.06;

    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, time + len);
    o.connect(g); g.connect(eng.master);
    o.start(time); o.stop(time + stopLen);
  }

  function patternSound(time, amp){
    const ctx = eng.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(1000, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, amp), time + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
    o.connect(g); g.connect(eng.master);
    o.start(time); o.stop(time + 0.04);
  }

  function scheduleBarChange(time, bar){
    eng.barEvents.push({ t: time, bar: bar|0 });
  }
  function updateBarDisplay(now){
    while (eng.barEvents.length && now + 0.0005 >= eng.barEvents[0].t){
      eng.barDisplay = eng.barEvents.shift().bar;
    }
  }

function tempoCfgHash(){
    if (ui.tempoMode === "stat"){
      const s = clampFloat(committed.bpmStat, 20, 400);
      return `stat:${s.toFixed(6)}`;
    }
    const start = clampFloat(committed.bpmStart, 20, 400);
    const end   = clampFloat(committed.bpmEnd, 20, 400);
    const bars  = clampInt(committed.tempoBars, 1, 512);
    const curve = committed.tempoCurve === "exp" ? "exp" : "lin";
    return `dyn:${start.toFixed(6)}:${end.toFixed(6)}:${bars}:${curve}`;
  }

  function tempoDynInitForRun(){
    eng.tempoDynBars = clampInt(committed.tempoBars, 1, 512);
    eng.tempoDynCurve = committed.tempoCurve === "exp" ? "exp" : "lin";
    eng.tempoDynGoalBpm  = clampFloat(committed.bpmEnd, 20, 400);
    eng.tempoDynBarCounter = 0;
  }

  function tempoDynRetargetFromValue(currentBpm){
    const goal = clampFloat(committed.bpmEnd, 20, 400);
    const bars = clampInt(committed.tempoBars, 1, 512);
    const curve = committed.tempoCurve === "exp" ? "exp" : "lin";

    const subPerBar = Math.max(1, eng.sigBeats * eng.sigP);
    const barPos = eng.patternActive ? (eng.subInBar / subPerBar) : 0;

    eng.tempoDynStartBpm = clampFloat(currentBpm, 20, 400);
    eng.tempoDynGoalBpm  = goal;
    eng.tempoDynBars = bars;
    eng.tempoDynCurve = curve;
    eng.tempoDynBarCounter = -barPos;
  }

  function tempoDynRetargetNow(){
    const current = clampFloat(readBpmNow(), 20, 400);
    tempoDynRetargetFromValue(current);
  }

function readBpmNow(){
    if (ui.tempoMode === "stat"){
      return clampFloat(committed.bpmStat, 20, 400);
    }

    if (!eng.running){
      return clampFloat(committed.bpmStart, 20, 400);
    }

    const start = clampFloat((Number.isFinite(eng.tempoDynStartBpm) ? eng.tempoDynStartBpm : committed.bpmStart), 20, 400);
    const end   = clampFloat((Number.isFinite(eng.tempoDynGoalBpm) ? eng.tempoDynGoalBpm : committed.bpmEnd), 20, 400);
    const bars  = clampInt((Number.isFinite(eng.tempoDynBars) ? eng.tempoDynBars : committed.tempoBars), 1, 512);
    const curve = (eng.tempoDynCurve === "exp") ? "exp" : "lin";

    const subPerBar = Math.max(1, eng.sigBeats * eng.sigP);
    const barPos = eng.patternActive ? (eng.subInBar / subPerBar) : 0;

    const t = (eng.tempoDynBarCounter + barPos) / bars;
    const tt = clamp01(t);

    const g = (curve === "exp")
      ? (tt <= 0 ? 0 : tt >= 1 ? 1 : (Math.exp(3*tt)-1)/(Math.exp(3)-1))
      : tt;

    return start + (end - start) * g;
  }

  function subdivisionDurationSec(){
    const bpm = readBpmNow();
    eng.lastBpm = bpm;
    const beatDur = 60 / bpm;

    const r = swingRatioFromPct(committed.swingPct);
    const p = eng.sigP;

    if (p === 1) return beatDur;
    if (p % 2 === 0){
      const pairCount = p / 2;
      const pairDur = beatDur / pairCount;
      const subInPair = eng.subInBeat % 2;
      return subInPair === 0 ? pairDur * r : pairDur * (1 - r);
    }
    return beatDur / p;
  }

  function parseElongModeFromUI(){
    const v = (el.elongGrowth && el.elongGrowth.value) ? String(el.elongGrowth.value) : "stretch_x2";
    if (v === "stretch_p1") return { apply: "stretch", growth: "p1" };
    if (v === "fill_x2")    return { apply: "fill",    growth: "x2" };
    if (v === "fill_p1")    return { apply: "fill",    growth: "p1" };
    return { apply: "stretch", growth: "x2" };
  }

  function computeElongInfoForStep(step, final){
    step = Math.max(0, step|0);
    final = clampInt(final, 1, 64);
    const spec = parseElongModeFromUI();

    if (spec.growth === "p1"){
      const raw = 1 + step;
      const maxAllowed = final;
      const k = Math.min(maxAllowed, Math.max(1, raw));
      return { k, raw, maxAllowed, apply: spec.apply };
    }

    const maxPow = Math.pow(2, Math.floor(Math.log2(final)));
    const raw = Math.pow(2, step);
    const k = Math.min(maxPow, Math.max(1, raw));
    return { k, raw, maxAllowed: maxPow, apply: spec.apply };
  }

  function computeElongNextInfo(){
    const spec = parseElongModeFromUI();

    if (ui.elongMode === "stat"){
      const k = clampInt(+el.elongStat.value, 1, 64);
      const apply = (el.elongStatMode.value === "fill") ? "fill" : "stretch";
      return { k, raw: k, maxAllowed: k, apply };
    }

    const final = clampInt(+el.elongFinal.value, 1, 64);
    const reps  = clampInt(+el.elongReps.value, 1, 256);
    const cycles = Math.max(0, eng.cycleCount - (eng.elongDynCycleBase|0));
    const step = Math.floor(cycles / reps);
    return computeElongInfoForStep(step, final);
  }

  function latchDecrescendoAtBoundary(reason="boundary"){
    const uiN = clampInt(+el.decPatterns.value, 1, 64);
    const H = Math.max(0, countOn(eng.arr)|0);

    const uiOn = !!ui.decOn;

    const randOn = !!ui.randOn;
    const muteP = randOn ? clamp01(committed.randMute) : 0;

    const baseH = Math.max(1, H);
    const scale = randOn ? (1 - muteP) : 1;
    const totalHits = Math.max(1, Math.round(uiN * baseH * scale));

    const needReset =
      (uiN !== eng.decN) ||
      (H !== eng.decLatchedH) ||
      (randOn !== eng.decRandOnLatched) ||
      (muteP !== eng.decMuteLatched);

    const needOn = (uiOn !== eng.decOnLatched);

    if (needReset){
      eng.decN = uiN;
      eng.decLatchedH = H;
      eng.decRandOnLatched = randOn;
      eng.decMuteLatched = muteP;
      eng.decTotalHits = totalHits;
      eng.decHitIndex = 0;
    }

    if (needOn){
      eng.decOnLatched = uiOn;
    }
  }

  function applyPrimitiveFromUI(){
    if (eng.freeActive){
      const L = clampInt(+el.intrLen.value, 1, 2048);
      eng.primitiveLen = L;
      eng.key = `f:${L}`;
      eng.arr = loadPattern(eng.key, L);
    } else {
      const sig = uiSig();
      const L = barLenFromSig(sig);
      eng.primitiveLen = L;
      eng.key = `m:${sig.beats}:${sig.p}`;
      eng.arr = loadPattern(eng.key, L);
    }
    eng.phase = 0;
    eng.cycleCount = 0;
    eng.elongDynCycleBase = 0;
    eng.elongDynResetPending = false;

    const _ei = computeElongNextInfo();
    eng.elongK = _ei.k;
    eng.elongApply = _ei.apply;
    latchDecrescendoAtBoundary("init");

    eng.elongBlockedIncreasePending = false;
    eng.elongBlockedIncreaseUsed = false;
  }

  function initRunNow(){
    const sig = uiSig();
    eng.sigBeats = sig.beats;
    eng.sigP = sig.p;

    eng.barIndex = 1;
    eng.subInBar = 0;
    eng.beatInBar = 0;
    eng.subInBeat = 0;

    eng.freeActive = ui.free;

    if (ui.tempoMode === "dyn"){
      tempoDynInitForRun();
    } else {
      eng.tempoDynBarCounter = 0;
    }

    applyPrimitiveFromUI();
  }

  function onBarEnd(){
    eng.subInBar = 0;
    eng.beatInBar = 0;
    eng.subInBeat = 0;
    eng.barIndex += 1;

    scheduleBarChange(eng.nextTime, eng.barIndex);

    const prevBeats = eng.sigBeats;
    const prevP = eng.sigP;

    const sig = uiSig();
    eng.sigBeats = sig.beats;
    eng.sigP = sig.p;

    if (ui.tempoMode === "dyn" && eng.patternActive){
      const bars = clampInt((Number.isFinite(eng.tempoDynBars) ? eng.tempoDynBars : committed.tempoBars), 1, 512);
      if (eng.tempoDynBarCounter < bars) eng.tempoDynBarCounter = Math.min(bars, eng.tempoDynBarCounter + 1);
    }

    if (eng.freeActive && !ui.free){
      eng.freeActive = false;
      applyPrimitiveFromUI();
      return;
    }

    if (!eng.freeActive){
      const sigChanged = (prevBeats !== eng.sigBeats) || (prevP !== eng.sigP);
      if (sigChanged){
        applyPrimitiveFromUI();
      }
    }
  }

  function onPatternEnd(){
    eng.phase = 0;
    eng.cycleCount += 1;

    if (eng.elongDynResetPending && ui.elongMode === "dyn"){
      eng.elongDynCycleBase = eng.cycleCount;
      eng.elongDynResetPending = false;
    }

    if (!eng.freeActive && ui.free){
      eng.freeActive = true;
      applyPrimitiveFromUI();
      return;
    }

    if (eng.freeActive){
      const desiredL = clampInt(+el.intrLen.value, 1, 2048);
      if (desiredL !== eng.primitiveLen){
        applyPrimitiveFromUI();
        return;
      }
      const oldK = eng.elongK;
      const oldApply = eng.elongApply;
      const _ei = computeElongNextInfo();
      const newK = _ei.k;
      const newApply = _ei.apply;

      if (ui.elongMode === "dyn" && !eng.elongBlockedIncreaseUsed){
        if (oldK === _ei.maxAllowed && _ei.raw > _ei.maxAllowed){
          eng.elongBlockedIncreasePending = true;
        }
      }

      if (newK !== oldK || newApply !== oldApply){
        eng.elongBlockedIncreasePending = false;
        eng.elongBlockedIncreaseUsed = false;
      }

      eng.elongK = newK;
      eng.elongApply = newApply;
      latchDecrescendoAtBoundary("boundary");
      return;
    }

    const oldK = eng.elongK;
    const oldApply = eng.elongApply;
    const _ei = computeElongNextInfo();
    const newK = _ei.k;
    const newApply = _ei.apply;

    if (ui.elongMode === "dyn" && !eng.elongBlockedIncreaseUsed){
      if (oldK === _ei.maxAllowed && _ei.raw > _ei.maxAllowed){
        eng.elongBlockedIncreasePending = true;
      }
    }

    if (newK !== oldK || newApply !== oldApply){
      eng.elongBlockedIncreasePending = false;
      eng.elongBlockedIncreaseUsed = false;
    }

    eng.elongK = newK;
    eng.elongApply = newApply;
    latchDecrescendoAtBoundary("boundary");
  }

  // Randomize: discrete Laplace with P(shift=0)=local (ℓ).
  // If ℓ < 0.01: uniform read across the whole cycle (show ∞).
  function phaseReadForRandomize(phase, effLen){
    if (!ui.randOn) return phase;

    let l = clampFloat(committed.randLocal, 0, 1);
    if (l < 0.01){
      return (Math.random() * effLen) | 0;
    }

    // exact 0 shift with probability l
    if (Math.random() < l) return phase;

    const q = (1 - l) / (1 + l); // in (0,1)
    const U = Math.max(Number.MIN_VALUE, Math.random());
    const g = Math.floor(Math.log(U) / Math.log(q)); // geometric with P(g=t)=(1-q)q^t
    const m = 1 + (g|0);
    const sign = (Math.random() < 0.5) ? -1 : 1;
    const shift = sign * m;
    return mod(phase + shift, effLen);
  }

  function shouldMuteThisEvent(){
    if (!ui.randOn) return false;
    const p = clamp01(committed.randMute);
    if (p <= 0) return false;
    if (p >= 1) return true;
    return Math.random() < p;
  }

  function schedulePatternEvent(time){
    const n = Math.max(1, eng.elongK);
    const apply = (eng.elongApply === "fill") ? "fill" : "stretch";
    const effLen = Math.max(1, eng.primitiveLen * n);

    if (ui.elongMode === "dyn" &&
        eng.elongBlockedIncreasePending &&
        !eng.elongBlockedIncreaseUsed &&
        eng.phase === 0){
      eng.elongBlockedIncreasePending = false;
      eng.elongBlockedIncreaseUsed = true;
    }

    const phaseRead = phaseReadForRandomize(eng.phase, effLen);

    let baseIndex = 0;
    let isStepStart = true;

    if (apply === "fill"){
      baseIndex = phaseRead;
      if (baseIndex < 0 || baseIndex >= eng.primitiveLen) return;
      isStepStart = true;
    } else {
      baseIndex = Math.floor(phaseRead / n);
      isStepStart = (phaseRead % n) === 0;
      if (!isStepStart) return;
      if (baseIndex < 0 || baseIndex >= eng.primitiveLen) return;
    }

    if (!eng.arr[baseIndex]) return;

    // Mute (only when Randomize is ON): after shifted index read, before playing.
    if (shouldMuteThisEvent()) return;

    let dec = { amp: 1, total: 1, idx: 0, t: 0 };
    if (eng.decOnLatched){
      dec = decComputeForHit(eng.decHitIndex, eng.decTotalHits);
    }

    const scaled = 0.75 * dec.amp;
    patternSound(time, scaled);

    if (eng.decOnLatched){
      eng.decHitIndex += 1;
      if (eng.decHitIndex >= eng.decTotalHits){
        eng.decHitIndex = 0;
      }
    }
  }

  function advanceCounters(){
    if (eng.patternActive){
      eng.phase += 1;
      const effLen = eng.primitiveLen * Math.max(1, eng.elongK);
      if (eng.phase >= effLen){
        onPatternEnd();
      }
    }

    eng.subInBeat += 1;
    eng.subInBar += 1;

    if (eng.subInBeat >= eng.sigP){
      eng.subInBeat = 0;
      eng.beatInBar += 1;
    }

    const subPerBar = Math.max(1, eng.sigBeats * eng.sigP);
    if (eng.subInBar >= subPerBar){
      onBarEnd();
    }
  }

  function scheduler(){
    if (!eng.running) return;
    const ctx = eng.ctx;

    while (eng.nextTime < ctx.currentTime + eng.lookahead){
      if (eng.pendingInitAtBeat && eng.subInBeat === 0){
        eng.pendingInitAtBeat = false;
        initRunNow();
        eng.patternActive = true;
        scheduleBarChange(eng.nextTime, 1);
      }

      if (eng.countingIn){
        if (eng.subInBeat === 0){
          countInSound(eng.nextTime);
          eng.countInRemaining -= 1;

          if (eng.countInRemaining <= 0){
            eng.countingIn = false;
            eng.patternActive = false;
            eng.pendingInitAtBeat = true;
          }
        }
      } else if (eng.patternActive){
        schedulePatternEvent(eng.nextTime);
      }

      const dt = subdivisionDurationSec();
      eng.nextTime += dt;
      advanceCounters();
    }

    if ((scheduler._uiT || 0) < performance.now()){
      scheduler._uiT = performance.now() + 20;
      el.bpmPill.textContent = `BPM ${Math.round(eng.lastBpm)}`;
      updateBarDisplay(ctx.currentTime);
if (!ui.barPillHidden){
  el.barPill.textContent =
    (eng.countingIn || eng.pendingInitAtBeat || (eng.patternActive && eng.barDisplay === 0))
      ? "Count-in"
      : (eng.barDisplay > 0
          ? (ui.elongMode === "dyn"
              ? `Factor: ${Math.max(1, eng.elongK|0)} / Bar: ${eng.barDisplay}`
              : `Bar ${eng.barDisplay}`)
          : "—");
}    }

    eng.timer = setTimeout(scheduler, 25);
  }

  function start(){
    ensureAudio();
    if (eng.ctx.state === "suspended") eng.ctx.resume();

    eng.barDisplay = 0;
    eng.barEvents = [];

    eng.running = true;
    el.startBtn.textContent = "Stop";
    el.barPill.classList.remove("muted");

    const sig = uiSig();
    eng.sigBeats = sig.beats;
    eng.sigP = sig.p;

    if (ui.tempoMode === "dyn"){
      eng.tempoDynStartBpm = clampFloat(committed.bpmStart, 20, 400);
      tempoDynInitForRun();
      eng.lastBpm = eng.tempoDynStartBpm;
    } else {
      eng.lastBpm = clampFloat(committed.bpmStat, 20, 400);
    }
    el.bpmPill.textContent = `BPM ${Math.round(eng.lastBpm)}`;

    eng.barIndex = 1;
    eng.subInBar = 0;
    eng.beatInBar = 0;
    eng.subInBeat = 0;

    eng.phase = 0;
    eng.cycleCount = 0;
    eng.elongK = 1;

    eng.elongBlockedIncreasePending = false;
    eng.elongBlockedIncreaseUsed = false;

    eng.decHitIndex = 0;
    eng.decTotalHits = 1;
    eng.decLatchedH = 0;
    eng.decN = clampInt(+el.decPatterns.value, 1, 64);

    eng.patternActive = false;
    eng.pendingInitAtBeat = false;

    const n = clampInt(+el.countIn.value, 0, 64);
    eng.countInRemaining = n;
    eng.countingIn = n > 0;

    if (eng.countingIn){
      eng.pendingInitAtBeat = false;
    } else {
      eng.pendingInitAtBeat = true;
    }

    eng.nextTime = eng.ctx.currentTime + 0.06;    scheduler();
  }

  function stop(){
    eng.running = false;
    clearTimeout(eng.timer);
    eng.timer = null;
    eng.barDisplay = 0;
    eng.barEvents = [];
    el.startBtn.textContent = "Start";
    el.barPill.textContent = "—";
    el.barPill.classList.add("muted");  }

  // ----------------- Persistence -----------------
  function persistSettings(){
    const s = {
      tempoMode: ui.tempoMode,
      elongMode: ui.elongMode,
      free: ui.free,
      decOn: ui.decOn,

      randOn: ui.randOn,
      randPct: true,               // CHANGED: marks that randLocal/randMute are stored as percent
      randLocal: +el.randLocal.value,
      randMute: +el.randMute.value,

      countIn: +el.countIn.value,

      bpmStat: +el.bpmStat.value,
      bpmStart: +el.bpmStart.value,
      bpmEnd: +el.bpmEnd.value,
      tempoBars: +el.tempoBars.value,
      tempoCurve: el.tempoCurve.value,

      sigBeats: +el.sigBeats.value,
      sigP: +el.sigP.value,
      swingPct: +el.swingPct.value,

      intrLen: +el.intrLen.value,

      elongStat: +el.elongStat.value,
      elongStatMode: el.elongStatMode ? el.elongStatMode.value : "stretch",
      elongFinal: +el.elongFinal.value,
      elongReps: +el.elongReps.value,
      elongGrowth: el.elongGrowth ? el.elongGrowth.value : "stretch_x2",

      decPatterns: +el.decPatterns.value,
    };
    LS.set("settings_v2", s);
  }

  function restoreSettings(){
    const s = LS.get("settings_v2", null);
    if (!s) return;

    const setNum = (elem, v, lo, hi) => { if (v!=null) elem.value = String(clampInt(v,lo,hi)); };
    if (s.tempoMode) setTempoMode(s.tempoMode);
    if (s.elongMode) setElongMode(s.elongMode);
    if (s.decOn != null){ ui.decOn = !!s.decOn; setToggleVisual(el.decSwitch, el.decTag, "On", "Off", ui.decOn); }

    if (s.randOn != null){ ui.randOn = !!s.randOn; setToggleVisual(el.randSwitch, el.randTag, "On", "Off", ui.randOn); }

    // CHANGED: accept old saves (0..1) and new saves (0..100) via randPct flag
    const isPct = !!s.randPct;
    if (s.randLocal != null){
      const raw = clampFloat(s.randLocal, 0, isPct ? 100 : 1);
      const pct = isPct ? raw : (raw * 100);
      el.randLocal.value = String(clampInt(Math.round(pct), 0, 100));
    }
    if (s.randMute != null){
      const raw = clampFloat(s.randMute, 0, isPct ? 100 : 1);
      const pct = isPct ? raw : (raw * 100);
      el.randMute.value = String(clampInt(Math.round(pct), 0, 100));
    }

    setNum(el.countIn, s.countIn, 0, 64);

    setNum(el.bpmStat, s.bpmStat, 20, 400);
    setNum(el.bpmStart, s.bpmStart, 20, 400);
    setNum(el.bpmEnd, s.bpmEnd, 20, 400);
    setNum(el.tempoBars, s.tempoBars, 1, 512);
    if (s.tempoCurve) el.tempoCurve.value = s.tempoCurve;

    setNum(el.sigBeats, s.sigBeats, 1, 32);
    setNum(el.sigP, s.sigP, 1, 16);
    setNum(el.swingPct, s.swingPct, 10, 90);

    setNum(el.intrLen, s.intrLen, 1, 2048);

    setNum(el.elongStat, s.elongStat, 1, 64);
    if (s.elongStatMode && el.elongStatMode){
      el.elongStatMode.value = s.elongStatMode === "fill" ? "fill" : "stretch";
    }
    setNum(el.elongFinal, s.elongFinal, 1, 64);
    setNum(el.elongReps, s.elongReps, 1, 256);
    if (s.elongGrowth && el.elongGrowth){
      const v = String(s.elongGrowth);
      el.elongGrowth.value = (v === "stretch_x2" || v === "stretch_p1" || v === "fill_x2" || v === "fill_p1") ? v : "stretch_x2";
    }

    setNum(el.decPatterns, s.decPatterns, 1, 64);

    setFree(!!s.free);
  }

function bind(){

  restoreSettings();
  syncCommittedFromDom();

  el.tempoToggle.addEventListener("click", () => {
    toggleTempoModeCarry();
  });

  el.elongToggle.addEventListener("click", () => {
    setElongMode(ui.elongMode === "stat" ? "dyn" : "stat");
    persistSettings();
  });

  el.freeToggle.addEventListener("click", () => {
    setFree(!ui.free);
  });

  el.decToggle.addEventListener("click", () => {
    setDec(!ui.decOn);
  });

  el.randToggle.addEventListener("click", () => {
    setRand(!ui.randOn);
  });

  if (el.barPill){
    el.barPill.addEventListener("click", () => {
      ui.barPillHidden = !ui.barPillHidden;
      updateBarPillHidden();
    });
  }

  el.bpmStat.addEventListener("change", () => {
    commitBpmStatFromField();
    persistSettings();
  });

  el.bpmStart.addEventListener("change", () => {
    commitBpmStartFromField();
    persistSettings();
  });

  el.bpmEnd.addEventListener("change", () => {
    commitBpmEndFromField();
    if (ui.tempoMode === "dyn" && eng.running) tempoDynRetargetNow();
    persistSettings();
  });

  el.tempoBars.addEventListener("change", () => {
    commitTempoBarsFromField();
    if (ui.tempoMode === "dyn" && eng.running) tempoDynRetargetNow();
    persistSettings();
  });

  el.tempoCurve.addEventListener("change", () => {
    commitTempoCurveFromField();
    if (ui.tempoMode === "dyn" && eng.running) tempoDynRetargetNow();
    persistSettings();
  });

  const refreshEdit = () => {
    setEditContext();
    persistSettings();
  };

  el.sigBeats.addEventListener("change", refreshEdit);
  el.sigP.addEventListener("change", refreshEdit);
  el.intrLen.addEventListener("change", refreshEdit);

  el.swingPct.addEventListener("change", () => {
    commitSwingFromField();
    persistSettings();
  });

  el.randLocal.addEventListener("change", () => {
    commitRandLocalFromField();
    persistSettings();
  });

  el.randMute.addEventListener("change", () => {
    commitRandMuteFromField();
    persistSettings();
  });

  [
    el.countIn,
    el.elongStat,
    el.elongFinal,
    el.elongReps,
    el.elongGrowth,
    el.decPatterns
  ].forEach(inp =>
    inp.addEventListener("change", () => {
      persistSettings();
    })
  );

  if (el.elongGrowth){
    el.elongGrowth.addEventListener("change", () => {
      eng.elongBlockedIncreasePending = false;
      eng.elongBlockedIncreaseUsed = false;
    });
  }

  el.startBtn.addEventListener("click", () => {
    showWarn("");
    if (!eng.running){
      try{ start(); }
      catch(e){ showWarn(String(e?.message || e)); }
    } else {
      stop();
    }
  });

  setEditContext();

  el.bpmPill.textContent =
    `BPM ${Math.round(clampFloat(committed.bpmStat,20,400))}`;

  updateBarPillHidden();
}


  bind();
})();
