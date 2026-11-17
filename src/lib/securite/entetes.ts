/**
 * LES EN-TETES DE SECURITE — pour tout ce que le Worker repond lui-meme.
 *
 * ── POURQUOI CE FICHIER EN PLUS DE public/_headers ─────────────────
 * public/_headers n'est lu que par la couche « fichiers statiques » de
 * Cloudflare. Une reponse fabriquee par le Worker — /devis, /admin, les
 * routes /api, /devis/confirme — ne passe JAMAIS par lui : elle partait
 * donc sans aucun en-tete de protection. Verifie dans workerd : / portait
 * nosniff et Referrer-Policy, /devis rien du tout.
 *
 * Le middleware pose donc ces valeurs sur chaque reponse du Worker.
 * ELLES DOIVENT RESTER IDENTIQUES au bloc « /* » de public/_headers :
 * scripts/check-securite.mjs compare les deux et echoue s'ils divergent.
 *
 * ── LA CSP EN DEUX MOITIES, ET POURQUOI ────────────────────────────
 * APPLIQUEE : les directives qui ne dependent d'AUCUNE liste de
 *   fournisseurs — personne ne peut encadrer le site (clickjacking), ni
 *   changer sa balise <base>, ni charger un plugin, ni detourner un
 *   formulaire vers un autre domaine. Rien de legitime ne fait cela ici :
 *   elles ne peuvent rien casser.
 * EN OBSERVATION (Report-Only) : la liste complete des origines que le
 *   site charge reellement. Elle ne bloque rien, elle SIGNALE dans la
 *   console. Les widgets tiers (Calendly, hCaptcha, Turnstile, Spline)
 *   chargent eux-memes d'autres ressources qu'on ne peut pas observer
 *   depuis l'environnement de developpement : la bloquer d'emblee
 *   risquerait de casser une prise de rendez-vous ou une inscription
 *   sans que personne ne le voie. Quand la console de production reste
 *   muette quelques semaines, on la passe en appliquee (voir le rapport
 *   de securite).
 *
 * 'unsafe-inline' reste dans script-src et style-src : les pages
 * contiennent des dizaines de scripts et d'attributs style en ligne.
 * Les retirer demande des empreintes (hash) generees au build — un
 * chantier a part, pas un reglage.
 */

/** Ce qui bloque, partout. Aucune dependance a un fournisseur. */
export const CSP_APPLIQUEE = [
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

/** La politique complete, en observation. Une ligne par fournisseur. */
export const CSP_OBSERVATION = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    'https://challenges.cloudflare.com', // Turnstile, /devis
    'https://js.hcaptcha.com https://*.hcaptcha.com', // hCaptcha, /login /inscription
    'https://assets.calendly.com', // Calendly, /rendez-vous apres consentement
    'https://cdn.jsdelivr.net', // visionneuse Spline, /inscription
  ].join(' '),
  "style-src 'self' 'unsafe-inline' https://assets.calendly.com https://*.hcaptcha.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  [
    "connect-src 'self'",
    'https://abbplzlczwpqmyelopxo.supabase.co wss://abbplzlczwpqmyelopxo.supabase.co',
    'https://*.hcaptcha.com',
    'https://*.spline.design https://www.gstatic.com https://unpkg.com https://cdn.jsdelivr.net',
  ].join(' '),
  [
    'frame-src',
    'https://calendly.com https://*.calendly.com',
    'https://challenges.cloudflare.com',
    'https://*.hcaptcha.com',
  ].join(' '),
  "worker-src 'self' blob:",
  "media-src 'self' blob: data:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

/**
 * L'espace interne n'appelle AUCUN tiers : tout vient du site, et la
 * connexion Google est une navigation, pas une ressource. On peut donc y
 * appliquer la politique stricte d'emblee. C'est la page qui affiche des
 * donnees saisies par d'autres (la feuille de prospection) : c'est la
 * qu'une CSP bloquante rapporte le plus.
 */
export const CSP_ADMIN = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

/** Les en-tetes communs. Memes valeurs que le bloc « /* » de _headers. */
export const ENTETES_COMMUNS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  /* Un an, sans « includeSubDomains » ni « preload » : ces deux-la
     engagent TOUS les sous-domaines, y compris ceux qu'on creerait plus
     tard. Ils se decident dans Cloudflare, en connaissance de cause. */
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()',
  /* « allow-popups » : une fenetre que le site ouvre lui-meme garde son
     lien avec lui. Rien ici n'en ouvre aujourd'hui, mais un widget de
     paiement ou de connexion pourrait le faire. */
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Content-Security-Policy': CSP_APPLIQUEE,
  'Content-Security-Policy-Report-Only': CSP_OBSERVATION,
};

/**
 * Pose les en-tetes sur une reponse du Worker, sans ecraser ce qu'une
 * route a deja decide. Rend la reponse a renvoyer.
 */
export function avecEntetesSecurite(reponse: Response, admin = false): Response {
  let r = reponse;
  const poser = () => {
    for (const [nom, valeur] of Object.entries(ENTETES_COMMUNS)) {
      if (!r.headers.has(nom)) r.headers.set(nom, valeur);
    }
    if (admin) {
      /* Dans l'espace interne, la politique stricte REMPLACE les deux
         autres : elle est plus severe que chacune. */
      r.headers.set('Content-Security-Policy', CSP_ADMIN);
      r.headers.delete('Content-Security-Policy-Report-Only');
    }
  };
  try {
    poser();
  } catch {
    /* Certaines reponses (Response.redirect, reponse d'un fetch) ont des
       en-tetes figes. On recopie, puis on pose. */
    r = new Response(r.body, r);
    poser();
  }
  return r;
}
