(function () {
  "use strict";

  const root = document.documentElement;
  const themeBtn = document.getElementById("themeBtn");
  const cardButtons = [document.getElementById("cardBtn"), document.getElementById("cardBtnRail")].filter(Boolean);
  const THEME_KEY = "our1000days.theme.v1";

  function currentTheme() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }

  function paintTheme(theme, persist) {
    root.dataset.theme = theme;
    const dark = theme === "dark";
    if (themeBtn) {
      themeBtn.textContent = dark ? "☀" : "☾";
      themeBtn.setAttribute("aria-pressed", String(dark));
      themeBtn.title = dark ? "切换到浅色模式" : "切换到深色模式";
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#111016" : "#f8f5f2";
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }
  }

  paintTheme(currentTheme(), false);
  if (themeBtn) themeBtn.addEventListener("click", function () {
    paintTheme(currentTheme() === "dark" ? "light" : "dark", true);
  });

  function updateProgress() {
    const page = document.documentElement;
    const distance = page.scrollHeight - page.clientHeight;
    const progress = distance > 0 ? Math.min(100, Math.max(0, page.scrollTop / distance * 100)) : 0;
    document.body.style.setProperty("--story-progress", progress.toFixed(2) + "%");
  }
  updateProgress();
  addEventListener("scroll", updateProgress, { passive: true });
  addEventListener("resize", updateProgress, { passive: true });

  const revealTargets = document.querySelectorAll(
    ".home-hub, .date-planner, #timeline, .year-ribbon, .kpl-corner, .board, .fun-panel, .variant-atlas, .album-grid, .letter-wrap"
  );
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    revealTargets.forEach(el => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: "0px 0px -5%" });
    revealTargets.forEach(function (el) {
      el.classList.add("reveal-xp");
      observer.observe(el);
    });
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  function createCard() {
    const cfg = window.LOVE || {};
    const start = new Date((cfg.startDate || "2023-12-31") + "T00:00:00");
    const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 1800;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 1400, 1800);
    gradient.addColorStop(0, "#ffdbeb");
    gradient.addColorStop(.48, "#fff4de");
    gradient.addColorStop(1, "#dcd8ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1400, 1800);

    ctx.globalAlpha = .34;
    [[180,220,250,"#ff4f9a"],[1210,390,330,"#7659ff"],[250,1580,360,"#ffad33"]].forEach(function (orb) {
      ctx.fillStyle = orb[3]; ctx.beginPath(); ctx.arc(orb[0], orb[1], orb[2], 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,.74)";
    roundedRect(ctx, 105, 110, 1190, 1580, 58);
    ctx.strokeStyle = "rgba(75,50,80,.14)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#312837";
    ctx.font = "600 34px 'Noto Sans SC', sans-serif";
    ctx.fillText("OUR STORY ARCHIVE", 700, 285);
    ctx.font = "700 68px 'Noto Sans SC', sans-serif";
    ctx.fillText(cfg.gateTitle || "LEE & CHENG", 700, 410);
    ctx.fillStyle = "#e84d92";
    ctx.font = "900 280px Georgia, serif";
    ctx.fillText(String(days), 700, 800);
    ctx.fillStyle = "#594e5e";
    ctx.font = "500 42px 'Noto Sans SC', sans-serif";
    ctx.fillText("和你在一起的第 " + days + " 天", 700, 900);
    ctx.strokeStyle = "rgba(71,52,76,.18)";
    ctx.beginPath(); ctx.moveTo(280, 1020); ctx.lineTo(1120, 1020); ctx.stroke();
    ctx.fillStyle = "#312837";
    ctx.font = "600 48px 'Noto Sans SC', sans-serif";
    ctx.fillText("把普通的日子，也好好收藏", 700, 1160);
    ctx.fillStyle = "#786d7a";
    ctx.font = "400 31px 'Noto Sans SC', sans-serif";
    ctx.fillText("始于 " + (cfg.startDate || "2023-12-31"), 700, 1250);
    ctx.font = "400 28px 'Noto Sans SC', sans-serif";
    ctx.fillText("下一个 1000 天，也慢慢写。", 700, 1490);
    ctx.fillStyle = "#e84d92";
    ctx.font = "700 42px Georgia, serif";
    ctx.fillText("♥", 700, 1580);

    canvas.toBlob(function (blob) {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "我们的第" + days + "天.png";
      link.click();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    }, "image/png");
  }

  cardButtons.forEach(function (button) { button.addEventListener("click", createCard); });
})();
