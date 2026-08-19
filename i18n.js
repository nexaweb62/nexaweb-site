(function () {
  'use strict';
  var SUPPORTED = ['fr', 'en'];
  var DEFAULT   = 'fr';
  var current   = localStorage.getItem('nw-lang') || DEFAULT;
  var cache     = {};

  /* ── CSS du sélecteur de langue — injecté une fois ── */
  var _style = document.createElement('style');
  _style.textContent =
    '.lang-sel{display:flex;align-items:center;gap:1px;margin-right:2px}' +
    '.lang-opt{font-size:10px;font-weight:700;letter-spacing:.1em;' +
    'padding:4px 7px;border:1px solid transparent;border-radius:3px;' +
    'color:var(--text-muted,rgba(232,232,242,.44));background:none;cursor:pointer;' +
    'transition:color .15s}' +
    '.lang-opt:hover{color:var(--text,#E8E8F2)}' +
    '.lang-opt.active{color:var(--text,#E8E8F2);border-color:var(--border-hi,rgba(220,220,242,.14))}';
  document.head.appendChild(_style);

  /* ── Application des traductions ── */
  function applyStrings(strings) {
    document.documentElement.lang = current;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (strings[k] !== undefined && el.textContent !== strings[k]) el.textContent = strings[k];
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-html');
      if (strings[k] !== undefined && el.innerHTML !== strings[k]) el.innerHTML = strings[k];
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-ph');
      if (strings[k] !== undefined) el.placeholder = strings[k];
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-aria');
      if (strings[k] !== undefined) el.setAttribute('aria-label', strings[k]);
    });

    /* Titre de page : clé <page>.page.title */
    var page = document.documentElement.dataset.page;
    var titleKey = page ? (page + '.page.title') : null;
    if (titleKey && strings[titleKey]) document.title = strings[titleKey];

    syncSelector();
  }

  function syncSelector() {
    document.querySelectorAll('.lang-opt').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === current);
    });
  }

  function loadLang(lang) {
    if (cache[lang]) { applyStrings(cache[lang]); return; }
    fetch('/locales/' + lang + '.json?v=1')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { cache[lang] = data; applyStrings(data); })
      .catch(function (e) { console.warn('[i18n] impossible de charger', lang, e); });
  }

  /* ── API publique ── */
  window.i18n = {
    setLang: function (lang) {
      if (SUPPORTED.indexOf(lang) < 0) return;
      current = lang;
      localStorage.setItem('nw-lang', lang);
      loadLang(lang);
    },
    /* Retourne la traduction, ou fallback, ou la clé elle-même */
    t: function (key, fallback) {
      var strings = cache[current] || {};
      return strings[key] !== undefined ? strings[key]
           : (fallback !== undefined    ? fallback : key);
    },
    current: function () { return current; }
  };

  document.addEventListener('DOMContentLoaded', function () {
    /* Câblage des boutons du sélecteur */
    document.querySelectorAll('.lang-opt').forEach(function (btn) {
      btn.addEventListener('click', function () { window.i18n.setLang(btn.dataset.lang); });
      btn.classList.toggle('active', btn.dataset.lang === current);
    });
    /* Chargement de la langue courante (même FR, pour le cache) */
    loadLang(current);
  });
})();
