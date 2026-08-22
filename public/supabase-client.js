/**
 * Nexa Web — Supabase client
 *
 * Seule la clé anon publique est utilisée ici.
 * La sécurité des données repose sur les Row Level Security (RLS) policies
 * configurées côté Supabase, pas sur ce fichier.
 *
 * NE JAMAIS mettre la clé service_role dans du code front-end.
 */
(function () {
  var SUPABASE_URL      = 'https://abbplzlczwpqmyelopxo.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_uv77NJiEHPnkYYfHgltaZw_QvbEWoHd';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[NexaWeb] SDK Supabase non chargé — vérifiez la balise <script> CDN.');
    return;
  }

  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession:   true,
      autoRefreshToken: true
    }
  });

  /* ── Debug session au chargement (temporaire) ── */
  console.log('[NexaWeb] Client Supabase initialisé sur', window.location.pathname);
  window.sb.auth.getSession().then(function (r) {
    var s = r.data && r.data.session;
    console.log('[NexaWeb] Session localStorage:', s
      ? '✓ présente — ' + (s.user.email || 'sans email') + ' (expire ' + new Date(s.expires_at * 1000).toLocaleTimeString() + ')'
      : '✗ absente');
  });
})();
