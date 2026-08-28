(function () {
  const cfg = window.LOVE || {};
  const store = window.LOVE_STORE;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

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
  let curFood = "menu";
  let curGame = null;
  let curRole = null;
  let curFun = null;
  let me = "her"; // 当前登录身份：her=小颖 / him=小栋
  let chatHandle = null; // 聊天文件的文件夹句柄（文件同步用）
  let cloudReady = false; // 云端实时同步是否已连接
  let supabase = null; // 云端客户端
  let chatChannel = null; // 实时订阅通道
  let lastDays = -1;
  let toastTimer = null;
  let lbList = [];
  let lbIndex = -1;
  let revealObs = null;
  const railOpen = { outfits: false, actions: false }; // 侧边栏折叠状态（默认折叠）
  // 吃喝统一粉色系；颜色浓度随喜爱程度变化（1心最淡 → 5心最饱和）
  const FOOD_A = "#f18fc5";
  const FOOD_B = "#c9438f";
  const RATE_A = "#f6b7de";
  const RATE_B = "#fbdaf0";
  const RATE_ALPHA = [0.45, 0.58, 0.72, 0.86, 1];

  function alphaHex(alpha) {
    return Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, "0");
  }

  const start = parseDate(cfg.startDate);
  const FUN = Array.isArray(cfg.fun) ? cfg.fun : [];
  const GAMES = Array.isArray(cfg.games) ? cfg.games : [];
  const LOGIN = (cfg.login && typeof cfg.login === "object" ? cfg.login : null) || { her: "days", him: "000" };
  const FOOD_SEEDS =
    (cfg.foodDefaults && typeof cfg.foodDefaults === "object" ? cfg.foodDefaults : null) ||
    { v: "0", menu: {}, milktea: {} };
  const foodSeedItems = (key) => {
    const cat = FOOD_SEEDS[key];
    if (!cat) return [];
    return Array.isArray(cat) ? cat : (cat.items || []);
  };

  init();

  function init() {
    // 名字
    $("gateTitle").textContent = cfg.gateTitle || "LEE & CHENG";
    const parts = String(cfg.gateTitle || "LEE & CHENG").split(/\s*&\s*/);
    $("railName").textContent = (parts[0] || "LEE").trim();
    $("railName2").textContent = (parts[1] || "CHENG").trim();
    $("gateDate").textContent = cfg.startDate || "";
    $("heroSub").textContent = cfg.subtitle || "";
    $("heroSince").textContent = "从 " + (cfg.startDate || "") + " 开始";

    // 背景大图（玻璃背景的自定义图片）
    if (cfg.bgImage) {
      const bg = $("gateBg");
      bg.style.backgroundImage = `url('${encodeURI(cfg.bgImage).replace(/%2F/g, "/")}')`;
      bg.classList.add("on");
    }

    safe(() => setupGate());
    safe(() => setupTabs());
    safe(() => setupClock());
    safe(() => renderParade());
    safe(() => renderRailSelect());
    safe(() => renderEvents());
    safe(() => renderAlbum());
    safe(() => renderLetter());
    safe(() => setupEditor());
    safe(() => setupFood());
    safe(() => setupFun());
    safe(() => setupGame());
    safe(() => setupChat());
    safe(() => setupMusic());
    safe(() => setupLightbox());
    safe(() => spawnFloaters());
  }

  /* 容错：某一步出错只记录日志，不影响其他页面 */
  function safe(fn) {
    try {
      fn();
    } catch (e) {
      console.error("[我们的1000天] 初始化步骤出错：", e);
    }
  }

  /* 背景飘浮的像素小装饰（✦ ♥ ◆ ★） */
  function spawnFloaters() {
    const wrap = $("floaters");
    if (!wrap) return;
    const CHARS = ["✦", "♥", "◆", "★", "●", "❖"];
    const COLORS = ["#e878bc", "#5adce6", "#e4c07a", "#9d8cf0", "#8ae6c4", "#ff9d7a"];
    let html = "";
    const count = 14;
    for (let i = 0; i < count; i++) {
      const left = ((i * 7.3 + 5) % 96).toFixed(1);
      const dur = (10 + ((i * 5) % 12)).toFixed(1);
      const delay = (-(i * 1.9) % 12).toFixed(1);
      const size = 10 + (i % 4) * 4;
      const op = (0.2 + (i % 3) * 0.12).toFixed(2);
      html += `<span class="floater" style="left:${left}%;font-size:${size}px;color:${COLORS[i % COLORS.length]};animation-duration:${dur}s;animation-delay:${delay}s;--op:${op}">${CHARS[i % CHARS.length]}</span>`;
    }
    wrap.innerHTML = html;
  }

  function parseDate(value) {
    const parts = String(value || "").split("-").map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return new Date(2023, 11, 31);
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

  /* ============ 门禁 ============ */
  function setupGate() {
    const herName = cfg.herName || "小颖";
    const myName = cfg.myName || "小栋";
    const himCode = String(LOGIN.him || "000");
    $("gateHint").textContent = herName + "口令 = 上面的天数 · " + myName + "口令 = " + himCode;
    $("gateBtn").onclick = tryGate;
    $("gateInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryGate();
    });
    function tryGate() {
      const t = elapsed();
      const val = $("gateInput").value.trim();
      const herCode = LOGIN.her === "days" ? String(t.days) : String(LOGIN.her == null ? "" : LOGIN.her);
      const himCode = String(LOGIN.him || "000");
      const ok = val === herCode || val === himCode || (cfg.password && val === cfg.password);
      if (ok) {
        me = val === himCode ? "him" : "her";
        $("gateErr").classList.add("hidden");
        $("gate").classList.add("bye");
        $("app").classList.remove("is-locked");
        safe(() => renderChat()); // 刷新聊天页的身份显示
      } else {
        $("gateErr").classList.remove("hidden");
        $("gateInput").select();
      }
    }
  }

  /* ============ 标签页 ============ */
  function setupTabs() {
    // 顶部标签 + 侧边栏「动作馆」+ 返回按钮都用 data-view 切页
    $$("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });
    switchView("home");
  }

  function switchView(name) {
    $$(".tab").forEach((b) => b.classList.toggle("is-on", b.dataset.view === name));
    $$(".view").forEach((v) => v.classList.toggle("is-on", v.id === "view-" + name));
    $("app").dataset.active = name;
    if (name === "chat") safe(() => renderChat()); // 每次进聊天都刷新身份
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ============ 计时 ============ */
  function setupClock() {
    const tick = () => {
      const t = elapsed();
      $("cDays").textContent = t.days;
      $("cHours").textContent = pad(t.hours);
      $("cMins").textContent = pad(t.mins);
      $("cSecs").textContent = pad(t.secs);
      $("gateDays").textContent = t.days;
      $("heroNum").textContent = t.days;
      $("statDays").textContent = t.days;
      $("statHours").textContent = t.days * 24 + t.hours;
      $("statSunsets").textContent = t.days;
      const remain = 1000 - t.days;
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
      if (t.days !== lastDays) {
        lastDays = t.days;
        renderLetter();
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ============ 巡游 ============ */
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

  /* ============ 侧边栏 · 换装 / 动作（文字选项，可折叠） ============ */
  function applyRailCollapse() {
    $("railOutfits").classList.toggle("collapsed", !railOpen.outfits);
    $("railActions").classList.toggle("collapsed", !railOpen.actions);
  }

  function renderRailSelect() {
    $("railOutfitList").innerHTML = OUTFITS.map((o) =>
      `<button type="button" class="rail-opt${o.id === outfit ? " is-on" : ""}" data-outfit="${o.id}" title="${o.name}">${o.name}</button>`
    ).join("");
    $("railActionList").innerHTML = ACTIONS.map((a) =>
      `<button type="button" class="rail-opt${a.id === action ? " is-on" : ""}" data-action="${a.id}">${a.name}</button>`
    ).join("");
    $("railOutfitList").onclick = (e) => {
      const btn = e.target.closest("[data-outfit]");
      if (!btn) return;
      outfit = btn.dataset.outfit;
      renderRailSelect();
      applySprite();
      const o = OUTFITS.find((x) => x.id === outfit);
      toast("已换装 · " + (o ? o.name : outfit));
    };
    $("railActionList").onclick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      action = btn.dataset.action;
      renderRailSelect();
      applySprite();
      const a = ACTIONS.find((x) => x.id === action);
      toast("动作 · " + (a ? a.name : action));
    };
    // 折叠 / 展开
    $$(".rail-label").forEach((label) => {
      label.onclick = () => {
        const key = label.dataset.toggle;
        if (key === "outfits") railOpen.outfits = !railOpen.outfits;
        if (key === "actions") railOpen.actions = !railOpen.actions;
        applyRailCollapse();
      };
    });
    applyRailCollapse();
    applySprite();
  }

  function applySprite() {
    $("runwayYing").src = `assets/chars/outfits/${outfit}-${action}.gif`;
    $("heroYing").src = `assets/chars/outfits/${outfit}-wave.gif`;
    const dong = { idle: "dong-idle.gif", wave: "dong-wave.gif", walk: "dong-walk.gif", jump: "dong-laugh.gif" };
    $("runwayDong").src = "assets/chars/" + (dong[action] || "dong-idle.gif");
    $("heroDong").src = "assets/chars/dong-wave.gif";
  }

  /* ============ 事件 ============ */
  function allEvents() {
    const fromCfg = Array.isArray(cfg.events) ? cfg.events : [];
    return fromCfg.concat(data.events).sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }

  function renderEvents() {
    const list = $("eventList");
    const items = allEvents();
    if ($("eventCount")) $("eventCount").textContent = items.length + " 个记录";
    if (!items.length) {
      list.innerHTML = ["第一件事", "一次旅行", "一个普通的晚上", "想记住的吵架和好", "过节", "第 1000 天"]
        .map((t) => `<div class="ghost-card">空位 · ${t}</div>`).join("");
      return;
    }
    // 按年份分组，做时间线
    const years = {};
    items.forEach((item) => {
      const y = String(item.date || "").slice(0, 4) || "未定";
      (years[y] = years[y] || []).push(item);
    });
    const YEAR_NOTES = {
      "2023": "初见 · 靠近",
      "2024": "一起出发",
      "2025": "远方与现场",
      "2026": "故事仍在继续"
    };
    const now = new Date();
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const YCOLORS = ["#e878bc", "#5adce6", "#e4c07a", "#9d8cf0", "#8ae6c4"];
    const YEAR_ORDER = Object.keys(years).sort();
    let seq = 0;
    const html = YEAR_ORDER.map((y, yi) => {
      const ycolor = YCOLORS[yi % YCOLORS.length];
      const cards = years[y].map((item) => {
        const photo = item.photo ? `<img src="${escapeAttr(item.photo)}" alt="" />` : "";
        const canDel = Boolean(item.id);
        const d = parseDate(item.date);
        const diff = Math.round((d.getTime() - t0.getTime()) / 86400000);
        const coming = diff > 0 ? `<span class="tl-coming">还有 ${diff} 天</span>` : "";
        const delay = Math.min(seq, 10) * 70; // 逐条浮现的错峰延迟
        seq += 1;
        return `<article class="tl-item reveal" style="--d:${delay}ms">
          <span class="tl-node" aria-hidden="true"></span>
          <div class="event-card">
            ${canDel ? `<button type="button" class="del" data-del-event="${item.id}">删除</button>` : ""}
            <div class="tl-date">
              <time>${escapeHtml(item.date || "")}</time>
              ${coming}
            </div>
            <h3>${escapeHtml(item.title || "")}</h3>
            <p>${escapeHtml(item.text || "")}</p>
            ${photo}
          </div>
        </article>`;
      }).join("");
      return `<div class="tl-year">
        <b class="tl-year-badge" style="color:${ycolor};text-shadow:0 0 12px ${ycolor}88">${escapeHtml(y)}</b>
        <span class="tl-year-count">${years[y].length} 件${YEAR_NOTES[y] ? " · " + YEAR_NOTES[y] : ""}</span>
        <span class="tl-year-line"></span>
      </div>
      <div class="tl-items">${cards}</div>`;
    }).join("");
    list.innerHTML = `<div class="tl-wrap">${html}</div>`;
    watchReveal(list);
    list.querySelectorAll("[data-del-event]").forEach((btn) => {
      btn.onclick = () => {
        data.events = data.events.filter((e) => e.id !== btn.dataset.delEvent);
        store.save(data);
        renderEvents();
      };
    });
  }

  /* 滚动到视野内时，逐条浮现 */
  function watchReveal(root) {
    const els = root.querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    if (!revealObs) {
      revealObs = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            revealObs.unobserve(en.target);
          }
        });
      }, { threshold: 0.06 });
    }
    els.forEach((el) => revealObs.observe(el));
  }

  /* ============ 相册 ============ */
  function allPhotos() {
    const fromCfg = Array.isArray(cfg.photos) ? cfg.photos : [];
    return fromCfg.concat(data.photos);
  }

  function renderAlbum() {
    const grid = $("albumGrid");
    const photos = allPhotos();
    lbList = photos.map((p) => (typeof p === "string" ? { src: p, caption: "" } : p));
    if (!photos.length) {
      grid.innerHTML = Array.from({ length: 8 }, () =>
        `<div class="ghost-photo">相册</div>`
      ).join("");
      return;
    }
    grid.innerHTML = photos.map((p, i) => {
      const src = typeof p === "string" ? p : p.src;
      const caption = typeof p === "string" ? "" : [p.date, p.caption].filter(Boolean).join(" · ");
      const id = p && p.id ? p.id : "";
      return `<figure class="photo-card" data-lb="${i}">
        ${id ? `<button type="button" class="del" data-del-photo="${id}">删除</button>` : ""}
        <img src="${escapeAttr(src)}" alt="" loading="lazy" />
        <figcaption>${escapeHtml(caption || "相册")}</figcaption>
      </figure>`;
    }).join("");
    grid.querySelectorAll("[data-del-photo]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        data.photos = data.photos.filter((p) => p.id !== btn.dataset.delPhoto);
        store.save(data);
        renderAlbum();
      };
    });
    grid.querySelectorAll("[data-lb]").forEach((card) => {
      card.querySelector("img").onclick = () => openLightbox(Number(card.dataset.lb));
    });
  }

  /* ============ 大图查看 ============ */
  function setupLightbox() {
    $("lbClose").onclick = closeLightbox;
    $("lbPrev").onclick = (e) => { e.stopPropagation(); stepLightbox(-1); };
    $("lbNext").onclick = (e) => { e.stopPropagation(); stepLightbox(1); };
    $("lightbox").addEventListener("click", (e) => {
      if (e.target === $("lightbox")) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (!$("lightbox").classList.contains("hidden")) {
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") stepLightbox(-1);
        if (e.key === "ArrowRight") stepLightbox(1);
      }
      if (e.key === "Escape" && !$("modal").classList.contains("hidden")) {
        $("modal").classList.add("hidden");
      }
    });
  }

  function openLightbox(index) {
    if (!lbList.length) return;
    lbIndex = (index + lbList.length) % lbList.length;
    const p = lbList[lbIndex];
    $("lbImg").src = typeof p === "string" ? p : p.src;
    $("lbCaption").textContent = (typeof p === "string" ? "" : [p.date, p.caption].filter(Boolean).join(" · ")) || "";
    $("lightbox").classList.remove("hidden");
  }

  function stepLightbox(diff) {
    if (lbIndex < 0) return;
    openLightbox(lbIndex + diff);
  }

  function closeLightbox() {
    $("lightbox").classList.add("hidden");
  }

  /* ============ 信 ============ */
  function renderLetter() {
    const t = elapsed();
    const raw = cfg.letter || "";
    $("letterBody").textContent = raw
      .replaceAll("{{herName}}", cfg.herName || "你")
      .replaceAll("{{myName}}", cfg.myName || "我")
      .replaceAll("{{days}}", String(t.days))
      .replaceAll("{{startDate}}", cfg.startDate || "");
  }

  /* ============ 吃喝 ============ */
  function setupFood() {
    // 版本变了自动换成 config 里的默认菜单；你自己在网页里加过的菜会保留
    const seedVer = String(FOOD_SEEDS.v || "0");
    if (!data.food || String(data.food.v || "") !== seedVer) {
      const old = data.food || {};
      const merge = (key) => {
        const fresh = foodSeedItems(key).map((d) => ({ name: d.name, rate: d.rate || 3 }));
        const kept = (old[key] || []).filter(
          (it) => it && it.name && !fresh.some((n) => n.name === it.name)
        );
        return fresh.concat(kept);
      };
      data.food = { v: seedVer, menu: merge("menu"), milktea: merge("milktea") };
      store.save(data);
    }
    $$(".f-sub", $("foodTabs")).forEach((b) => {
      b.onclick = () => {
        curFood = b.dataset.food;
        renderFood();
      };
    });
    $("foodAdd").onclick = addFoodItem;
    $("foodRows").onclick = onFoodClick;
    renderFood();
  }

  function foodList() {
    data.food = data.food || { menu: [], milktea: [] };
    data.food.menu = data.food.menu || [];
    data.food.milktea = data.food.milktea || [];
    return data.food[curFood] || [];
  }

  function renderFood() {
    $$(".f-sub", $("foodTabs")).forEach((b) => b.classList.toggle("is-on", b.dataset.food === curFood));
    $("foodTitle").textContent = curFood === "menu" ? "菜单" : "奶茶";
    const catCfg = FOOD_SEEDS[curFood];
    const note = catCfg && !Array.isArray(catCfg) ? (catCfg.note || "") : "";
    if ($("foodNote")) $("foodNote").textContent = note;
    const list = foodList();
    if (!list.length) {
      $("foodRows").innerHTML = `<div class="ghost-card">还没有记录，点右上角「＋ 添加」</div>`;
      return;
    }
    $("foodRows").innerHTML = list.map((item, i) => {
      const rate = Math.max(1, Math.min(5, item.rate || 3));
      const al = RATE_ALPHA[rate - 1]; // 浓度随喜爱程度
      const hearts = [1, 2, 3, 4, 5].map((n) =>
        `<button type="button" class="hk${n <= rate ? " on" : ""}" data-rate="${n}" aria-label="${n} 心">♥</button>`
      ).join("");
      return `<div class="food-row" data-index="${i}">
        <span class="dot" style="background:linear-gradient(180deg,${FOOD_A}${alphaHex(al)},${FOOD_B}${alphaHex(al)});box-shadow:0 0 0 3px ${FOOD_A}${alphaHex(al * 0.3)}"></span>
        <button type="button" class="name-bar" data-edit-food title="点击改名" style="background:linear-gradient(180deg,${FOOD_A}${alphaHex(al)},${FOOD_B}${alphaHex(al)});border-color:${FOOD_A}${alphaHex(al)}">${escapeHtml(item.name || "")}</button>
        <div class="rate-bar" style="background:linear-gradient(90deg,${RATE_A}${alphaHex(al * 0.7)},${RATE_B}${alphaHex(al * 0.9)});border-color:${RATE_A}${alphaHex(al * 0.55)}"><small>喜爱程度</small><span class="hearts">${hearts}</span></div>
        <button type="button" class="row-del" data-del-food title="删除">×</button>
      </div>`;
    }).join("");
  }

  function onFoodClick(e) {
    const row = e.target.closest(".food-row");
    if (!row) return;
    const idx = Number(row.dataset.index);
    const list = foodList();
    if (e.target.closest("[data-rate]")) {
      list[idx].rate = Number(e.target.closest("[data-rate]").dataset.rate);
      store.save(data);
      renderFood();
      return;
    }
    if (e.target.closest("[data-del-food]")) {
      if (!confirm("删除「" + (list[idx].name || "") + "」？")) return;
      list.splice(idx, 1);
      store.save(data);
      renderFood();
      return;
    }
    if (e.target.closest("[data-edit-food]")) {
      const name = prompt("改成什么名字？", list[idx].name || "");
      if (name === null) return;
      list[idx].name = name.trim() || list[idx].name;
      store.save(data);
      renderFood();
    }
  }

  function addFoodItem() {
    const cat = curFood === "menu" ? "菜单" : "奶茶";
    const name = prompt("给「" + cat + "」加什么？");
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    foodList().push({ name: trimmed, rate: 3 });
    store.save(data);
    renderFood();
  }

  /* ============ 玩乐 ============ */
  function setupFun() {
    const DOT_COLORS = ["#e878bc", "#9d8cf0", "#5adce6", "#e4c07a", "#8ae6c4", "#ff9d7a", "#7fb8f7", "#f08a5a", "#f2a8d4"];
    $("funList").innerHTML = FUN.map((f, i) =>
      `<button type="button" class="fun-btn" data-fun="${f.id}"><span class="dot" style="background:${DOT_COLORS[i % DOT_COLORS.length]};box-shadow:0 0 0 3px ${DOT_COLORS[i % DOT_COLORS.length]}2e"></span><span>${escapeHtml(f.name)}</span></button>`
    ).join("") || `<div class="ghost-card">在 js/config.js 里添加 fun</div>`;
    $("funList").onclick = (e) => {
      const btn = e.target.closest("[data-fun]");
      if (!btn) return;
      curFun = btn.dataset.fun;
      $$(".fun-btn", $("funList")).forEach((b) => b.classList.toggle("is-on", b === btn));
      renderFunDetail();
    };
    renderFunDetail();
  }

  function renderFunDetail() {
    const box = $("funDetail");
    const item = FUN.find((f) => f.id === curFun);
    if (!item) {
      box.innerHTML = `<div class="fun-idle">
        <span class="fun-idle-icon">▸▸</span>
        <p>点左边任意一项，<br>右边显示对应的选择页面。</p>
      </div>`;
      return;
    }
    if (item.type === "link") {
      const open = item.url
        ? `<a class="btn btn-accent" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">打开 ${escapeHtml(item.note || item.name)}</a>`
        : `<button type="button" class="btn btn-accent" id="funLinkEmpty">还没有链接</button>`;
      box.innerHTML = `
        <h3>${escapeHtml(item.name)}</h3>
        <div class="map-line"><b>${escapeHtml(item.name)}</b>：<span>${escapeHtml(item.note || "打开链接")}</span></div>
        ${open}
        <p class="fun-sub">${escapeHtml(item.url || "在 config.js 里给它填 url")}</p>`;
      const empty = $("funLinkEmpty");
      if (empty) empty.onclick = () => toast("这一项还没有链接，在 config.js 里填 url");
      return;
    }
    if (item.type === "platforms") {
      box.innerHTML = `
        <h3>选择页面</h3>
        <p class="fun-brief">${escapeHtml(item.name)} · ${escapeHtml(item.note || "进入选择页面")}</p>
        <div class="platform-grid">${(item.platforms || []).map((p) =>
          `<button type="button" class="platform-btn" data-url="${escapeAttr(p.url || "")}">${escapeHtml(p.name)}</button>`
        ).join("") || `<div class="ghost-card">还没有平台，在 config.js 里填</div>`}</div>`;
      box.querySelectorAll(".platform-btn").forEach((b) => {
        b.onclick = () => {
          if (b.dataset.url) window.open(b.dataset.url, "_blank");
        };
      });
      return;
    }
    if (item.type === "address") {
      box.innerHTML = `
        <h3>逛街 · 想去哪里</h3>
        <p class="fun-brief">写上地址，点「打开地图」直接导航。</p>
        <label class="fun-label">地址 / 商场<input type="text" id="funAddr" maxlength="80" placeholder="例如：万象城 3 楼" value="${escapeAttr(data.address || "")}" /></label>
        <div class="row-btns">
          <button type="button" class="btn btn-accent" id="funAddrSave">保存</button>
          <button type="button" class="btn" id="funMap">打开地图</button>
          <button type="button" class="btn btn-ghost" id="funCopyAddr">复制</button>
        </div>`;
      $("funAddrSave").onclick = () => {
        data.address = $("funAddr").value.trim();
        store.save(data);
        toast(data.address ? "地址已保存" : "地址已清空");
        renderFunDetail();
      };
      $("funMap").onclick = () => {
        const val = $("funAddr").value.trim() || data.address || "";
        if (!val) {
          toast("先输入想去的地址");
          return;
        }
        window.open("https://uri.amap.com/search?keyword=" + encodeURIComponent(val), "_blank");
      };
      $("funCopyAddr").onclick = () => copyText($("funAddr").value.trim() || data.address || "");
      return;
    }
    if (item.type === "phone") {
      box.innerHTML = `
        <h3>约会 · 联系 TA</h3>
        <div class="contact-line">请拨：<b>${escapeHtml(cfg.phone || "")}</b></div>
        <div class="row-btns">
          <a class="btn btn-accent" href="tel:${escapeAttr(cfg.phone || "")}">拨打电话</a>
          <button type="button" class="btn btn-ghost" id="funCopyPhone">复制号码</button>
        </div>`;
      $("funCopyPhone").onclick = () => copyText(cfg.phone || "");
      return;
    }
    box.innerHTML = `<div class="fun-idle"><p>这一项还没有配置。</p></div>`;
  }

  /* ============ Game ============ */
  function setupGame() {
    $("gameCards").innerHTML = GAMES.map((g, i) => {
      const icon = g.icon
        ? `<img class="game-icon" src="${escapeAttr(g.icon)}" alt="" />`
        : `<span class="game-icon game-icon-pix" aria-hidden="true">✦</span>`;
      return `<button type="button" class="game-card${i === 0 ? " special" : ""}${g.id === curGame ? " is-on" : ""}" data-game="${g.id}">
        ${icon}
        <span class="game-name">${escapeHtml(g.name)}</span>
      </button>`;
    }).join("") || `<div class="ghost-card">在 js/config.js 里添加 games</div>`;
    $("gameCards").onclick = (e) => {
      const btn = e.target.closest("[data-game]");
      if (!btn) return;
      curGame = btn.dataset.game;
      curRole = null;
      renderGameRoles();
      renderGameCards();
    };
    renderGameRoles();
  }

  function renderGameCards() {
    $$(".game-card", $("gameCards")).forEach((b) => {
      b.classList.toggle("is-on", b.dataset.game === curGame);
    });
  }

  function renderGameRoles() {
    const panel = $("rolePanel");
    const game = GAMES.find((g) => g.id === curGame);
    if (!game) {
      panel.classList.add("hidden");
      return;
    }
    panel.classList.remove("hidden");
    $("roleRow").innerHTML = (game.roles || []).map((r) =>
      `<button type="button" class="role-btn${r === curRole ? " is-on" : ""}" data-role="${escapeAttr(r)}">${escapeHtml(r)}</button>`
    ).join("") || `<span class="pick-line">还没有角色，在 config.js 里填</span>`;
    $("roleRow").onclick = (e) => {
      const btn = e.target.closest("[data-role]");
      if (!btn) return;
      curRole = btn.dataset.role;
      renderGameRoles();
      toast(`已选择 ${game.name} · ${curRole}`);
    };
    $("gameStart").innerHTML = `
      <span class="pick-line">${curRole ? `今天和 ${escapeHtml(cfg.herName || "TA")} 用「${escapeHtml(curRole)}」一起玩 ${escapeHtml(game.name)}` : `先点一个角色`}</span>
      ${game.url ? `<a class="btn btn-accent btn-sm" href="${escapeAttr(game.url)}" target="_blank" rel="noopener">去玩</a>` : ""}
    `;
  }

  /* ============ 聊天 ============ */
  function setupChat() {
    data.chat = Array.isArray(data.chat) ? data.chat : [];
    renderChat();
    $("chatForm").onsubmit = (e) => {
      e.preventDefault();
      const input = $("chatInput");
      const text = input.value.trim();
      if (!text) return;
      const msg = { id: store.uid(), who: me, text, time: Date.now() };
      data.chat.push(msg);
      store.save(data);
      input.value = "";
      renderChat();
      if (cloudReady) sendToCloud(msg);
      if (chatHandle) syncChatFile();
    };
    $("chatClear").onclick = () => {
      if (!confirm("清空全部聊天记录？")) return;
      data.chat = [];
      store.save(data);
      renderChat();
      if (cloudReady) {
        supabase.from("chat").delete().neq("id", "").then(() => loadCloudChat());
      }
      if (chatHandle) syncChatFile();
    };
    $("chatSync").onclick = () => pickChatDir();
    safe(() => setupCloudChat());
  }

  /* ============ 云端实时同步（Supabase，可选） ============ */
  function setupCloudChat() {
    const cloud = cfg.cloud || {};
    if (!cloud.enabled || !cloud.url || !cloud.anonKey || !window.supabase) return;
    try {
      supabase = window.supabase.createClient(cloud.url, cloud.anonKey);
    } catch (e) {
      toast("云端配置不对，检查 config.js 的 cloud");
      return;
    }
    cloudReady = true;
    loadCloudChat();
    chatChannel = supabase
      .channel("chat-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat" }, () => loadCloudChat())
      .subscribe();
    // 兜底：每 20 秒自动拉一次 + 标签页切回前台立即拉取
    setInterval(() => {
      if (cloudReady) loadCloudChat();
    }, 20000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && cloudReady) loadCloudChat();
    });
    renderChat();
  }

  async function loadCloudChat() {
    if (!cloudReady) return;
    try {
      const { data: rows, error } = await supabase
        .from("chat")
        .select("*")
        .order("time", { ascending: true })
        .limit(500);
      if (error) return;
      data.chat = (rows || []).map((r) => ({ id: r.id, who: r.who, text: r.text, time: Number(r.time) }));
      store.save(data);
      renderChat();
    } catch (e) {
      /* 网络波动时忽略，下一条推送会再刷 */
    }
  }

  function sendToCloud(msg) {
    supabase.from("chat").insert([
      { id: msg.id, who: msg.who, text: msg.text, time: msg.time }
    ]).then(({ error }) => {
      if (error) {
        // 云端失败：本地已有这条记录，不丢消息
        toast("云端发送失败，已存到本地");
      }
    });
  }

  /* 连接一个文件夹，两个浏览器都连同一个文件夹就能互相同步聊天 */
  async function pickChatDir() {
    if (!window.showDirectoryPicker) {
      toast("当前浏览器不支持文件夹同步，请用 Chrome / Edge");
      return;
    }
    try {
      chatHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    } catch (e) {
      return; // 用户取消选择
    }
    await syncChatFile(true);
  }

  function mergeMsgs(a, b) {
    const map = new Map();
    [...a, ...b].forEach((m) => {
      if (m && m.id && m.text != null && !map.has(m.id)) map.set(m.id, m);
    });
    return [...map.values()].sort((x, y) => (x.time || 0) - (y.time || 0));
  }

  async function syncChatFile(first) {
    if (!chatHandle) return;
    try {
      // 先读文件夹里已有的记录，合并后写回（两边都不丢消息）
      let disk = null;
      try {
        const fh = await chatHandle.getFileHandle("chat.json", { create: true });
        const file = await fh.getFile();
        disk = JSON.parse(await file.text());
      } catch (e) {
        disk = null; // 还没有聊天文件
      }
      const diskMsgs = disk && Array.isArray(disk.chat) ? disk.chat : [];
      const merged = mergeMsgs(diskMsgs, data.chat || []);
      data.chat = merged;
      store.save(data);
      const w = await chatHandle.getFileHandle("chat.json", { create: true });
      const ws = await w.createWritable();
      await ws.write(JSON.stringify({ chat: merged, savedAt: Date.now() }, null, 2));
      await ws.close();
      renderChat();
      if (first) toast("已连接文件夹，聊天记录已同步");
    } catch (e) {
      toast("文件同步失败，请重新点「连接文件夹」");
    }
  }

  function renderChat() {
    const log = $("chatLog");
    const myName = me === "him" ? (cfg.myName || "小栋") : (cfg.herName || "小颖");
    const herName = cfg.herName || "小颖";
    const myNameCfg = cfg.myName || "小栋";
    $("chatWho").innerHTML = "你正以「<b>" + escapeHtml(myName) + "</b>」的身份说话 · " +
      (me === "him" ? herName : myNameCfg) + " 切换身份请重新登录" +
      (cloudReady ? " · <b class=\"cloud-on\">实时同步中 ✧</b>" : "");
    $("chatSync").textContent = cloudReady ? "实时同步 ✧" : (chatHandle ? "文件夹已连接 ✧" : "连接文件夹");
    if (cloudReady) $("chatSync").classList.add("btn-cyan");
    else $("chatSync").classList.remove("btn-cyan");
    const msgs = data.chat || [];
    if (!msgs.length) {
      log.innerHTML = `<div class="chat-empty">还没有消息，写下第一句吧。</div>`;
      return;
    }
    let lastDay = "";
    const rows = msgs.map((m) => {
      const d = new Date(m.time || Date.now());
      const day = d.toDateString();
      const dayDiv = day !== lastDay
        ? `<div class="chat-day"><span>${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}</span></div>`
        : "";
      lastDay = day;
      const isHim = m.who === "him";
      const whoName = isHim ? myNameCfg : herName;
      const avatar = isHim ? "assets/chars/dong-idle.gif" : "assets/chars/ying-blink.gif";
      const mine = m.who === me;
      return `${dayDiv}
        <div class="msg ${mine ? "me" : "other"}">
          <img class="msg-avatar pixel" src="${avatar}" alt="" />
          <div class="bubble-wrap">
            <span class="msg-name">${escapeHtml(whoName)}${mine ? "（我）" : ""}</span>
            <div class="bubble">${escapeHtml(m.text || "")}</div>
            <span class="msg-time">${pad(d.getHours())}:${pad(d.getMinutes())}</span>
          </div>
        </div>`;
    }).join("");
    log.innerHTML = rows;
    log.scrollTop = log.scrollHeight;
  }

  /* ============ 弹窗、编辑 ============ */
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
      toast("照片已加入相册");
    };

    const drop = $("dropzone");
    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("drag");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
    drop.addEventListener("drop", async (e) => {
      e.preventDefault();
      drop.classList.remove("drag");
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
      if (files.length) toast("照片已加入相册");
    });

    $("exportBtn").onclick = () => store.exportJson();
    $("importFile").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        data = await store.importJson(file);
        renderEvents();
        renderAlbum();
        renderFood();
        renderFunDetail();
        safe(() => renderChat());
        toast("备份已导入");
      } catch (err) {
        toast("导入失败，请检查文件");
      }
      e.target.value = "";
    };
  }

  function openModal(kind) {
    const modal = $("modal");
    ["eventForm", "photoForm"].forEach((id) => {
      $(id).classList.toggle("hidden", (kind === "event" ? "eventForm" : "photoForm") !== id);
    });
    $("eventForm").reset();
    $("photoForm").reset();
    modal.classList.remove("hidden");
    setTimeout(() => {
      const first = modal.querySelector("input:not([type=file]), textarea");
      if (first) first.focus();
    }, 60);
  }

  async function copyText(text) {
    if (!text) {
      toast("还没有内容可复制");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("已复制：" + text);
    } catch (e) {
      toast("复制失败，请手动复制");
    }
  }

  /* ============ 音乐 ============ */
  function setupMusic() {
    if (!cfg.music) return;
    const audio = $("bgm");
    audio.src = cfg.music;
    const toggle = () => {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    };
    $("musicBtn").classList.remove("hidden");
    $("musicBtn2").classList.remove("hidden");
    $("musicBtn").onclick = toggle;
    $("musicBtn2").onclick = toggle;
  }

  /* ============ Toast ============ */
  function setupToast() {
    /* 无初始化逻辑，占位 */
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
  }

  /* ============ 工具 ============ */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }
})();
