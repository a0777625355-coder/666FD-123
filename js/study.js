(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const root = $("view-study");
  if (!root) return;

  const cfg = window.LOVE || {};
  const STORAGE_KEY = "our1000days.study.v1";
  const TIMER_KEY = "our1000days.study.timer.v1";
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  let study = loadStudy();
  let selectedMinutes = 25;
  let timer = loadTimer();
  let timerTick = null;
  let audioContext = null;
  let noiseSource = null;
  let noiseGain = null;
  let noiseNodes = [];
  let noiseTimers = new Set();
  let noiseType = "white";
  let cloudClient = null;
  let cloudChannel = null;
  let cloudPushTimer = null;

  function todayKey(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function identity() {
    try { return localStorage.getItem("our1000days.gate.v1") === "him" ? "him" : "her"; }
    catch (e) { return "her"; }
  }

  function personName(who) {
    return who === "him" ? (cfg.myName || "小栋") : (cfg.herName || "小颖");
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function emptyStudy() {
    return { version: 1, goals: {}, sessions: [], updatedAt: 0 };
  }

  function sanitizeStudy(value) {
    const clean = emptyStudy();
    if (!value || typeof value !== "object") return clean;
    clean.goals = value.goals && typeof value.goals === "object" ? value.goals : {};
    clean.sessions = Array.isArray(value.sessions) ? value.sessions.filter(item => item && item.id && (item.who === "him" || item.who === "her") && Number(item.seconds) > 0).slice(-1000) : [];
    clean.updatedAt = Number(value.updatedAt) || 0;
    return clean;
  }

  function loadStudy() {
    try { return sanitizeStudy(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")); }
    catch (e) { return emptyStudy(); }
  }

  function saveStudy(sync = true) {
    study.updatedAt = Date.now();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(study)); } catch (e) { showToast("学习记录暂时无法保存"); }
    renderAll();
    if (sync) scheduleCloudPush();
  }

  function defaultTimer() {
    return { status: "idle", minutes: 25, duration: 1500, remaining: 1500, endAt: 0, owner: identity(), isFocus: true };
  }

  function loadTimer() {
    try {
      const raw = JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
      if (!raw || !["idle", "running", "paused"].includes(raw.status)) return defaultTimer();
      return { ...defaultTimer(), ...raw, duration: Math.max(60, Number(raw.duration) || 1500), remaining: Math.max(0, Number(raw.remaining) || 0) };
    } catch (e) { return defaultTimer(); }
  }

  function saveTimer() {
    try { localStorage.setItem(TIMER_KEY, JSON.stringify(timer)); } catch (e) {}
  }

  function escapeHtml(value) {
    const span = document.createElement("span");
    span.textContent = String(value || "");
    return span.innerHTML;
  }

  function showToast(message) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function setSyncState(state, text) {
    const badge = $("studySyncStatus");
    if (!badge) return;
    badge.dataset.state = state;
    badge.innerHTML = "<i></i> " + escapeHtml(text);
  }

  function dayGoals(day, who) {
    const entry = study.goals[day];
    if (!entry || !Array.isArray(entry[who])) return [];
    return entry[who];
  }

  function ensureTodayGoals() {
    const day = todayKey();
    if (!study.goals[day] || typeof study.goals[day] !== "object") study.goals[day] = { him: [], her: [] };
    if (!Array.isArray(study.goals[day].him)) study.goals[day].him = [];
    if (!Array.isArray(study.goals[day].her)) study.goals[day].her = [];
    return study.goals[day];
  }

  function renderIdentity() {
    const who = identity();
    $("studyIdentity").textContent = "当前：" + personName(who) + " · 记录计入我";
    $("studyGoalInput").placeholder = personName(who) + "今天要完成什么…";
    if (timer.status === "idle") timer.owner = who;
  }

  function renderGoals() {
    const day = todayKey();
    ["him", "her"].forEach(who => {
      const all = dayGoals(day, who).filter(item => !item.deletedAt);
      const done = all.filter(item => item.done).length;
      $(who === "him" ? "goalProgressHim" : "goalProgressHer").textContent = done + " / " + all.length;
      const list = $(who === "him" ? "goalListHim" : "goalListHer");
      if (!all.length) {
        list.innerHTML = '<p class="goal-empty">今天还没有写下目标</p>';
        return;
      }
      list.innerHTML = all.map(item => '<div class="goal-row ' + (item.done ? "is-done " : "") + (identity() !== who ? "is-other" : "") + '" data-goal-id="' + escapeHtml(item.id) + '" data-goal-who="' + who + '">' +
        '<input type="checkbox" id="goal-' + escapeHtml(item.id) + '" ' + (item.done ? "checked" : "") + '>' +
        '<label class="goal-check" for="goal-' + escapeHtml(item.id) + '" aria-label="标记目标完成">✓</label>' +
        '<p>' + escapeHtml(item.text) + '</p><button type="button" class="goal-delete" aria-label="删除目标">×</button></div>').join("");
    });
  }

  function formatMinutes(seconds) {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + " 分钟";
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours + " 小时" + (rest ? " " + rest + " 分" : "");
  }

  function sessionsFor(day, who) {
    return study.sessions.filter(item => item.date === day && (!who || item.who === who));
  }

  function renderStats() {
    const day = todayKey();
    const him = sessionsFor(day, "him");
    const her = sessionsFor(day, "her");
    const seconds = rows => rows.reduce((sum, item) => sum + Number(item.seconds || 0), 0);
    const himSeconds = seconds(him), herSeconds = seconds(her);
    $("studyTimeHim").textContent = formatMinutes(himSeconds);
    $("studyTimeHer").textContent = formatMinutes(herSeconds);
    $("studyTimeTogether").textContent = formatMinutes(himSeconds + herSeconds);
    $("studySessionsHim").textContent = him.length + " 个番茄";
    $("studySessionsHer").textContent = her.length + " 个番茄";
    $("studyStatsDate").textContent = day + " · 今天";

    const days = [];
    let weekSeconds = 0, weekSessions = 0;
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = todayKey(date);
      const rows = sessionsFor(key);
      const total = seconds(rows);
      weekSeconds += total;
      weekSessions += rows.length;
      days.push({ key, label: offset === 0 ? "今天" : "周" + weekdays[date.getDay()], minutes: Math.round(total / 60) });
    }
    $("studyTimeWeek").textContent = formatMinutes(weekSeconds);
    $("studyWeekSessions").textContent = weekSessions + " 次专注";
    const max = Math.max(30, ...days.map(item => item.minutes));
    $("studyWeekChart").innerHTML = days.map(item => '<div class="week-bar ' + (item.key === day ? "is-today" : "") + '"><i style="--bar-height:' + Math.max(5, Math.round(item.minutes / max * 100)) + '%" data-minutes="' + item.minutes + '"></i><span>' + item.label + '</span></div>').join("");
  }

  function renderTimer() {
    let remaining = timer.remaining;
    if (timer.status === "running") remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    $("timerDisplay").textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    const elapsed = Math.max(0, timer.duration - remaining);
    $("timerOrbit").style.setProperty("--timer-progress", Math.min(360, elapsed / timer.duration * 360) + "deg");
    $("timerOwner").textContent = "这一轮属于" + personName(timer.owner);
    $("timerPhase").textContent = timer.status === "running" ? (timer.isFocus ? "正在专注" : "正在休息") : timer.status === "paused" ? "已暂停" : (timer.isFocus ? "准备专注" : "准备休息");
    $("timerToggle").textContent = timer.status === "running" ? "暂停" : timer.status === "paused" ? "继续" : (timer.isFocus ? "开始专注" : "开始休息");
    $("timerEncourage").textContent = timer.status === "running" ? "正在为今天的目标积累时间。" : timer.status === "paused" ? "歇一下，准备好再继续。" : "先开始，再慢慢进入状态。";
    document.querySelectorAll("[data-timer-minutes]").forEach(button => button.classList.toggle("is-on", Number(button.dataset.timerMinutes) === timer.minutes));
  }

  function timerLoop() {
    clearInterval(timerTick);
    if (timer.status !== "running") return;
    timerTick = setInterval(() => {
      if (timer.endAt > Date.now()) { renderTimer(); return; }
      clearInterval(timerTick);
      timer.remaining = 0;
      playCompletionBell();
      if (timer.isFocus) completeFocus(timer.duration, timer.owner);
      else showToast("休息结束，准备开始下一轮吧");
      timer.status = "idle";
      timer.remaining = timer.duration;
      timer.endAt = 0;
      saveTimer();
      renderTimer();
    }, 250);
  }

  function completeFocus(seconds, who) {
    study.sessions.push({ id: uid(), who, seconds, date: todayKey(), endedAt: Date.now() });
    study.sessions = study.sessions.slice(-1000);
    saveStudy();
    showToast(personName(who) + "完成了一轮专注，已计入今天");
  }

  function setTimerMinutes(minutes) {
    if (timer.status === "running") { showToast("请先暂停或重置当前计时"); return; }
    selectedMinutes = minutes;
    timer = { status: "idle", minutes, duration: minutes * 60, remaining: minutes * 60, endAt: 0, owner: identity(), isFocus: ![5, 15].includes(minutes) };
    saveTimer(); renderTimer();
  }

  function toggleTimer() {
    if (timer.status === "running") {
      timer.remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
      timer.status = "paused";
      timer.endAt = 0;
      clearInterval(timerTick);
    } else {
      primeAudio();
      if (timer.status === "idle") timer.owner = identity();
      timer.status = "running";
      timer.endAt = Date.now() + timer.remaining * 1000;
      timerLoop();
    }
    saveTimer(); renderTimer();
  }

  function resetTimer() {
    clearInterval(timerTick);
    timer = { status: "idle", minutes: selectedMinutes, duration: selectedMinutes * 60, remaining: selectedMinutes * 60, endAt: 0, owner: identity(), isFocus: ![5, 15].includes(selectedMinutes) };
    saveTimer(); renderTimer();
  }

  function finishTimer() {
    if (timer.status === "idle" && timer.remaining === timer.duration) { showToast("先开始一轮专注吧"); return; }
    playCompletionBell();
    if (!timer.isFocus) { resetTimer(); showToast("休息已结束"); return; }
    clearInterval(timerTick);
    completeFocus(timer.duration, timer.owner || identity());
    resetTimer();
  }

  function createNoiseGraph() {
    if (!primeAudio()) { showToast("当前浏览器不支持白噪声"); return false; }
    noiseGain = audioContext.createGain();
    noiseGain.gain.value = Number($("noiseVolume").value) / 100 * .42;
    noiseGain.connect(audioContext.destination);
    noiseNodes.push(noiseGain);

    if (noiseType === "rainfire") {
      addNoiseLayer("white", "highpass", 1150, .48);
      addNoiseLayer("brown", "lowpass", 480, .19);
      scheduleTexture("crackle", 260, 1350);
    } else if (noiseType === "ocean") {
      addNoiseLayer("brown", "lowpass", 1050, .58, { frequency: .085, depth: .34 });
      addNoiseLayer("white", "bandpass", 1250, .12, { frequency: .105, depth: .07 });
    } else if (noiseType === "library") {
      addNoiseLayer("brown", "lowpass", 520, .13);
      addNoiseLayer("white", "bandpass", 1850, .025);
      scheduleTexture("writing", 1400, 4200);
      scheduleTexture("page", 7500, 16000);
    } else {
      addNoiseLayer(noiseType === "brown" ? "brown" : "white", noiseType === "brown" ? "lowpass" : noiseType === "pink" ? "lowshelf" : "highpass", noiseType === "brown" ? 700 : noiseType === "pink" ? 900 : 25, 1, null, noiseType === "pink" ? 7 : 0);
    }
    return true;
  }

  function makeNoiseBuffer(color, seconds = 2) {
    const length = Math.max(1, Math.round(audioContext.sampleRate * seconds));
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const values = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + .02 * white) / 1.02;
      values[i] = color === "brown" ? brown * 3.5 : white;
    }
    return buffer;
  }

  function addNoiseLayer(color, filterType, frequency, level, lfo, filterGain = 0) {
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const layerGain = audioContext.createGain();
    source.buffer = makeNoiseBuffer(color);
    source.loop = true;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.gain.value = filterGain;
    layerGain.gain.value = level;
    source.connect(filter);
    filter.connect(layerGain);
    layerGain.connect(noiseGain);
    source.start();
    if (!noiseSource) noiseSource = source;
    noiseNodes.push(source, filter, layerGain);
    if (lfo) {
      const oscillator = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = lfo.frequency;
      lfoGain.gain.value = lfo.depth;
      oscillator.connect(lfoGain);
      lfoGain.connect(layerGain.gain);
      oscillator.start();
      noiseNodes.push(oscillator, lfoGain);
    }
  }

  function playTexture(kind) {
    if (!noiseSource || !noiseGain) return;
    const duration = kind === "page" ? .72 : kind === "writing" ? .42 : .11 + Math.random() * .12;
    const length = Math.round(audioContext.sampleRate * duration);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const values = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = kind === "crackle" ? Math.exp(-t * 15) : Math.sin(Math.PI * t) * (kind === "writing" ? (.3 + .7 * Math.abs(Math.sin(t * 48))) : 1);
      values[i] = (Math.random() * 2 - 1) * envelope;
    }
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = kind === "crackle" ? 2300 + Math.random() * 2100 : kind === "page" ? 1450 : 2650;
    filter.Q.value = kind === "writing" ? 2.6 : .8;
    gain.gain.value = kind === "crackle" ? .42 + Math.random() * .42 : kind === "page" ? .22 : .11;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(noiseGain);
    noiseNodes.push(source, filter, gain);
    source.onended = () => {
      [source, filter, gain].forEach(node => { const index = noiseNodes.indexOf(node); if (index >= 0) noiseNodes.splice(index, 1); try { node.disconnect(); } catch (e) {} });
    };
    source.start();
  }

  function scheduleTexture(kind, minDelay, maxDelay) {
    const schedule = () => {
      const id = setTimeout(() => {
        noiseTimers.delete(id);
        if (!noiseSource) return;
        playTexture(kind);
        if (kind === "crackle" && Math.random() > .55) setTimeout(() => playTexture(kind), 80 + Math.random() * 180);
        schedule();
      }, minDelay + Math.random() * (maxDelay - minDelay));
      noiseTimers.add(id);
    };
    schedule();
  }

  function primeAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    if (!audioContext) audioContext = new AudioCtx();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return true;
  }

  function playCompletionBell() {
    if (!primeAudio()) return;
    const start = audioContext.currentTime + .02;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(.0001, start);
    master.gain.exponentialRampToValueAtTime(.16, start + .025);
    master.gain.exponentialRampToValueAtTime(.0001, start + 1.65);
    master.connect(audioContext.destination);
    [659.25, 783.99, 987.77].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const noteGain = audioContext.createGain();
      const noteStart = start + index * .16;
      oscillator.type = index === 2 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      noteGain.gain.setValueAtTime(.0001, noteStart);
      noteGain.gain.exponentialRampToValueAtTime(index === 2 ? .75 : .48, noteStart + .018);
      noteGain.gain.exponentialRampToValueAtTime(.0001, noteStart + 1.05);
      oscillator.connect(noteGain).connect(master);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 1.1);
    });
    setTimeout(() => master.disconnect(), 1900);
  }

  function stopNoise() {
    noiseTimers.forEach(id => clearTimeout(id));
    noiseTimers.clear();
    noiseNodes.forEach(node => { try { if (typeof node.stop === "function") node.stop(); } catch (e) {} try { node.disconnect(); } catch (e) {} });
    noiseNodes = [];
    noiseSource = null;
    noiseGain = null;
    root.querySelector(".noise-card").classList.remove("is-playing");
    $("noiseToggle").textContent = "播放" + noiseLabel(noiseType);
    $("noiseToggle").setAttribute("aria-pressed", "false");
  }

  async function toggleNoise() {
    if (noiseSource) { stopNoise(); return; }
    if (!createNoiseGraph()) return;
    await audioContext.resume();
    root.querySelector(".noise-card").classList.add("is-playing");
    $("noiseToggle").textContent = "暂停环境声";
    $("noiseToggle").setAttribute("aria-pressed", "true");
  }

  function selectNoise(type) {
    const wasPlaying = Boolean(noiseSource);
    stopNoise(); noiseType = type;
    document.querySelectorAll("[data-noise]").forEach(button => button.classList.toggle("is-on", button.dataset.noise === type));
    if (wasPlaying) toggleNoise();
    else $("noiseToggle").textContent = "播放" + noiseLabel(type);
  }

  function noiseLabel(type) {
    return { white: "白噪声", pink: "粉红噪声", brown: "棕色噪声", rainfire: "雨天火炉", ocean: "海浪声", library: "图书馆" }[type] || "环境声";
  }

  function mergeStudy(local, remote) {
    const result = sanitizeStudy(local);
    const incoming = sanitizeStudy(remote);
    const dates = new Set([...Object.keys(result.goals), ...Object.keys(incoming.goals)]);
    dates.forEach(date => {
      const mergedDay = { him: [], her: [] };
      ["him", "her"].forEach(who => {
        const map = new Map();
        [...(result.goals[date]?.[who] || []), ...(incoming.goals[date]?.[who] || [])].forEach(item => {
          if (!item || !item.id) return;
          const old = map.get(item.id);
          if (!old || Number(item.updatedAt || 0) >= Number(old.updatedAt || 0)) map.set(item.id, item);
        });
        mergedDay[who] = [...map.values()];
      });
      result.goals[date] = mergedDay;
    });
    const sessionMap = new Map();
    [...result.sessions, ...incoming.sessions].forEach(item => sessionMap.set(item.id, item));
    result.sessions = [...sessionMap.values()].sort((a, b) => Number(a.endedAt || 0) - Number(b.endedAt || 0)).slice(-1000);
    result.updatedAt = Math.max(result.updatedAt, incoming.updatedAt);
    return result;
  }

  async function pullCloud() {
    if (!cloudClient) return;
    setSyncState("syncing", "正在同步");
    try {
      const { data: rows, error } = await cloudClient.from("site_data").select("payload").eq("id", "main").limit(1);
      if (error) throw error;
      const remote = rows && rows[0] && rows[0].payload ? rows[0].payload.study : null;
      if (remote) {
        study = mergeStudy(study, remote);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(study)); } catch (e) {}
        renderAll();
      }
      setSyncState("online", "两人同步中");
    } catch (e) {
      setSyncState("local", "本机保存");
    }
  }

  function scheduleCloudPush() {
    if (!cloudClient) return;
    clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(pushCloud, 500);
  }

  async function pushCloud() {
    if (!cloudClient) return;
    setSyncState("syncing", "正在同步");
    try {
      const { data: rows, error: readError } = await cloudClient.from("site_data").select("payload").eq("id", "main").limit(1);
      if (readError) throw readError;
      const remotePayload = rows && rows[0] && rows[0].payload && typeof rows[0].payload === "object" ? rows[0].payload : {};
      study = mergeStudy(study, remotePayload.study);
      study.updatedAt = Date.now();
      const payload = { ...remotePayload, study };
      const { error } = await cloudClient.from("site_data").upsert([{ id: "main", payload, time: Date.now() }]);
      if (error) throw error;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(study)); } catch (e) {}
      setSyncState("online", "两人同步中");
      renderAll();
    } catch (e) {
      setSyncState("local", "本机保存");
    }
  }

  function setupCloud() {
    const cloud = cfg.cloud || {};
    if (!cloud.enabled || !cloud.url || !cloud.anonKey || !window.supabase) return;
    try {
      cloudClient = window.supabase.createClient(cloud.url, cloud.anonKey);
      pullCloud();
      cloudChannel = cloudClient.channel("study-sync").on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_data", filter: "id=eq.main" }, pullCloud).subscribe();
      setInterval(pullCloud, 20000);
    } catch (e) { setSyncState("local", "本机保存"); }
  }

  function renderAll() {
    renderIdentity(); renderGoals(); renderStats(); renderTimer();
  }

  $("studyGoalForm").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("studyGoalInput");
    const text = input.value.trim();
    if (!text) return;
    const who = identity();
    ensureTodayGoals()[who].push({ id: uid(), text: text.slice(0, 60), done: false, updatedAt: Date.now(), deletedAt: 0 });
    input.value = "";
    saveStudy();
  });

  root.addEventListener("change", event => {
    const row = event.target.closest(".goal-row");
    if (!row || event.target.type !== "checkbox" || row.dataset.goalWho !== identity()) return;
    const item = dayGoals(todayKey(), row.dataset.goalWho).find(goal => goal.id === row.dataset.goalId);
    if (!item) return;
    item.done = event.target.checked; item.updatedAt = Date.now(); saveStudy();
  });
  root.addEventListener("click", event => {
    const del = event.target.closest(".goal-delete");
    if (!del) return;
    const row = del.closest(".goal-row");
    if (!row || row.dataset.goalWho !== identity()) return;
    const item = dayGoals(todayKey(), row.dataset.goalWho).find(goal => goal.id === row.dataset.goalId);
    if (!item) return;
    item.deletedAt = Date.now(); item.updatedAt = item.deletedAt; saveStudy();
  });
  document.querySelectorAll("[data-timer-minutes]").forEach(button => button.addEventListener("click", () => setTimerMinutes(Number(button.dataset.timerMinutes))));
  document.querySelectorAll("[data-noise]").forEach(button => button.addEventListener("click", () => selectNoise(button.dataset.noise)));
  $("timerToggle").addEventListener("click", toggleTimer);
  $("timerReset").addEventListener("click", resetTimer);
  $("timerFinish").addEventListener("click", finishTimer);
  $("noiseToggle").addEventListener("click", toggleNoise);
  $("noiseVolume").addEventListener("input", event => { if (noiseGain) noiseGain.gain.value = Number(event.target.value) / 100 * .42; });

  new MutationObserver(() => { if ($("app").dataset.active === "study") renderAll(); }).observe($("app"), { attributes: true, attributeFilter: ["data-active"] });
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) { study = loadStudy(); renderAll(); }
    if (event.key === "our1000days.gate.v1") renderIdentity();
  });
  window.addEventListener("love-study-imported", () => { study = loadStudy(); renderAll(); scheduleCloudPush(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && cloudClient) pullCloud(); });

  selectedMinutes = timer.minutes;
  if (timer.status === "running" && timer.endAt <= Date.now()) {
    if (timer.isFocus) completeFocus(timer.duration, timer.owner);
    timer = defaultTimer(); saveTimer();
  }
  renderAll(); timerLoop(); setupCloud();
})();
