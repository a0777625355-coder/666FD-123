(function () {
  const endpoint = 'https://yingdong1000days.a0777625355.workers.dev/api/kpl';
  const corner = document.getElementById('kplCorner');
  if (!corner) return;
  const header = corner.querySelector('.kpl-corner-head');
  const archive = document.createElement('details'); archive.className = 'kpl-history';
  const summary = document.createElement('summary'); summary.textContent = '历史资料 · 2026.09.03（点击展开，非实时数据）'; archive.append(summary);
  [...corner.children].filter(el => el !== header).forEach(el => archive.append(el));
  const panel = document.createElement('section'); panel.className = 'kpl-live-panel'; panel.setAttribute('aria-label','KPL 赛事更新');
  panel.innerHTML = '<div class="kpl-refresh-row"><strong>赛事近况</strong><button type="button" class="btn btn-ghost btn-sm kpl-manual-refresh" title="重新读取云端最新缓存">↻ 手动刷新</button></div><p class="kpl-refresh-note">想看最新缓存？可以随时手动刷新，不会额外调用 DeepSeek。</p><p class="kpl-update-status" role="status"></p><p class="kpl-live-copy"></p><div class="kpl-live-sources"></div><small>联网检索摘要，可能存在信息延迟；赛中比分请以赛事中心为准。</small>';
  corner.append(panel,archive);
  const status = panel.querySelector('.kpl-update-status'), copy = panel.querySelector('.kpl-live-copy'), links = panel.querySelector('.kpl-live-sources'), button = panel.querySelector('button');
  let busy = false, lastAttempt = 0, lastReport = null;
  const cacheKey = 'our1000days.kpl-report.v1';
  function valid(report) {
    return report && typeof report.text === 'string' && report.text.length > 0 && report.text.length <= 16000 && Number.isFinite(Date.parse(report.fetchedAt)) && Date.parse(report.fetchedAt) <= Date.now()+300000 && Array.isArray(report.sources) && report.sources.length > 0 && report.sources.length <= 20 && report.sources.every(s => {
      try { return typeof s.title === 'string' && typeof s.url === 'string' && new URL(s.url).protocol === 'https:'; } catch { return false; }
    });
  }
  function show(report, cached) {
    lastReport = report; copy.textContent = report.text; links.replaceChildren();
    for (const source of report.sources) {
      const a = document.createElement('a'); a.href = source.url; a.textContent = source.title; a.target = '_blank'; a.rel = 'noopener noreferrer'; links.append(a);
    }
    const stamp = new Date(report.fetchedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
    const stale = report.stale || Date.now()-Date.parse(report.fetchedAt)>3600000;
    status.textContent = `${cached ? '上次保存的资料' : stale ? '资料已超过一小时，请留意时效' : '已获取最近一次云端更新'} · ${stamp}（北京时间）`;
  }
  try { const cache = JSON.parse(localStorage.getItem(cacheKey)); if (valid(cache)) show(cache,true); } catch {}
  async function refresh() {
    if (busy) return;
    busy = true; lastAttempt = Date.now(); button.disabled = true; button.textContent = '刷新中…';
    status.textContent = '正在获取云端赛事资料…';
    try {
      const response = await fetch(endpoint,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(18000)});
      const report = await response.json();
      if (!response.ok) {
        if (report.error === 'NOT_CONFIGURED') throw Error('云端密钥或缓存尚未配置完成');
        if (report.error === 'WAITING_FOR_UPDATE') throw Error('等待云端第一次定时更新');
        throw Error('云端暂时无法提供更新');
      }
      if (!valid(report)) throw Error('云端返回的数据不完整');
      show(report,false);
      try { localStorage.setItem(cacheKey,JSON.stringify(report)); } catch {}
    } catch (e) {
      const known = ['云端密钥或缓存尚未配置完成','等待云端第一次定时更新','云端暂时无法提供更新','云端返回的数据不完整'];
      if (lastReport) show(lastReport,true);
      const hint = known.includes(e.message) ? e.message : '暂时连接不到更新服务，请检查云函数部署和网络后重试';
      status.textContent = hint + (lastReport ? '。下方保留上次资料，时间未更新。' : '。可以先查看赛事中心或展开历史资料。');
    } finally { busy = false; button.disabled = false; button.textContent = '↻ 手动刷新'; }
  }
  button.onclick = refresh;
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && document.getElementById('app').dataset.active==='game' && Date.now()-lastAttempt>300000) refresh();});
  refresh();
})();
