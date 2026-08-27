(function () {
  const cfg = window.LOVE || {};
  const store = window.LOVE_STORE;
  const $ = (id) => document.getElementById(id);

  const OUTFITS = [
    { id: "hoodie", name: "白卫衣" },
    { id: "plaid", name: "绿格裙" },
    { id: "tee", name: "灰上衣" },
    { id: "knit", name: "粉毛衣" },
    { id: "maid", name: "女仆装" },
    { id: "cap", name: "画家帽" },
    { id: "seaside", name: "海边裙装" }
  ];
  const ACTIONS = [
    { id: "idle", name: "呼吸" },
    { id: "wave", name: "挥手" },
    { id: "walk", name: "走路" },
    { id: "jump", name: "跳跃" }
  ];

  let outfit = "hoodie";
  let action = "idle";
  let data = store.load();

  const start = parseDate(cfg.startDate);

  setupIntro();
  setupClock();
  renderHero();
  renderParade();
  renderWardrobe();
  renderEvents();
  renderAlbum();
  renderLetter();
  setupEditor();
  setupMusic();

  function parseDate(value) {
    const parts = String(value || "").split("-").map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return new Date(2023, 10, 30);
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function elapsed() {
    let ms = Date.now() - start.getTime();
    if (ms < 0) ms = 0;
    const sec = Math.floor(ms / 1000);
    return {
      days: Math.floor(sec / 86400),
      hours: Math.floor((sec % 86400) / 3600),
      mins: Math.floor((sec % 3600) / 60),
      secs: sec % 60
    };
  }

  function setupIntro() {
    $("introNames").textContent = (cfg.myName || "小栋") + "  ·  " + (cfg.herName || "小颖");
    $("topNames").textContent = (cfg.myName || "小栋") + " ♡ " + (cfg.herName || "小颖");
    const needPass = Boolean(cfg.password);
    if (needPass) $("gate").classList.remove("hidden");
    $("startBtn").onclick = () => {
      $("intro").classList.add("hidden");
      $("app").classList.remove("is-locked");
    };
    $("gateBtn").onclick = tryGate;
    $("gateInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryGate();
    });
    function tryGate() {
      if ($("gateInput").value === cfg.password) {
        $("gate").classList.add("hidden");
        $("gateErr").classList.add("hidden");
      } else {
        $("gateErr").classList.remove("hidden");
      }
    }
  }

  function renderHero() {
    $("heroSub").textContent = cfg.subtitle || "";
    $("heroSince").textContent = "从 " + (cfg.startDate || "") + " 开始";
  }

  function setupClock() {
    const tick = () => {
      const t = elapsed();
      $("cDays").textContent = t.days;
      $("cHours").textContent = pad(t.hours);
      $("cMins").textContent = pad(t.mins);
      $("cSecs").textContent = pad(t.secs);
      const remain = 1000 - t.days;
      $("statDays").textContent = t.days;
      $("statHours").textContent = t.days * 24 + t.hours;
      $("statSunsets").textContent = t.days;
      if (remain > 0) {
        $("heroKicker").textContent = "UNTIL 1000";
        $("heroNote").textContent = "还差 " + remain + " 天";
      } else if (remain === 0) {
        $("heroKicker").textContent = "TODAY";
        $("heroNote").textContent = "满 1000 天了";
      } else {
        $("heroKicker").textContent = "1000 DAYS";
        $("heroNote").textContent = "第 1000 天已经过去，日子还在写";
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  function renderParade() {
    const bits = [
      buddy("ying", "assets/chars/ying-walk.gif"),
      buddy("dong", "assets/chars/dong-walk.gif"),
      buddy("ying", "assets/chars/outfits/plaid-walk.gif"),
      buddy("dong", "assets/chars/dong-wave.gif"),
      buddy("ying", "assets/chars/outfits/knit-walk.gif"),
      buddy("dong", "assets/chars/dong-walk.gif"),
      buddy("ying", "assets/chars/outfits/maid-walk.gif"),
      buddy("ying", "assets/chars/outfits/cap-walk.gif"),
      buddy("dong", "assets/chars/dong-idle.gif"),
      buddy("ying", "assets/chars/outfits/tee-walk.gif"),
      buddy("ying", "assets/chars/outfits/seaside-walk.gif")
    ].join("");
    $("paradeTrack").innerHTML = bits + bits;
  }

  function buddy(who, src) {
    return `<div class="buddy ${who}"><img class="pixel" src="${src}" alt="" /></div>`;
  }

  function renderWardrobe() {
    $("outfitGrid").innerHTML = OUTFITS.map((o) =>
      `<button type="button" class="outfit-card${o.id === outfit ? " is-on" : ""}" data-outfit="${o.id}">
        <div class="buddy ying"><img class="pixel" src="assets/chars/outfits/${o.id}-idle.gif" alt="" /></div>
        <span>${o.name}</span>
      </button>`
    ).join("");
    $("actionRow").innerHTML = ACTIONS.map((a) =>
      `<button type="button" class="chip${a.id === action ? " is-on" : ""}" data-action="${a.id}">${a.name}</button>`
    ).join("");
    $("outfitGrid").onclick = (e) => {
      const btn = e.target.closest("[data-outfit]");
      if (!btn) return;
      outfit = btn.dataset.outfit;
      renderWardrobe();
    };
    $("actionRow").onclick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      action = btn.dataset.action;
      renderWardrobe();
    };
    applySprite();
  }

  function applySprite() {
    $("runwayYing").src = `assets/chars/outfits/${outfit}-${action}.gif`;
    $("heroYing").src = `assets/chars/outfits/${outfit}-wave.gif`;
    const dong = { idle: "dong-idle.gif", wave: "dong-wave.gif", walk: "dong-walk.gif", jump: "dong-laugh.gif" };
    $("runwayDong").src = "assets/chars/" + (dong[action] || "dong-idle.gif");
    $("heroDong").src = "assets/chars/dong-wave.gif";
  }

  function allEvents() {
    const fromCfg = Array.isArray(cfg.events) ? cfg.events : [];
    return fromCfg.concat(data.events).sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }

  function allPhotos() {
    const fromCfg = Array.isArray(cfg.photos) ? cfg.photos : [];
    return fromCfg.concat(data.photos);
  }

  function renderEvents() {
    const list = $("eventList");
    const items = allEvents();
    if (!items.length) {
      list.innerHTML = ["第一件事", "一次旅行", "一个普通的晚上", "想记住的吵架和好", "过节", "第 1000 天"]
        .map((t) => `<div class="ghost-card">空位 · ${t}</div>`).join("");
      return;
    }
    list.innerHTML = items.map((item) => {
      const photo = item.photo ? `<img src="${escapeAttr(item.photo)}" alt="" />` : "";
      const canDel = Boolean(item.id);
      return `<article class="event-card">
        ${canDel ? `<button type="button" class="del" data-del-event="${item.id}">删除</button>` : ""}
        <time>${escapeHtml(item.date || "")}</time>
        <h3>${escapeHtml(item.title || "")}</h3>
        <p>${escapeHtml(item.text || "")}</p>
        ${photo}
      </article>`;
    }).join("");
    list.querySelectorAll("[data-del-event]").forEach((btn) => {
      btn.onclick = () => {
        data.events = data.events.filter((e) => e.id !== btn.dataset.delEvent);
        store.save(data);
        renderEvents();
      };
    });
  }

  function renderAlbum() {
    const grid = $("albumGrid");
    const photos = allPhotos();
    if (!photos.length) {
      grid.innerHTML = Array.from({ length: 8 }, (_, i) =>
        `<div class="ghost-photo">空位 ${i + 1}</div>`
      ).join("");
      return;
    }
    grid.innerHTML = photos.map((p) => {
      const src = typeof p === "string" ? p : p.src;
      const caption = typeof p === "string" ? "" : (p.caption || p.date || "");
      const id = p && p.id ? p.id : "";
      return `<figure class="photo-card">
        ${id ? `<button type="button" class="del" data-del-photo="${id}">删除</button>` : ""}
        <img src="${escapeAttr(src)}" alt="" />
        <figcaption>${escapeHtml(caption)}</figcaption>
      </figure>`;
    }).join("");
    grid.querySelectorAll("[data-del-photo]").forEach((btn) => {
      btn.onclick = () => {
        data.photos = data.photos.filter((p) => p.id !== btn.dataset.delPhoto);
        store.save(data);
        renderAlbum();
      };
    });
  }

  function renderLetter() {
    const t = elapsed();
    const raw = cfg.letter || "";
    $("letterBody").textContent = raw
      .replaceAll("{{herName}}", cfg.herName || "你")
      .replaceAll("{{myName}}", cfg.myName || "我")
      .replaceAll("{{days}}", String(t.days))
      .replaceAll("{{startDate}}", cfg.startDate || "");
  }

  function setupEditor() {
    const modal = $("modal");
    const eventForm = $("eventForm");
    const photoForm = $("photoForm");
    document.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.dataset.open));
    });
    $("modalClose").onclick = () => modal.classList.add("hidden");
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });

    function openModal(kind) {
      eventForm.classList.toggle("hidden", kind !== "event");
      photoForm.classList.toggle("hidden", kind !== "photo");
      eventForm.reset();
      photoForm.reset();
      modal.classList.remove("hidden");
    }

    eventForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(eventForm);
      const file = eventForm.photo.files[0];
      const item = {
        id: store.uid(),
        date: String(fd.get("date") || ""),
        title: String(fd.get("title") || ""),
        text: String(fd.get("text") || ""),
        photo: ""
      };
      if (file) item.photo = await store.compress(file);
      data.events.push(item);
      store.save(data);
      renderEvents();
      modal.classList.add("hidden");
    };

    photoForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(photoForm);
      const file = photoForm.photo.files[0];
      if (!file) return;
      data.photos.push({
        id: store.uid(),
        src: await store.compress(file),
        date: String(fd.get("date") || ""),
        caption: String(fd.get("caption") || "")
      });
      store.save(data);
      renderAlbum();
      modal.classList.add("hidden");
    };

    const drop = $("dropzone");
    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    drop.addEventListener("drop", async (e) => {
      e.preventDefault();
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
      for (const file of files) {
        data.photos.push({
          id: store.uid(),
          src: await store.compress(file),
          date: "",
          caption: file.name.replace(/\.[^.]+$/, "")
        });
      }
      store.save(data);
      renderAlbum();
    });

    $("exportBtn").onclick = () => store.exportJson();
    $("importFile").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      data = await store.importJson(file);
      renderEvents();
      renderAlbum();
      e.target.value = "";
    };
  }

  function setupMusic() {
    if (!cfg.music) return;
    const audio = $("bgm");
    const btn = $("musicBtn");
    audio.src = cfg.music;
    btn.classList.remove("hidden");
    btn.onclick = () => {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }
})();
