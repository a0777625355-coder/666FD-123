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
    { id: "seaside", name: "海边裙装" },
    { id: "flower", name: "蓝花环白长裙" },
    { id: "blackcoat", name: "黑色长外套" },
    { id: "winter", name: "白色羽绒服" }
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
  let curHeroSkin = 0;
  let curVariantHero = "xiaoqiao";
  let curVariantSkin = "original";
  let curFun = null;
  let me = "her"; // 当前登录身份：her=小颖 / him=小栋
  let chatHandle = null; // 聊天文件的文件夹句柄（文件同步用）
  let cloudReady = false; // 云端实时同步是否已连接
  let supabase = null; // 云端客户端
  let chatChannel = null; // 实时订阅通道
  let gameSound = null;
  let lastDays = -1;
  let toastTimer = null;
  let lbList = [];
  let lbIndex = -1;
  let revealObs = null;
  const GATE_SESSION_KEY = "our1000days.gate.v1";
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
  const GAME_SOUNDS = {
    hok: { file: "assets/audio/timi.mp3", label: "王者音效" },
    ys: { file: "assets/audio/genshin-start.mp3", label: "原神音效" }
  };
  const HERO_SKINS = {
    "小乔": [
      { name: "原皮", file: "assets/games/heroes/xiaoqiao-original.gif", color: "#ff8fc9" },
      { name: "定香结", file: "assets/games/heroes/xiaoqiao-dingxiang.gif", color: "#f3a56f" },
      { name: "时之魔女", file: "assets/games/heroes/xiaoqiao-witch.gif", color: "#b68cff" },
      { name: "线条小狗", file: "assets/games/heroes/xiaoqiao-puppy.gif", color: "#9bcff8" },
      { name: "HelloKitty联动", file: "assets/games/heroes/xiaoqiao-kitty.gif", color: "#ff78b8" }
    ],
    "大乔": [
      { name: "原皮", file: "assets/games/heroes/daqiao-original.gif", color: "#6ad9ed" },
      { name: "花嫁", file: "assets/games/heroes/daqiao-bride.gif", color: "#f3a6cd" },
      { name: "时之奇旅", file: "assets/games/heroes/daqiao-journey.gif", color: "#8ca2ff" },
      { name: "白鹤梁神女", file: "assets/games/heroes/daqiao-goddess.gif", color: "#72d6d2" }
    ],
    "杨玉环": [
      { name: "原皮", file: "assets/games/heroes/yangyuhuan-original.gif", color: "#8bd8b0" },
      { name: "星之鸣奏", file: "assets/games/heroes/yangyuhuan-melody.gif", color: "#9f91f5" },
      { name: "银翎春语", file: "assets/games/heroes/yangyuhuan-silver.gif", color: "#9ddbea" },
      { name: "寅虎·心曲", file: "assets/games/heroes/yangyuhuan-tiger.gif", color: "#efb36e" }
    ]
  };
  const VARIANT_MOODS = [
    { id: "happy", name: "开心", mark: "♥" },
    { id: "angry", name: "生气", mark: "✦" },
    { id: "helpless", name: "无奈", mark: "…" },
    { id: "sad", name: "难过", mark: "◆" },
    { id: "gloomy", name: "郁闷", mark: "☁" },
    { id: "excited", name: "兴奋", mark: "★" },
    { id: "invincible", name: "无敌", mark: "⚡" }
  ];
  const VARIANT_HEROES = {
    xiaoqiao: {
      name: "小乔", tone: "#f28bc3",
      skins: [
        { id: "original", name: "原皮" },
        { id: "dingxiang", name: "定香结" },
        { id: "witch", name: "时之魔女" },
        { id: "puppy", name: "线条小狗" },
        { id: "kitty", name: "HelloKitty联动" }
      ]
    },
    daqiao: {
      name: "大乔", tone: "#67d4e5",
      skins: [
        { id: "original", name: "原皮" },
        { id: "bride", name: "花嫁" },
        { id: "journey", name: "时之奇旅" },
        { id: "goddess", name: "白鹤梁神女" }
      ]
    },
    yangyuhuan: {
      name: "杨玉环", tone: "#8bd8b0",
      skins: [
        { id: "original", name: "原皮" },
        { id: "melody", name: "星之鸣奏" },
        { id: "silver", name: "银翎春语" },
        { id: "tiger", name: "寅虎·心曲" }
      ]
    }
  };
  const FUN_VISUALS = {
    movie:  { icon: "🎬", tag: "MOVIE NIGHT", line: "挑一部想看的，把今晚留给故事。", tone: "#e66fa8", image: "assets/chars/outfits/hoodie-idle.gif" },
    douyin: { icon: "♫", tag: "SHORT BREAK", line: "靠在一起，分享刚刚刷到的快乐。", tone: "#8e7ad9", image: "assets/chars/outfits/tee-wave.gif" },
    kpl:    { icon: "⚔", tag: "MATCH TIME", line: "为喜欢的队伍加油，也为彼此欢呼。", tone: "#48b9c8", image: "assets/variants/xiaoqiao/original-excited.png" },
    taobao: { icon: "🛍", tag: "WISH LIST", line: "把喜欢的小东西放进同一张愿望清单。", tone: "#d5a34b", image: "assets/chars/outfits/plaid-walk.gif" },
    short:  { icon: "▣", tag: "MINI SERIES", line: "短短一集，也可以成为一起笑的理由。", tone: "#68c9a8", image: "assets/chars/outfits/knit-idle.gif" },
    tv:     { icon: "▻", tag: "COUCH TIME", line: "选一个平台，开启两个人的客厅影院。", tone: "#ed8c72", image: "assets/chars/outfits/winter-idle.gif" },
    music:  { icon: "♪", tag: "OUR PLAYLIST", line: "听一首歌，把今天的心情收藏起来。", tone: "#6f9edb", image: "assets/variants/yangyuhuan/melody-happy.png" },
    street: { icon: "⌖", tag: "CITY WALK", line: "写下目的地，然后牵手出门。", tone: "#df7eb3", image: "assets/chars/outfits/blackcoat-walk.gif" },
    date:   { icon: "♥", tag: "DATE CALL", line: "认真约一次会，普通日子也会发光。", tone: "#e76f89", image: "assets/chars/couple-heart.gif", pair: true }
  };
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

    safe(() => setupGate());
    safe(() => setupGateCarousel());
    safe(() => setupTabs());
    safe(() => setupClock());
    safe(() => renderParade());
    safe(() => renderRailSelect());
    safe(() => setupPlanner());
    safe(() => renderEvents());
    safe(() => renderAlbum());
    safe(() => renderLetter());
    safe(() => setupEditor());
    safe(() => setupFood());
    safe(() => setupFun());
    safe(() => setupGame());
    safe(() => setupVariants());
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

  /* 首页 · 今天做什么（使用现有菜单与玩乐配置组合，不改动数据） */
  function setupPlanner() {
    const foods = foodSeedItems("menu").map((item) => item && item.name).filter(Boolean);
    const activities = FUN.filter((item) => !["address", "phone"].includes(item.type)).map((item) => item.name).filter(Boolean);
    const plans = [];
    const total = Math.max(8, Math.min(16, foods.length || 8));
    for (let i = 0; i < total; i++) {
      const food = foods[i % Math.max(foods.length, 1)] || "喜欢的晚餐";
      const activity = activities[(i * 3 + 1) % Math.max(activities.length, 1)] || "散散步";
      plans.push({
        text: `一起吃${food}，然后${activity}`,
        hint: i % 3 === 0 ? "今天不赶时间，慢慢待在一起。" : (i % 3 === 1 ? "普通的一天，也值得认真收藏。" : "如果都不想选，那就牵手出去走走。")
      });
    }
    plans.push(
      { text: "选一套新皮肤，一起开一局王者荣耀", hint: "小乔、大乔与杨玉环的 13 套动作素材都已经准备好了。" },
      { text: "翻一遍相册，再补一张今天的照片", hint: "让今天也成为以后会想念的一页。" },
      { text: "什么也不安排，靠在一起看一部电影", hint: "最舒服的约会，也可以没有行程表。" }
    );
    let index = new Date().getDate() % plans.length;
    const show = () => {
      const plan = plans[index];
      if ($("planText")) $("planText").textContent = plan.text;
      if ($("planHint")) $("planHint").textContent = plan.hint;
    };
    show();
    if ($("planBtn")) $("planBtn").onclick = () => {
      index = (index + 1 + Math.floor(Math.random() * Math.max(1, plans.length - 1))) % plans.length;
      show();
      $("planBtn").classList.remove("pop");
      void $("planBtn").offsetWidth;
      $("planBtn").classList.add("pop");
    };
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

  /* ============ 登录场景：像素海边黄昏 · 牵手漫步（宫崎骏 / 新海诚氛围） ============ */
  function setupGateScene() {
    const cv = $("gateCanvas");
    if (!cv) return;
    const W = 120, H = 68; // 像素网格（整体放大，呈现像素质感）
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");

    // ---- 静态层：天空 / 太阳 / 大海 / 远山 / 沙滩 ----
    const base = document.createElement("canvas");
    base.width = W; base.height = H;
    const b = base.getContext("2d");
    const circ = (x, y, r, col) => {
      b.fillStyle = col;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++)
          if (dx * dx + dy * dy <= r * r) b.fillRect(x + dx, y + dy, 1, 1);
    };
    // 天空（蓝 → 粉 渐变，梦幻晚霞）
    const sky = ["#0c1233", "#1b2a63", "#2e3f8e", "#4a5db8", "#6b7ad0", "#8f8ad4", "#b59ade", "#d5abe0", "#eec2e2", "#ffd9ec"];
    for (let y = 0; y < 44; y++) {
      const t = y / 43;
      b.fillStyle = sky[Math.min(sky.length - 1, Math.floor(t * sky.length))];
      b.fillRect(0, y, W, 1);
    }
    // 星星（夜空高区）
    for (let i = 0; i < 10; i++) {
      b.fillStyle = "rgba(255,255,255,.5)";
      b.fillRect((i * 37 + 5) % W, 2 + (i * 7) % 9, 1, 1);
    }
    // 柔粉色暮色光球（贴近海平面）
    const sunX = 90, sunY = 40;
    circ(sunX, sunY, 8, "rgba(233,160,220,.22)");
    circ(sunX, sunY, 6, "rgba(255,190,228,.38)");
    circ(sunX, sunY, 4, "#ffd0e8");
    circ(sunX, sunY, 3, "#fff0f8");
    // 大海（蓝紫）
    const sea = ["#8f9ee0", "#7286d4", "#5a6cc2", "#46509f", "#353a80", "#2a2c66"];
    for (let y = 44; y < 60; y++) {
      b.fillStyle = sea[Math.min(5, Math.floor(((y - 44) / 16) * 6))];
      b.fillRect(0, y, W, 1);
    }
    // 光球倒影光柱（粉色）
    for (let y = 44; y < 59; y++) {
      const wdt = Math.max(1, 5 - ((y - 44) >> 2));
      b.fillStyle = "rgba(255,196,230,.55)";
      b.fillRect(sunX - (wdt >> 1), y, wdt, 1);
    }
    // 远山剪影
    const hill = (hx, baseY, hw, hh, col) => {
      b.fillStyle = col;
      for (let x = hx - hw; x <= hx + hw; x++) {
        const h = Math.max(0, hh - Math.floor(Math.abs(x - hx) * hh / hw));
        b.fillRect(x, baseY - h, 1, h + 1);
      }
    };
    hill(16, 46, 26, 15, "rgba(58,38,92,.9)");
    hill(102, 46, 32, 11, "rgba(74,48,108,.85)");
    hill(116, 46, 15, 7, "rgba(86,58,122,.75)");
    // 沙滩（淡粉紫的暮色暖沙）
    for (let y = 60; y < H; y++) {
      const t = (y - 60) / (H - 60);
      b.fillStyle = t < .35 ? "#e4c6d4" : (t < .75 ? "#d6a9c6" : "#c595b8");
      b.fillRect(0, y, W, 1);
    }
    // 沙面噪点
    for (let i = 0; i < 40; i++) {
      b.fillStyle = "rgba(110,70,110,.28)";
      b.fillRect((i * 29 + 9) % W, 61 + (i * 11) % 6, 1, 1);
    }
    // ---- 动态层：流云 / 海面闪点 / 飞鸟 / 牵手情侣 / 冒爱心 ----
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();

    const drawCloud = (x, y, col, a) => {
      ctx.globalAlpha = a == null ? 1 : a;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 9, 2);
      ctx.fillRect(x + 2, y - 1, 5, 1);
      ctx.globalAlpha = 1;
    };
    const drawBird = (x, y) => {
      ctx.fillStyle = "#3a2a4a";
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x + 1, y - 1, 2, 1);
      ctx.fillRect(x + 3, y, 1, 1);
    };
    const drawHeart = (x, y) => {
      ctx.fillStyle = "#ff9bbd";
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x + 2, y, 1, 1);
      ctx.fillRect(x + 1, y - 1, 1, 1);
      ctx.fillRect(x + 1, y + 1, 1, 1);
    };
    // 牵手情侣（背影 · 男孩酒红褂 / 女孩棕长发白卫衣）
    const drawCouple = (bx, by, f) => {
      // 男孩腿
      ctx.fillStyle = "#26202e";
      if (f) { ctx.fillRect(bx + 1, by, 1, 4); ctx.fillRect(bx + 4, by, 1, 4); }
      else { ctx.fillRect(bx, by, 1, 4); ctx.fillRect(bx + 5, by, 1, 4); }
      ctx.fillStyle = "#7c4456";            // 酒红外套
      ctx.fillRect(bx - 1, by - 5, 7, 5);
      ctx.fillRect(bx + 5, by - 4, 2, 2);   // 伸向女孩的手
      ctx.fillStyle = "#33243a";            // 头发
      ctx.fillRect(bx, by - 10, 5, 5);
      // 女孩
      ctx.fillStyle = "#453a52";            // 裙
      ctx.fillRect(bx + 8, by - 2, 5, 2);
      ctx.fillStyle = "#26202e";
      if (f) { ctx.fillRect(bx + 8, by, 1, 4); ctx.fillRect(bx + 11, by, 1, 4); }
      else { ctx.fillRect(bx + 7, by, 1, 4); ctx.fillRect(bx + 12, by, 1, 4); }
      ctx.fillStyle = "#eceaf2";            // 白卫衣
      ctx.fillRect(bx + 7, by - 7, 6, 5);
      ctx.fillStyle = "#5c3a2c";            // 棕色长发
      ctx.fillRect(bx + 6, by - 12, 8, 5);
      ctx.fillRect(bx + 6, by - 7, 1, 4);
      ctx.fillRect(bx + 13, by - 7, 1, 4);
      ctx.fillStyle = "#6b4433";
      ctx.fillRect(bx + 7, by - 13, 6, 4);
    };

    const drawFrame = () => {
      const t = (performance.now() - t0) / 1000;
      ctx.drawImage(base, 0, 0);
      // 顶部星闪
      for (let i = 0; i < 4; i++) {
        if ((Math.floor(t * 2) + i) % 3 === 0) {
          ctx.fillStyle = "rgba(255,255,255,.85)";
          ctx.fillRect((i * 47 + 11) % W, 3 + (i * 9) % 7, 1, 1);
        }
      }
      // 流云（粉紫色）
      drawCloud(((t * 1.6) % (W + 60)) - 30, 7, "#b9a2e6", 0.9);
      drawCloud(((t * 1.1 + 60) % (W + 60)) - 30, 15, "#f2c4e6", 0.8);
      // 海面闪点（粉色系）
      for (let i = 0; i < 14; i++) {
        const sx = ((i * 37 + Math.floor(t * 6) * 11) % (W - 2)) + 1;
        const sy = 46 + ((i * 13) % 12);
        ctx.fillStyle = i % 2 ? "#ffd2e8" : "#ffffff";
        ctx.globalAlpha = 0.5;
        ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.globalAlpha = 1;
      // 飞鸟
      drawBird(((t * 5 + 24) % (W + 20)) - 10, 13 - Math.sin(t) * 2);
      drawBird(((t * 4 + 84) % (W + 20)) - 10, 9 + Math.sin(t * 1.3) * 2);
      // 牵手情侣沿沙滩漫步（从右往左缓缓走过，循环）
      const cx = Math.round(((t * 8) % (W + 44)) - 22);
      drawCouple(cx, 64, Math.floor(t * 2.5) % 2);
      // 偶发冒起的小爱心
      const hp = Math.floor(t * 1.6) % 5;
      if (hp < 4 && Math.sin(t * 1.6) > 0.2 && cx > -4 && cx < W - 4) {
        drawHeart(cx + 7, 48 - ((Math.floor(t * 4) + hp) % 8));
      }
    };

    drawFrame();
    if (!reduce) setInterval(drawFrame, 130);
  }

  /* ============ 登录页风景轮播（自动 + 手动切换） ============ */
  function setupGateCarousel() {
    const slides = $$(".gate-slide");
    if (!slides.length) return;
    const dotsBox = $("gateDots");
    const tag = $("gateTag");
    let idx = 0;
    let timer = null;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    dotsBox.innerHTML = slides.map((s, i) =>
      `<button type="button" class="gate-dot${i === 0 ? " on" : ""}" data-i="${i}" aria-label="第 ${i + 1} 张"></button>`
    ).join("");

    function show(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach((s, n) => s.classList.toggle("on", n === idx));
      dotsBox.querySelectorAll(".gate-dot").forEach((d, n) => d.classList.toggle("on", n === idx));
      if (tag && slides[idx].dataset.label) tag.textContent = slides[idx].dataset.label;
    }

    function startAuto() {
      if (reduce) return;
      clearInterval(timer);
      timer = setInterval(() => show(idx + 1), 5000);
    }

    $("gatePrev").onclick = () => { show(idx - 1); startAuto(); };
    $("gateNext").onclick = () => { show(idx + 1); startAuto(); };
    dotsBox.onclick = (e) => {
      const d = e.target.closest("[data-i]");
      if (!d) return;
      show(Number(d.dataset.i));
      startAuto();
    };
    startAuto();
  }

  /* ============ 门禁 ============ */
  function setupGate() {
    const unlockGate = (identity, remember) => {
      me = identity === "him" ? "him" : "her";
      if (remember) {
        try { localStorage.setItem(GATE_SESSION_KEY, me); } catch (e) { /* 保持无存储模式可用 */ }
      }
      document.documentElement.classList.add("gate-passed");
      $("gateErr").classList.add("hidden");
      $("gate").classList.add("bye");
      $("app").classList.remove("is-locked");
      safe(() => renderChat());
    };

    try {
      const remembered = localStorage.getItem(GATE_SESSION_KEY);
      if (remembered === "her" || remembered === "him") unlockGate(remembered, false);
    } catch (e) { /* 存储不可用时保留正常登录流程 */ }

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
        unlockGate(val === himCode ? "him" : "her", true);
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
    // 手机端侧边栏抽屉
    $("menuBtn").onclick = () => {
      document.querySelector(".rail").classList.contains("open") ? closeRail() : openRail();
    };
    $("railBackdrop").onclick = closeRail;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeRail();
    });
    switchView("home");
  }

  function openRail() {
    document.querySelector(".rail").classList.add("open");
    $("railBackdrop").classList.add("on");
    document.body.classList.add("rail-open");
  }

  function closeRail() {
    document.querySelector(".rail").classList.remove("open");
    $("railBackdrop").classList.remove("on");
    document.body.classList.remove("rail-open");
  }

  function switchView(name) {
    $$(".tab").forEach((b) => b.classList.toggle("is-on", b.dataset.view === name));
    $$(".view").forEach((v) => v.classList.toggle("is-on", v.id === "view-" + name));
    $("app").dataset.active = name;
    closeRail(); // 手机端切页后收起抽屉
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
      if ($("gateH")) {
        $("gateH").textContent = pad(t.hours);
        $("gateM").textContent = pad(t.mins);
        $("gateS").textContent = pad(t.secs);
      }
      $("heroNum").textContent = t.days;
      $("statDays").textContent = t.days;
      $("statHours").textContent = t.days * 24 + t.hours;
      $("statSunsets").textContent = t.days;
      const remain = 1000 - t.days;
      const progress = Math.max(0, Math.min(100, t.days / 10));
      if ($("railDay")) $("railDay").textContent = "DAY " + String(t.days).padStart(3, "0");
      if ($("milestoneFill")) $("milestoneFill").style.width = progress + "%";
      if ($("milestonePercent")) $("milestonePercent").textContent = progress.toFixed(1) + "%";
      if (remain > 0) {
        $("heroKicker").textContent = "UNTIL 1000";
        $("heroNote").textContent = "还差 " + remain + " 天";
        if ($("milestoneText")) $("milestoneText").textContent = "距离第 1000 天，还有 " + remain + " 天";
      } else if (remain === 0) {
        $("heroKicker").textContent = "TODAY";
        $("heroNote").textContent = "满 1000 天了";
        if ($("milestoneText")) $("milestoneText").textContent = "第 1000 天，今天正式解锁";
      } else {
        $("heroKicker").textContent = "1000 DAYS";
        $("heroNote").textContent = "第 1000 天已经过去，日子还在写";
        if ($("milestoneText")) $("milestoneText").textContent = "第 1000 天已收藏，故事继续";
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
      buddy("ying", "assets/chars/outfits/seaside-walk.gif"),
      buddy("ying", "assets/chars/outfits/flower-walk.gif"),
      buddy("ying", "assets/chars/outfits/blackcoat-walk.gif"),
      buddy("ying", "assets/chars/outfits/winter-walk.gif")
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
    if ($("heroYing")) $("heroYing").src = `assets/chars/outfits/${outfit}-wave.gif`;
    const dong = { idle: "dong-idle.gif", wave: "dong-wave.gif", walk: "dong-walk.gif", jump: "dong-laugh.gif" };
    $("runwayDong").src = "assets/chars/" + (dong[action] || "dong-idle.gif");
    if ($("heroDong")) $("heroDong").src = "assets/chars/dong-wave.gif";
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
    if ($("hubEventCount")) $("hubEventCount").textContent = items.length;
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

  /* ============ 百变小颖 · 静态角色图鉴 ============ */
  function setupVariants() {
    const tabs = $$("[data-variant-hero]");
    if (!tabs.length || !$("variantGallery")) return;
    tabs.forEach((btn) => {
      btn.onclick = () => {
        curVariantHero = btn.dataset.variantHero;
        curVariantSkin = VARIANT_HEROES[curVariantHero].skins[0].id;
        renderVariants();
      };
    });
    renderVariants();
  }

  function renderVariants() {
    const hero = VARIANT_HEROES[curVariantHero];
    if (!hero) return;
    let skinIndex = hero.skins.findIndex((skin) => skin.id === curVariantSkin);
    if (skinIndex < 0) {
      skinIndex = 0;
      curVariantSkin = hero.skins[0].id;
    }
    const skin = hero.skins[skinIndex];
    const view = $("view-variants");
    view.style.setProperty("--variant-tone", hero.tone);

    $$("[data-variant-hero]").forEach((btn) => {
      const on = btn.dataset.variantHero === curVariantHero;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-selected", String(on));
    });
    $("variantTitle").textContent = hero.name + " · " + skin.name;
    $("variantIndex").textContent = String(skinIndex + 1).padStart(2, "0") + " / " + String(hero.skins.length).padStart(2, "0");

    $("variantSkinTabs").innerHTML = hero.skins.map((item, index) =>
      `<button type="button" class="variant-skin${item.id === skin.id ? " is-on" : ""}" data-variant-skin="${item.id}">
        <span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(item.name)}
      </button>`
    ).join("");
    $$('[data-variant-skin]', $("variantSkinTabs")).forEach((btn) => {
      btn.onclick = () => {
        curVariantSkin = btn.dataset.variantSkin;
        renderVariants();
      };
    });

    const items = VARIANT_MOODS.map((mood, index) => ({
      src: `assets/variants/${curVariantHero}/${skin.id}-${mood.id}.png`,
      caption: `小颖 · ${hero.name} · ${skin.name} · ${mood.name}`,
      mood,
      index
    }));
    $("variantGallery").innerHTML = items.map((item) =>
      `<button type="button" class="variant-card" data-variant-image="${item.index}" aria-label="查看${escapeAttr(item.caption)}大图">
        <span class="variant-card-no">0${item.index + 1}</span>
        <span class="variant-card-mark">${item.mood.mark}</span>
        <img class="pixel" src="${item.src}" alt="${escapeAttr(item.caption)}" loading="lazy" decoding="async" />
        <span class="variant-card-caption"><b>${item.mood.name}</b><small>${escapeHtml(skin.name)}</small></span>
      </button>`
    ).join("");
    $$('[data-variant-image]', $("variantGallery")).forEach((btn) => {
      btn.onclick = () => {
        lbList = items.map((item) => ({ src: item.src, caption: item.caption }));
        openLightbox(Number(btn.dataset.variantImage));
      };
    });
  }

  /* ============ 相册 ============ */
  function allPhotos() {
    const fromCfg = Array.isArray(cfg.photos) ? cfg.photos : [];
    return fromCfg.concat(data.photos);
  }

  function renderAlbum() {
    const grid = $("albumGrid");
    const photos = allPhotos();
    if ($("hubPhotoCount")) $("hubPhotoCount").textContent = photos.length;
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
      card.querySelector("img").onclick = () => {
        lbList = allPhotos().map((p) => (typeof p === "string" ? { src: p, caption: "" } : p));
        openLightbox(Number(card.dataset.lb));
      };
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
    if (cloudReady) pushSiteData();
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
      if (cloudReady) pushSiteData();
      return;
    }
    if (e.target.closest("[data-del-food]")) {
      if (!confirm("删除「" + (list[idx].name || "") + "」？")) return;
      list.splice(idx, 1);
      store.save(data);
      renderFood();
      if (cloudReady) pushSiteData();
      return;
    }
    if (e.target.closest("[data-edit-food]")) {
      const name = prompt("改成什么名字？", list[idx].name || "");
      if (name === null) return;
      list[idx].name = name.trim() || list[idx].name;
      store.save(data);
      renderFood();
      if (cloudReady) pushSiteData();
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
    if (cloudReady) pushSiteData();
  }

  /* ============ 玩乐 ============ */
  function funVisual(item) {
    const meta = FUN_VISUALS[item.id] || { icon: "✦", tag: "TOGETHER", line: item.note || "一起做点喜欢的事。", tone: "#48b9c8", image: "assets/chars/ying-wave.gif" };
    return `<div class="fun-detail-hero" style="--fun-tone:${meta.tone}">
      <div class="fun-detail-copy">
        <span>${meta.tag}</span>
        <h3>${meta.icon} ${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(meta.line)}</p>
      </div>
      <div class="fun-detail-art${meta.pair ? " is-pair" : ""}">
        <i></i><img class="pixel" src="${meta.image}" alt="${escapeAttr(item.name)}角色插画" />
      </div>
    </div>`;
  }

  function setupFun() {
    const DOT_COLORS = ["#e878bc", "#9d8cf0", "#5adce6", "#e4c07a", "#8ae6c4", "#ff9d7a", "#7fb8f7", "#f08a5a", "#f2a8d4"];
    $("funList").innerHTML = FUN.map((f, i) => {
      const visual = FUN_VISUALS[f.id] || { icon: "✦", tag: "TOGETHER", tone: DOT_COLORS[i % DOT_COLORS.length] };
      return `<button type="button" class="fun-btn" data-fun="${f.id}" style="--fun-tone:${visual.tone}">
        <span class="fun-btn-icon">${visual.icon}</span>
        <span class="fun-btn-copy"><b>${escapeHtml(f.name)}</b><small>${visual.tag}</small></span>
        <span class="fun-btn-arrow">›</span>
      </button>`;
    }).join("") || `<div class="ghost-card">在 js/config.js 里添加 fun</div>`;
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
      box.innerHTML = `<div class="fun-idle-splash">
        <div class="fun-idle-copy"><h3>今天，一起做点什么？</h3></div>
        <div class="fun-idle-pair"><img class="pixel" src="assets/chars/outfits/hoodie-wave.gif" alt="小颖挥手" /><img class="pixel" src="assets/chars/dong-wave.gif" alt="小栋挥手" /></div>
      </div>
      <div class="fun-mini-grid">
        <article><b>${String(FUN.length).padStart(2, "0")}</b><span>种今日选择</span></article>
        <article><b>02</b><span>个人一起决定</span></article>
        <article><b>∞</b><span>种开心可能</span></article>
      </div>`;
      return;
    }
    if (item.type === "link") {
      const open = item.url
        ? `<a class="btn btn-accent" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">打开 ${escapeHtml(item.note || item.name)}</a>`
        : `<button type="button" class="btn btn-accent" id="funLinkEmpty">还没有链接</button>`;
      box.innerHTML = `${funVisual(item)}<div class="fun-detail-body">
        <div class="fun-choice-summary"><span>当前选择</span><b>${escapeHtml(item.note || item.name)}</b></div>
        <div class="fun-choice-action">${open}</div>
      </div>`;
      const empty = $("funLinkEmpty");
      if (empty) empty.onclick = () => toast("这一项还没有链接，在 config.js 里填 url");
      return;
    }
    if (item.type === "platforms") {
      box.innerHTML = `${funVisual(item)}<div class="fun-detail-body">
        <div class="fun-section-title"><b>选择播放平台</b></div>
        <div class="platform-grid">${(item.platforms || []).map((p) =>
          `<button type="button" class="platform-btn" data-url="${escapeAttr(p.url || "")}">${escapeHtml(p.name)}</button>`
        ).join("") || `<div class="ghost-card">还没有平台，在 config.js 里填</div>`}</div></div>`;
      box.querySelectorAll(".platform-btn").forEach((b) => {
        b.onclick = () => {
          if (b.dataset.url) window.open(b.dataset.url, "_blank");
        };
      });
      return;
    }
    if (item.type === "address") {
      box.innerHTML = `${funVisual(item)}<div class="fun-detail-body">
        <div class="fun-section-title"><b>想去哪里</b></div>
        <label class="fun-label">地址 / 商场<input type="text" id="funAddr" maxlength="80" placeholder="例如：万象城 3 楼" value="${escapeAttr(data.address || "")}" /></label>
        <div class="row-btns">
          <button type="button" class="btn btn-accent" id="funAddrSave">保存</button>
          <button type="button" class="btn" id="funMap">打开地图</button>
          <button type="button" class="btn btn-ghost" id="funCopyAddr">复制</button>
        </div></div>`;
      $("funAddrSave").onclick = () => {
        data.address = $("funAddr").value.trim();
        store.save(data);
        toast(data.address ? "地址已保存" : "地址已清空");
        renderFunDetail();
        if (cloudReady) pushSiteData();
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
      box.innerHTML = `${funVisual(item)}<div class="fun-detail-body">
        <div class="fun-section-title"><b>联系 TA</b></div>
        <div class="contact-line"><b>${escapeHtml(cfg.phone || "")}</b></div>
        <div class="row-btns">
          <a class="btn btn-accent" href="tel:${escapeAttr(cfg.phone || "")}">拨打电话</a>
          <button type="button" class="btn btn-ghost" id="funCopyPhone">复制号码</button>
        </div></div>`;
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
      const soundLabel = GAME_SOUNDS[g.id] ? "，点击播放音效" : "";
      return `<button type="button" class="game-card${i === 0 ? " special" : ""}${g.id === curGame ? " is-on" : ""}" data-game="${g.id}" aria-label="${escapeAttr(g.name + soundLabel)}">
        ${icon}
        <span class="game-name">${escapeHtml(g.name)}</span>
      </button>`;
    }).join("") || `<div class="ghost-card">在 js/config.js 里添加 games</div>`;
    $("gameCards").onclick = (e) => {
      const btn = e.target.closest("[data-game]");
      if (!btn) return;
      curGame = btn.dataset.game;
      curRole = null;
      curHeroSkin = 0;
      stopGameSound();
      playGameSound(curGame);
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
      if ($("gameHeroShowcase")) $("gameHeroShowcase").classList.add("hidden");
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
      curHeroSkin = 0;
      renderGameRoles();
      toast(`已选择 ${game.name} · ${curRole}`);
    };
    $("gameStart").innerHTML = `
      <span class="pick-line">${curRole ? `今天和 ${escapeHtml(cfg.herName || "TA")} 用「${escapeHtml(curRole)}」一起玩 ${escapeHtml(game.name)}` : `先点一个角色`}</span>
      ${game.url ? `<a class="btn btn-accent btn-sm" href="${escapeAttr(game.url)}" target="_blank" rel="noopener">去玩</a>` : ""}
    `;
    renderGameHero();
  }

  function stopGameSound() {
    if (!gameSound) return;
    gameSound.pause();
    gameSound.currentTime = 0;
    gameSound = null;
  }

  function playGameSound(gameId) {
    const sound = GAME_SOUNDS[gameId];
    if (!sound) return;
    const audio = new Audio(sound.file);
    audio.preload = "metadata";
    gameSound = audio;
    audio.onended = () => {
      if (gameSound !== audio) return;
      gameSound = null;
    };
    audio.play().catch(() => {
      if (gameSound !== audio) return;
      gameSound = null;
      toast("音效暂时无法播放");
    });
  }

  function renderGameHero() {
    const box = $("gameHeroShowcase");
    if (!box) return;
    const skins = curGame === "hok" ? HERO_SKINS[curRole] : null;
    if (!skins || !skins.length) {
      box.classList.add("hidden");
      box.innerHTML = "";
      return;
    }
    curHeroSkin = Math.max(0, Math.min(curHeroSkin, skins.length - 1));
    const skin = skins[curHeroSkin];
    box.classList.remove("hidden");
    box.style.setProperty("--hero-color", skin.color);
    box.innerHTML = `
      <div class="game-hero-copy">
        <span class="game-hero-kicker">NEW · 2026.08</span>
        <h3>小颖版${escapeHtml(curRole)}</h3>
        <div class="skin-picker" role="list" aria-label="选择${escapeAttr(curRole)}皮肤">
          ${skins.map((item, i) => `<button type="button" class="skin-pick${i === curHeroSkin ? " is-on" : ""}" data-skin="${i}"><span>${String(i + 1).padStart(2, "0")}</span>${escapeHtml(item.name)}</button>`).join("")}
        </div>
        <div class="mood-chips"><span>开心</span><span>生气</span><span>无奈</span><span>难过</span><span>郁闷</span><span>兴奋</span><span>无敌</span></div>
      </div>
      <figure class="game-hero-stage">
        <span class="game-playing"><i></i> PLAYING</span>
        <div class="hero-halo" aria-hidden="true"></div>
        <img src="${escapeAttr(skin.file)}" alt="小颖版${escapeAttr(curRole)}${escapeAttr(skin.name)}横屏游戏动作" />
        <figcaption><b>${escapeHtml(skin.name)}</b><span>平衡动作版 · 最终</span></figcaption>
      </figure>`;
    $$("[data-skin]", box).forEach((btn) => {
      btn.onclick = () => {
        curHeroSkin = Number(btn.dataset.skin) || 0;
        renderGameHero();
      };
    });
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
    if (!cloud.enabled || !cloud.url || !cloud.anonKey) return;
    if (!window.supabase) {
      toast("实时同步 SDK 加载失败，检查 assets/vendor/supabase.min.js");
      return; // 保持本地模式
    }
    try {
      supabase = window.supabase.createClient(cloud.url, cloud.anonKey);
    } catch (e) {
      toast("云端配置不对，检查 config.js 的 cloud");
      return;
    }
    cloudReady = true;
    loadCloudChat();
    loadCloudSiteData();
    chatChannel = supabase
      .channel("chat-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat" }, () => loadCloudChat())
      .subscribe();
    // 兜底：每 20 秒自动拉一次 + 标签页切回前台立即拉取
    setInterval(() => {
      if (!cloudReady) return;
      loadCloudChat();
      loadCloudSiteData();
    }, 20000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && cloudReady) {
        loadCloudChat();
        loadCloudSiteData();
      }
    });
    renderChat();
  }

  /* ============ 云端同步：菜单 / 奶茶 / 逛街地址（site_data 表） ============ */
  async function loadCloudSiteData() {
    if (!cloudReady) return;
    try {
      const { data: rows, error } = await supabase
        .from("site_data")
        .select("*")
        .eq("id", "main")
        .limit(1);
      if (error || !rows || !rows.length || !rows[0].payload) return;
      if (mergeCloudSite(rows[0].payload)) {
        store.save(data);
        renderFood();
        renderFunDetail();
        pushSiteData(); // 合并结果写回云端
      }
    } catch (e) {
      /* 网络波动忽略 */
    }
  }

  /* 云端为准（名字相同取云端数据），本地独有的记录保留不丢 */
  function mergeCloudSite(payload) {
    let changed = false;
    const cf = payload.food;
    if (cf && typeof cf === "object" && Array.isArray(cf.menu) && Array.isArray(cf.milktea)) {
      const cur = data.food && typeof data.food === "object" ? data.food : { menu: [], milktea: [] };
      const mergeList = (cloudList, localList) => {
        const cloudNames = new Set((cloudList || []).map((x) => x && x.name));
        const localOnly = (localList || []).filter((x) => x && x.name && !cloudNames.has(x.name));
        return cloudList.map((x) => ({ name: x.name, rate: Number(x.rate) || 3 })).concat(localOnly);
      };
      data.food = {
        v: String(cf.v || (cur.v || "0")),
        menu: mergeList(cf.menu, cur.menu),
        milktea: mergeList(cf.milktea, cur.milktea)
      };
      changed = true;
    }
    if (typeof payload.address === "string" && payload.address && String(data.address || "") !== payload.address) {
      data.address = payload.address;
      changed = true;
    }
    return changed;
  }

  function pushSiteData() {
    if (!cloudReady || !supabase) return;
    supabase.from("site_data").upsert([
      { id: "main", payload: { food: data.food || null, address: data.address || "", updatedAt: Date.now() }, time: Date.now() }
    ]).then(({ error }) => {
      if (error) console.error("[site_data 推送失败]", error.message);
    });
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
    $("chatWho").innerHTML = "当前：<b>" + escapeHtml(myName) + "</b>" +
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
