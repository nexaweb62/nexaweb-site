/**
 * LES CONTROLES QUI DEMANDENT A QUELQU'UN D'AUTRE.
 *
 * Trois services exterieurs : l'annuaire des entreprises de l'Etat, le
 * DNS pour savoir si un domaine recoit du courrier, et Turnstile pour
 * ecarter les robots.
 *
 * ── POURQUOI « fetch » EST UN PARAMETRE ─────────────────────────────
 * Chaque fonction recoit son fetch. Cela permet de rejouer ici, sans
 * reseau, les reponses exactes de ces services — y compris celles qu'on
 * ne saurait pas provoquer a la demande : une entreprise fermee, un
 * domaine sans MX, un jeton Turnstile rejete, une API en panne.
 *
 * ── CE QUI N'A PAS PU ETRE VERIFIE D'ICI ────────────────────────────
 * Le proxy de l'environnement de developpement refuse
 * recherche-entreprises.api.gouv.fr et cloudflare-dns.com (403,
 * politique d'organisation). La LOGIQUE est donc testee sur des
 * reponses rejouees ; la FORME REELLE des reponses ne l'est pas. D'ou
 * la lecture volontairement tolerante des champs ci-dessous : on essaie
 * plusieurs noms plausibles plutot que de parier sur un seul.
 *
 * ── EN CAS DE PANNE, ON LAISSE PASSER ───────────────────────────────
 * Si l'annuaire ou le DNS ne repond pas, la demande n'est PAS refusee.
 * Un service tiers en panne ne doit pas couper les demandes d'un client
 * reel : le cout d'une demande perdue depasse de loin celui d'un faux
 * positif qui passe. Turnstile fait exception — un jeton absent ou
 * invalide est une raison suffisante de refuser, puisque c'est
 * precisement ce que les robots ne savent pas fournir.
 */

type Fetch = typeof fetch;

/* ── Annuaire des entreprises (recherche-entreprises.api.gouv.fr) ── */

export type Entreprise = {
  /** La raison sociale officielle. */
  nom: string;
  /** Le libelle de l'activite principale, quand l'API le donne. */
  activite: string;
  /** La commune de l'etablissement, quand elle est connue. */
  commune: string;
  active: boolean;
};

export type ResultatSiret =
  | { etat: 'trouve'; entreprise: Entreprise }
  | { etat: 'inconnu' }
  | { etat: 'ferme'; entreprise: Entreprise }
  | { etat: 'indisponible' };

