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
  var SUPABASE_URL     = 'https://abbplzlczwpqmyelopxo.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_uv77NJiEHPnkYYfHgltaZw_QvbEWoHd';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[NexaWeb] SDK Supabase non chargé — vérifiez la balise <script> CDN.');
    return;
  }

  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
