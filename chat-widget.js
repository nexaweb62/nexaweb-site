/* ── NEXA WEB — Widget IA (édition D&G) ── */
(function () {
  'use strict';

  /* ── CONFIG ── */
  var URL_FN   = 'https://abbplzlczwpqmyelopxo.supabase.co/functions/v1/chat';
  var ANON_KEY = 'sb_publishable_uv77NJiEHPnkYYfHgltaZw_QvbEWoHd';
  var MAX_MSG  = 10;
  var DELAY_MS = 3000;
  var MAX_CHR  = 500;

  var WELCOME = 'Bonjour ! Je suis l’assistant NexaWeb. Je peux vous renseigner sur nos offres, nos tarifs et nos délais. Comment puis-je vous aider ?';

  var CHIPS = [
    { q: 'Combien coûte un site ?',         hint: 'Formules de 790 € à 2 490 €',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
    { q: 'Quel est le délai de livraison ?', hint: '7 jours Vitrine & Business — 14 jours Premium',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
    { q: 'Comment fonctionne la garantie ?',     hint: '30 jours satisfait ou remboursé',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' }
  ];

  /* ── ÉTAT ── */
  var count   = parseInt(sessionStorage.getItem('nxa_n') || '0', 10);
  var last    = 0;
  var hist    = [];
  var open    = false;
  var started = false; /* welcome + chips injectés ? */
  var chipsOn = true;

  /* ════════════════════════════════════════════
     CSS
  ════════════════════════════════════════════ */
  var st = document.createElement('style');
  st.textContent =

  /* ── FAB ── */
  '#nxf{position:fixed;bottom:28px;right:28px;z-index:9990;display:inline-flex;align-items:center;gap:8px;padding:0 22px;height:50px;border-radius:100px;background:linear-gradient(135deg,#8B5CF6,#7C3AED);border:none;cursor:pointer;color:#fff;font-size:13px;font-weight:700;letter-spacing:.05em;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;box-shadow:0 8px 32px rgba(139,92,246,.50),0 2px 8px rgba(0,0,0,.30);transition:transform .26s cubic-bezier(.16,1,.3,1),box-shadow .26s,opacity .22s,visibility .22s}' +
  '#nxf:hover{transform:translateY(-3px) scale(1.04);box-shadow:0 14px 42px rgba(139,92,246,.65),0 4px 12px rgba(0,0,0,.36)}' +
  '#nxf.h{opacity:0;visibility:hidden;pointer-events:none;transform:translateY(10px) scale(.90)}' +
  '#nxf svg{width:16px;height:16px;fill:rgba(255,255,255,.90);flex-shrink:0}' +

  /* ── OVERLAY FULL SCREEN ── */
  '#nxo{position:fixed;inset:0;z-index:9989;background:rgba(4,4,10,.97);display:flex;flex-direction:column;align-items:center;opacity:0;visibility:hidden;transition:opacity .30s ease,visibility .30s ease;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif}' +
  '#nxo.o{opacity:1;visibility:visible}' +

  /* ── INNER (centré, max 800px) ── */
  '#nxi{width:100%;max-width:800px;height:100%;display:flex;flex-direction:column;padding:0 clamp(16px,4vw,40px)}' +

  /* ── HEADER ── */
  '#nxh{display:flex;align-items:center;justify-content:space-between;padding:20px 0 18px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0}' +
  '.nxh-l{display:flex;flex-direction:column;gap:2px}' +
  '.nxh-brand{font-size:9px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(139,92,246,.80)}' +
  '.nxh-title{font-size:13px;font-weight:600;color:rgba(232,232,242,.65);letter-spacing:.01em}' +
  '.nxh-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#4ADE80;margin-right:6px;vertical-align:middle}' +
  '#nxcl{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(232,232,242,.55);transition:background .18s,color .18s;padding:0;flex-shrink:0}' +
  '#nxcl:hover{background:rgba(255,255,255,.12);color:#E8E8F2}' +
  '#nxcl svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round}' +

  /* ── MESSAGES ── */
  '#nxm{flex:1;overflow-y:auto;padding:28px 0 8px;display:flex;flex-direction:column;gap:0;min-height:0;scroll-behavior:smooth}' +
  '#nxm::-webkit-scrollbar{width:3px}' +
  '#nxm::-webkit-scrollbar-thumb{background:rgba(139,92,246,.25);border-radius:3px}' +

  /* AI message */
  '.nm-ai{display:flex;align-items:flex-start;gap:13px;padding:22px 0;border-bottom:1px solid rgba(255,255,255,.045);animation:nxfi .35s ease}' +
  '.nm-ai:first-child{padding-top:4px}' +
  '.nm-ai:last-of-type{border-bottom:none}' +
  '.nm-ico{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#7C3AED);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}' +
  '.nm-ico svg{width:12px;height:12px;fill:#fff}' +
  '.nm-txt{font-size:15px;line-height:1.72;color:rgba(232,232,242,.88);flex:1;word-wrap:break-word;white-space:pre-wrap;padding-top:3px}' +

  /* User message */
  '.nm-usr{align-self:flex-end;padding:16px 0 16px;animation:nxfi .25s ease}' +
  '.nm-pill{display:inline-block;background:rgba(139,92,246,.16);border:1px solid rgba(139,92,246,.30);border-radius:16px 16px 3px 16px;padding:10px 16px;font-size:14px;line-height:1.55;color:rgba(232,232,242,.88);max-width:70%;word-wrap:break-word}' +

  /* Typing */
  '.nm-ty{display:flex;align-items:flex-start;gap:13px;padding:22px 0;animation:nxfi .3s ease}' +
  '.nm-ty-d{display:flex;gap:5px;align-items:center;padding-top:5px}' +
  '.nm-ty-d span{width:7px;height:7px;border-radius:50%;background:rgba(139,92,246,.65);animation:nxd 1.2s infinite}' +
  '.nm-ty-d span:nth-child(2){animation-delay:.2s}' +
  '.nm-ty-d span:nth-child(3){animation-delay:.4s}' +
  '@keyframes nxd{0%,60%,100%{transform:translateY(0);opacity:.40}30%{transform:translateY(-6px);opacity:1}}' +
  '@keyframes nxfi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}' +

  /* ── CHIPS ── */
  '#nxcs{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:6px 0 20px;flex-shrink:0}' +
  '.nc{background:rgba(255,255,255,.030);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px 18px 20px;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:12px;transition:background .20s,border-color .20s,transform .20s;font-family:inherit}' +
  '.nc:hover{background:rgba(139,92,246,.10);border-color:rgba(139,92,246,.38);transform:translateY(-3px)}' +
  '.nc-ico{width:40px;height:40px;border-radius:10px;background:rgba(139,92,246,.14);border:1px solid rgba(139,92,246,.22);display:flex;align-items:center;justify-content:center;color:rgba(139,92,246,.90)}' +
  '.nc-ico svg{width:18px;height:18px}' +
  '.nc-q{font-size:13px;font-weight:600;color:rgba(232,232,242,.85);line-height:1.35;letter-spacing:-.01em}' +
  '.nc-h{font-size:11px;color:rgba(232,232,242,.38);line-height:1.40}' +

  /* ── SÉPARATEUR OU ── */
  '#nxsep{display:flex;align-items:center;gap:12px;padding:4px 0 14px;color:rgba(232,232,242,.22);font-size:11px;letter-spacing:.08em;text-transform:uppercase;flex-shrink:0}' +
  '#nxsep::before,#nxsep::after{content:"";flex:1;height:1px;background:rgba(255,255,255,.07)}' +

  /* ── ZONE INPUT ── */
  '#nxib{flex-shrink:0;padding:0 0 clamp(16px,3vh,28px)}' +
  '#nxln{font-size:10px;color:rgba(232,232,242,.25);text-align:right;margin-bottom:6px;min-height:14px}' +
  '#nxrow{display:flex;gap:10px;align-items:flex-end}' +
  '#nxin{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:12px;color:#E8E8F2;font-size:14px;font-family:inherit;padding:13px 16px;resize:none;outline:none;line-height:1.50;max-height:96px;overflow-y:auto;transition:border-color .18s}' +
  '#nxin::placeholder{color:rgba(232,232,242,.25)}' +
  '#nxin:focus{border-color:rgba(139,92,246,.50)}' +
  '#nxsb{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#8B5CF6,#7C3AED);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;transition:opacity .18s,transform .15s;padding:0}' +
  '#nxsb:hover{opacity:.84}' +
  '#nxsb:active{transform:scale(.90)}' +
  '#nxsb:disabled{opacity:.28;cursor:not-allowed}' +
  '#nxsb svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +

  /* ── CTA DEVIS ── */
  '#nxcta{margin-top:14px;padding-bottom:2px}' +
  '#nxcta a{display:flex;align-items:center;justify-content:center;gap:9px;padding:14px 24px;background:transparent;border:1px solid rgba(255,255,255,.10);border-radius:10px;color:rgba(232,232,242,.45);font-size:11px;font-weight:700;letter-spacing:.12em;text-decoration:none;text-transform:uppercase;transition:background .18s,border-color .18s,color .18s}' +
  '#nxcta a:hover{background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.38);color:rgba(232,232,242,.85)}' +
  '#nxcta a svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +

  /* ── MOBILE ── */
  '@media(max-width:640px){' +
  '#nxcs{grid-template-columns:1fr}' +
  '#nxf{bottom:18px;right:18px;height:44px;padding:0 18px;font-size:12px}' +
  '.nm-txt{font-size:14px}' +
  '#nxi{padding:0 16px}' +
  '}';

  document.head.appendChild(st);

  /* ════════════════════════════════════════════
     HTML
  ════════════════════════════════════════════ */
  var ICO_AI = '<svg viewBox="0 0 12 12" aria-hidden="true"><polygon points="6,0 7.5,4.3 12,6 7.5,7.7 6,12 4.5,7.7 0,6 4.5,4.3" fill="white"/></svg>';

  /* Overlay */
  var ov = document.createElement('div');
  ov.id = 'nxo';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Assistant IA Nexa Web');
  ov.innerHTML =
    '<div id="nxi">' +

      /* Header */
      '<div id="nxh">' +
        '<div class="nxh-l">' +
          '<span class="nxh-brand">Nexa Web</span>' +
          '<span class="nxh-title"><span class="nxh-dot"></span>Conseiller IA</span>' +
        '</div>' +
        '<button id="nxcl" aria-label="Fermer l\'assistant">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +

      /* Messages */
      '<div id="nxm" role="log" aria-live="polite" aria-label="Conversation"></div>' +

      /* Chips */
      '<div id="nxcs"></div>' +

      /* Séparateur */
      '<div id="nxsep">ou posez directement votre question</div>' +

      /* Input */
      '<div id="nxib">' +
        '<div id="nxln"></div>' +
        '<div id="nxrow">' +
          '<textarea id="nxin" placeholder="Posez votre question…" aria-label="Votre message" rows="1" maxlength="500"></textarea>' +
          '<button id="nxsb" aria-label="Envoyer">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +

      /* CTA devis */
      '<div id="nxcta">' +
        '<a href="devis.html">Demander un devis' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
        '</a>' +
      '</div>' +

    '</div>';

  /* FAB */
  var fab = document.createElement('button');
  fab.id = 'nxf';
  fab.setAttribute('aria-label', 'Ouvrir le conseiller IA');
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'nxo');
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 14.4,9.5 22,12 14.4,14.5 12,22 9.6,14.5 2,12 9.6,9.5" fill="currentColor"/></svg>' +
    'Conseiller IA';

  document.body.appendChild(ov);
  document.body.appendChild(fab);

  /* ════════════════════════════════════════════
     REFS DOM
  ════════════════════════════════════════════ */
  var MsgEl  = document.getElementById('nxm');
  var ChEl   = document.getElementById('nxcs');
  var SepEl  = document.getElementById('nxsep');
  var InpEl  = document.getElementById('nxin');
  var SndEl  = document.getElementById('nxsb');
  var ClsEl  = document.getElementById('nxcl');
  var LnEl   = document.getElementById('nxln');

  /* ════════════════════════════════════════════
     MESSAGES
  ════════════════════════════════════════════ */
  function aiMsg(txt) {
    var w = document.createElement('div'); w.className = 'nm-ai';
    var ic = document.createElement('div'); ic.className = 'nm-ico'; ic.innerHTML = ICO_AI;
    var tx = document.createElement('div'); tx.className = 'nm-txt'; tx.textContent = txt;
    w.appendChild(ic); w.appendChild(tx);
    MsgEl.appendChild(w);
    MsgEl.scrollTop = MsgEl.scrollHeight;
  }

  function usrMsg(txt) {
    var w = document.createElement('div'); w.className = 'nm-usr';
    var p = document.createElement('div'); p.className = 'nm-pill'; p.textContent = txt;
    w.appendChild(p);
    MsgEl.appendChild(w);
    MsgEl.scrollTop = MsgEl.scrollHeight;
  }

  function showDots() {
    var w = document.createElement('div'); w.className = 'nm-ty'; w.id = 'nxty';
    w.setAttribute('aria-label', "L'assistant réfléchit");
    var ic = document.createElement('div'); ic.className = 'nm-ico'; ic.innerHTML = ICO_AI;
    var d = document.createElement('div'); d.className = 'nm-ty-d';
    d.innerHTML = '<span></span><span></span><span></span>';
    w.appendChild(ic); w.appendChild(d);
    MsgEl.appendChild(w);
    MsgEl.scrollTop = MsgEl.scrollHeight;
  }
  function hideDots() { var e = document.getElementById('nxty'); if (e) e.remove(); }

  /* ════════════════════════════════════════════
     CHIPS
  ════════════════════════════════════════════ */
  function buildChips() {
    ChEl.innerHTML = '';
    CHIPS.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'nc';
      b.innerHTML =
        '<div class="nc-ico">' + c.svg + '</div>' +
        '<div class="nc-q">' + c.q + '</div>' +
        '<div class="nc-h">' + c.hint + '</div>';
      b.addEventListener('click', function () { send(c.q); });
      ChEl.appendChild(b);
    });
  }

  function killChips() {
    if (!chipsOn) return;
    chipsOn = false;
    ChEl.innerHTML = '';
    SepEl.style.display = 'none';
  }

  /* ════════════════════════════════════════════
     LIMITE SESSION
  ════════════════════════════════════════════ */
  function refreshLn() {
    var r = MAX_MSG - count;
    LnEl.textContent = r <= 0
      ? 'Limite atteinte — rafraîchissez la page pour continuer.'
      : r <= 3 ? (r + (r === 1 ? ' message restant' : ' messages restants') + ' dans cette session.')
      : '';
  }

  /* ════════════════════════════════════════════
     ENVOI
  ════════════════════════════════════════════ */
  function send(txt) {
    txt = (txt !== undefined ? txt : InpEl.value).trim();
    if (!txt) return;
    if (Date.now() - last < DELAY_MS) {
      aiMsg('Merci de patienter quelques secondes entre chaque message.');
      return;
    }
    if (count >= MAX_MSG) {
      aiMsg('Vous avez atteint la limite de cette session. Écrivez-nous à contact.nexaweb62@gmail.com ou utilisez le formulaire de devis.');
      return;
    }
    if (txt.length > MAX_CHR) txt = txt.slice(0, MAX_CHR);

    InpEl.value = ''; autoH();
    killChips();
    SndEl.disabled = true;
    last = Date.now();
    count++;
    sessionStorage.setItem('nxa_n', String(count));
    refreshLn();

    usrMsg(txt);
    showDots();

    fetch(URL_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
      body: JSON.stringify({ userMessage: txt, messages: hist.slice(-12) })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      hideDots();
      if (d && d.reply) {
        hist.push({ role: 'user', text: txt });
        hist.push({ role: 'assistant', text: d.reply });
        if (hist.length > 12) hist = hist.slice(-12);
        aiMsg(d.reply);
      } else {
        aiMsg("Désolé, je ne peux pas répondre pour l'instant. Contactez-nous à contact.nexaweb62@gmail.com ou remplissez le formulaire de devis.");
      }
    })
    .catch(function () {
      hideDots();
      aiMsg("Une erreur est survenue. Écrivez-nous à contact.nexaweb62@gmail.com ou remplissez le formulaire de devis.");
    })
    .finally(function () {
      SndEl.disabled = false;
      MsgEl.scrollTop = MsgEl.scrollHeight;
    });
  }

  /* ════════════════════════════════════════════
     OPEN / CLOSE
  ════════════════════════════════════════════ */
  function openAI() {
    open = true;
    ov.classList.add('o');
    fab.classList.add('h');
    fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (!started) {
      started = true;
      aiMsg(WELCOME);
      buildChips();
    }
    setTimeout(function () { InpEl.focus(); }, 80);
  }

  function closeAI() {
    open = false;
    ov.classList.remove('o');
    fab.classList.remove('h');
    fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    fab.focus();
  }

  /* ════════════════════════════════════════════
     FOCUS TRAP
  ════════════════════════════════════════════ */
  function trap(e) {
    if (!open || e.key !== 'Tab') return;
    var els = Array.from(ov.querySelectorAll(
      'button:not(:disabled),[href],textarea,[tabindex]:not([tabindex="-1"])'
    ));
    if (!els.length) return;
    var f = els[0], l = els[els.length - 1];
    if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
    else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
  }

  /* ════════════════════════════════════════════
     RESIZE TEXTAREA
  ════════════════════════════════════════════ */
  function autoH() {
    InpEl.style.height = 'auto';
    InpEl.style.height = Math.min(InpEl.scrollHeight, 96) + 'px';
  }

  /* ════════════════════════════════════════════
     ÉVÉNEMENTS
  ════════════════════════════════════════════ */
  fab.addEventListener('click', function () { open ? closeAI() : openAI(); });
  ClsEl.addEventListener('click', closeAI);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) { closeAI(); return; }
    trap(e);
  });
  SndEl.addEventListener('click', function () { send(); });
  InpEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  InpEl.addEventListener('input', autoH);

  refreshLn();
})();