/** Premiere valeur de chaine non vide parmi plusieurs noms de champ. */
function champ(obj: Record<string, unknown> | undefined, ...noms: string[]): string {
  if (!obj) return '';
  for (const n of noms) {
    const v = obj[n];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

export async function chercherSiret(
  siret: string,
  f: Fetch = fetch,
): Promise<ResultatSiret> {
  const url = 'https://recherche-entreprises.api.gouv.fr/search'
    + `?q=${encodeURIComponent(siret)}&page=1&per_page=1`;

  let corps: any;
  try {
    const r = await f(url, { headers: { accept: 'application/json' } });
    /* 429 : l'API limite a quelques appels par seconde. Ce n'est pas un
       refus de l'entreprise, c'est un refus de nous repondre. */
    if (!r.ok) return { etat: 'indisponible' };
    corps = await r.json();
  } catch {
    return { etat: 'indisponible' };
  }

  const premier = corps?.results?.[0];
  if (!premier) return { etat: 'inconnu' };

  /* L'API repond au niveau de l'UNITE LEGALE. L'etablissement precis —
     celui que designent les cinq derniers chiffres du SIRET — se trouve
     dans « matching_etablissements ». Une entreprise peut etre active
     alors que l'etablissement interroge est ferme : c'est bien celui-ci
     qui nous interesse. */
  const etabs: any[] = Array.isArray(premier.matching_etablissements)
    ? premier.matching_etablissements : [];
  const etab = etabs.find(e => String(e?.siret ?? '').replace(/\D/g, '') === siret)
    ?? etabs[0];

  /* Un SIRET recherche doit ramener CET etablissement. Si l'API repond
     une entreprise dont aucun etablissement ne porte ce numero, c'est
     une correspondance approximative, pas une identification. */
  if (etabs.length && !etabs.some(e => String(e?.siret ?? '').replace(/\D/g, '') === siret)) {
    return { etat: 'inconnu' };
  }

  const entreprise: Entreprise = {
    nom: champ(premier, 'nom_complet', 'nom_raison_sociale', 'denomination', 'nom')
      || champ(etab, 'nom_complet', 'denomination'),
    activite: champ(premier, 'libelle_activite_principale', 'activite_principale')
      || champ(etab, 'libelle_activite_principale', 'activite_principale'),
    commune: champ(etab, 'libelle_commune', 'commune')
      || champ(premier?.siege, 'libelle_commune', 'commune'),
    active: true,
  };

  /* « A » = active, « C » = cessee. L'etablissement prime sur l'unite
     legale ; a defaut, on retombe sur celle-ci. Un champ absent n'est
     pas une fermeture : on ne ferme que sur un « C » explicite. */
  const etatEtab = champ(etab, 'etat_administratif');
  const etatUnite = champ(premier, 'etat_administratif');
  const etat = etatEtab || etatUnite;
  if (etat === 'C') {
    entreprise.active = false;
    return { etat: 'ferme', entreprise };
  }

  return { etat: 'trouve', entreprise };
}

/* ── Le domaine recoit-il du courrier ? (DNS over HTTPS) ─────────── */

export type ResultatMx = 'oui' | 'non' | 'indisponible';

/**
 * Interroge le DNS par HTTPS — un Worker n'a pas de resolveur DNS brut.
 *
 * On cherche un enregistrement MX. S'il n'y en a pas, on regarde A et
 * AAAA : la RFC 5321 §5.1 prevoit qu'un domaine sans MX recoit du
 * courrier a son adresse IP. De petits domaines professionnels sont
 * dans ce cas, et les refuser couterait de vrais clients.
 */
export async function domaineRecoitDuCourrier(
  domaine: string,
  f: Fetch = fetch,
): Promise<ResultatMx> {
  const interroge = async (type: 'MX' | 'A' | 'AAAA') => {
    const r = await f(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domaine)}&type=${type}`,
      { headers: { accept: 'application/dns-json' } },
    );
    if (!r.ok) throw new Error('dns ' + r.status);
    return await r.json() as { Status?: number; Answer?: { type: number; data: string }[] };
  };

  try {
    const mx = await interroge('MX');
    /* Status 3 = NXDOMAIN : le domaine n'existe pas du tout. */
    if (mx.Status === 3) return 'non';
    const aMx = (mx.Answer ?? []).some(a => a.type === 15 && !/^\s*0?\s*\.?\s*$/.test(a.data));
    if (aMx) return 'oui';

    const [a, aaaa] = await Promise.all([
      interroge('A').catch(() => null), interroge('AAAA').catch(() => null),
    ]);
    const aIp = (a?.Answer ?? []).some(x => x.type === 1)
      || (aaaa?.Answer ?? []).some(x => x.type === 28);
    return aIp ? 'oui' : 'non';
  } catch {
    return 'indisponible';
  }
}

/* ── Turnstile ───────────────────────────────────────────────────── */

/**
 * Verifie le jeton aupres de Cloudflare.
 *
 * Contrairement aux deux controles precedents, une panne ici REFUSE la
 * demande. Le jeton est la seule chose qu'un robot ne sait pas produire ;
 * laisser passer quand on ne peut pas le verifier reviendrait a retirer
 * la serrure des qu'on ne trouve plus la cle.
 */
export async function turnstileValide(
  jeton: string | undefined,
  secret: string | undefined,
  ip: string | undefined,
  f: Fetch = fetch,
): Promise<boolean> {
  if (!secret) {
    /* Pas de secret configure : le controle n'existe pas encore. On ne
       bloque pas tout le formulaire pour autant — les autres barrieres
       restent en place — mais on le dit dans les journaux. */
    console.warn('[devis] TURNSTILE_SECRET_KEY absent : contrôle anti-robot désactivé');
    return true;
  }
  if (!jeton) return false;

  try {
    const corps = new URLSearchParams({ secret, response: jeton });
    if (ip) corps.set('remoteip', ip);
    const r = await f('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: corps,
    });
    if (!r.ok) return false;
    const j = await r.json() as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}
