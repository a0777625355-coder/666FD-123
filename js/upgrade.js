(function () {
  const $ = id => document.getElementById(id);
  $('lockSite').onclick = () => {
    try { localStorage.removeItem('our1000days.gate.v1'); } catch(e) {}
    document.documentElement.classList.remove('gate-passed');
    $('gate').classList.remove('bye'); $('app').classList.add('is-locked');
    $('gateInput').value = ''; $('gateInput').focus();
    document.querySelector('.rail').classList.remove('open');
    $('railBackdrop').classList.remove('on'); document.body.classList.remove('rail-open');
  };
  const syncGate = () => { $('app').inert = !document.documentElement.classList.contains('gate-passed'); $('gate').inert = !$('app').inert; };
  new MutationObserver(syncGate).observe(document.documentElement,{attributes:true,attributeFilter:['class']}); syncGate();
  let focusReturn = null, activeDialog = null;
  const dialogs = [$('modal'),$('lightbox'),$('secretLetter')];
  function syncDialog() {
    const next = dialogs.find(el => !el.classList.contains('hidden')) || null;
    if (next === activeDialog) return;
    if (next) {
      focusReturn = document.activeElement;
      next.querySelector('button')?.focus();
      document.body.classList.add('dialog-open'); $('app').inert = true;
    } else {
      document.body.classList.remove('dialog-open'); syncGate();
      if (focusReturn?.isConnected && !focusReturn.closest('.hidden')) focusReturn.focus();
    }
    activeDialog = next;
  }
  dialogs.forEach(dialog => new MutationObserver(syncDialog).observe(dialog,{attributes:true,attributeFilter:['class']}));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !activeDialog) return;
    const controls = [...activeDialog.querySelectorAll('button,input,textarea,select,[tabindex="0"]')].filter(el => el.getClientRects().length && !el.disabled);
    const first = controls[0], last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first) {e.preventDefault();last.focus();}
    if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();}
  });
  let clueTimer = null, bubbleTimer = null, glowTimer = null;
  const envelope = $('secretEnvelope');
  const secret = $('secretLetter');
  $('dongSecret').onclick = () => {
    if (clueTimer) return;
    clearTimeout(bubbleTimer);
    $('dongBubble').classList.remove('hidden');
    clueTimer = setTimeout(() => {
      clueTimer = null;
      if ($('app').dataset.active !== 'home' || $('app').classList.contains('is-locked') || dialogs.some(d => !d.classList.contains('hidden'))) {
        $('dongBubble').classList.add('hidden'); return;
      }
      envelope.focus({preventScroll:true});
      envelope.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'center'});
      envelope.classList.add('is-hinted');
      clearTimeout(glowTimer);
      glowTimer = setTimeout(() => envelope.classList.remove('is-hinted'), 4500);
      bubbleTimer = setTimeout(() => $('dongBubble').classList.add('hidden'), 1000);
    }, 1100);
  };
  envelope.onclick = () => { secret.classList.remove('hidden'); secret.querySelector('.modal-card').scrollTop = 0; envelope.classList.remove('is-hinted'); };
  const closeSecret = () => secret.classList.add('hidden');
  $('secretClose').onclick = closeSecret;
  $('secretKeep').onclick = closeSecret;
  secret.addEventListener('click', e => {if (e.target === secret) closeSecret();});
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !secret.classList.contains('hidden')) { e.preventDefault(); closeSecret(); } });
  document.addEventListener('error', e => {
    if (e.target.tagName !== 'IMG') return;
    e.target.classList.add('image-unavailable');
    if (!e.target.alt) e.target.alt = '图片暂时无法显示';
  }, true);
  window.addEventListener('love-storage-error', () => {
    $('toast').textContent = '本次修改未保存：存储空间不足或不可用，请先导出备份。';
    $('toast').classList.add('show');
    setTimeout(() => $('toast').classList.remove('show'), 7000);
  });
})();
