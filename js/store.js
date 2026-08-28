(function () {
  const KEY = "our1000days.v2";
  const OLD_KEY = "our1000days.v1";

  function defaults() {
    return { events: [], photos: [], food: null, address: "", chat: [] };
  }

  function normalize(raw) {
    const d = defaults();
    if (!raw || typeof raw !== "object") return d;
    return {
      events: Array.isArray(raw.events) ? raw.events : [],
      photos: Array.isArray(raw.photos) ? raw.photos : [],
      food: raw.food && typeof raw.food === "object" ? raw.food : null,
      address: typeof raw.address === "string" ? raw.address : "",
      chat: Array.isArray(raw.chat) ? raw.chat : []
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
      // 旧版数据迁移（events / photos 不丢）
      const old = localStorage.getItem(OLD_KEY);
      if (old) {
        const migrated = normalize(JSON.parse(old));
        save(migrated);
        return migrated;
      }
      return defaults();
    } catch (e) {
      return defaults();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* 存储满时忽略 */
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function compress(file, max = 1400, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read"));
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => reject(new Error("img"));
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  window.LOVE_STORE = {
    load,
    save,
    uid,
    compress,
    exportJson() {
      const blob = new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "我们的1000天-备份.json";
      a.click();
      URL.revokeObjectURL(a.href);
    },
    importJson(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const next = normalize(JSON.parse(reader.result));
            save(next);
            resolve(next);
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }
  };
})();
