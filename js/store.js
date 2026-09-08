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
      window.dispatchEvent(new CustomEvent("love-storage-error"));
      throw new Error("storage");
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function compress(file, max = 1400, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/") || file.size > 25 * 1024 * 1024) { reject(new Error("请选择小于 25 MB 的图片")); return; }
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
            const raw = JSON.parse(reader.result);
            if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
                !["events", "photos", "chat", "food"].some(k => Object.hasOwn(raw, k))) throw new Error("invalid backup");
            for (const key of ["events", "photos", "chat"]) {
              if (raw[key] !== undefined && !Array.isArray(raw[key])) throw new Error("invalid list");
            }
            const safeImage = value => typeof value === "string" && /^(?:data:image\/(?:jpeg|png|webp|gif);base64,|https?:\/\/|(?:assets|photos)\/)/i.test(value);
            const validDate = value => value === undefined || value === "" || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)));
            const safeId = value => value === undefined || (typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value));
            if ((raw.events || []).some(e => !e || typeof e !== "object" || typeof e.title !== "string" || !validDate(e.date) || !safeId(e.id) || (e.photo && !safeImage(e.photo)))) throw new Error("invalid event");
            if ((raw.photos || []).some(p => typeof p === "string" ? !safeImage(p) : !p || !safeImage(p.src) || !validDate(p.date) || !safeId(p.id))) throw new Error("invalid photo");
            if ((raw.chat || []).some(m => !m || typeof m !== "object" || typeof m.text !== "string" || !safeId(m.id))) throw new Error("invalid chat");
            if (raw.food != null) {
              if (typeof raw.food !== "object" || Array.isArray(raw.food)) throw new Error("invalid food");
              for (const key of ["menu", "milktea"]) if (raw.food[key] !== undefined && (!Array.isArray(raw.food[key]) || raw.food[key].some(x => !x || typeof x.name !== "string" || !Number.isFinite(x.rate) || x.rate < 1 || x.rate > 5))) throw new Error("invalid food list");
            }
            const current = load(), incoming = normalize(raw);
            const merge = (a,b) => [...new Map([...a,...b].map(x => [typeof x === "string" ? x : x.id || JSON.stringify(x),x])).values()];
            const next = { ...current, events: merge(current.events,incoming.events), photos: merge(current.photos,incoming.photos), chat: merge(current.chat,incoming.chat), address: incoming.address || current.address, food: current.food };
            if (incoming.food) {
              next.food = {...(current.food || {}), ...incoming.food};
              for (const key of ["menu","milktea"]) next.food[key] = [...new Map([...(current.food?.[key] || []),...(incoming.food[key] || [])].map(x => [x.name,x])).values()];
            }
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
