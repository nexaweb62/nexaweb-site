/**
 * LES CONTROLES QUI NE DEMANDENT RIEN A PERSONNE.
 *
 * Tout ce qui se decide sans appeler un service exterieur vit ici :
 * format du telephone, cle de controle du SIRET, syntaxe de l'e-mail,
 * domaines jetables, liste noire. Ce sont des fonctions pures, donc
 * entierement testables — et elles le sont, par scripts/check-devis.mjs.
 *
 * L'ORDRE COMPTE. La liste noire passe EN PREMIER, avant tout appel
 * reseau : une adresse bloquee ne doit consommer ni quota d'API, ni
 * envoi d'e-mail, ni temps de calcul.
 */

/* ── Normalisation commune ───────────────────────────────────────── */

const sansAccents = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ── Telephone francais ──────────────────────────────────────────── */

/**
 * Ramene un numero a ses dix chiffres, ou rend null.
 *
 * Les gens ecrivent « 06 12 34 56 78 », « 06.12.34.56.78 »,
 * « +33 6 12 34 56 78 », « 0033612345678 ». Les quatre designent le
 * meme numero. On enleve tout ce qui n'est pas un chiffre, on ramene
 * l'indicatif international a un zero, et on juge ensuite.
 */
export function normaliserTel(brut: string | undefined): string | null {
  if (!brut) return null;
  let n = brut.replace(/[^\d+]/g, '');
  if (n.startsWith('+33')) n = '0' + n.slice(3);
  else if (n.startsWith('0033')) n = '0' + n.slice(4);
  else if (n.startsWith('33') && n.length === 11) n = '0' + n.slice(2);
  n = n.replace(/\D/g, '');
  return /^\d{10}$/.test(n) ? n : null;
}

/**
 * Un numero francais attribuable.
 *
 * 01 a 05 : fixes par zone. 06 et 07 : mobiles. 09 : non geographique.
 * 08 est EXCLU a dessein : ce sont les numeros a valeur ajoutee et les
 * services, pas des numeros ou l'on joint un client. 00 n'existe pas.
 */
export function telValide(brut: string | undefined): boolean {
  const n = normaliserTel(brut);
  return n !== null && /^0[1-79]/.test(n);
}

/** « 0612345678 » → « 06 12 34 56 78 », pour l'e-mail de notification. */
export function telLisible(brut: string | undefined): string {
  const n = normaliserTel(brut);
  return n ? n.replace(/(\d{2})(?=\d)/g, '$1 ').trim() : (brut ?? '');
}

/* ── SIRET ───────────────────────────────────────────────────────── */

/** Les quatorze chiffres, sans espaces ni points. */
export function normaliserSiret(brut: string | undefined): string {
  return (brut ?? '').replace(/\D/g, '');
}

/**
 * La cle de controle du SIRET (algorithme de Luhn).
 *
 * Elle ne dit pas que l'entreprise EXISTE — seulement que le numero
 * n'est pas une suite de chiffres tapee au hasard. C'est un filtre
 * gratuit et instantane qu'on passe AVANT d'interroger l'API de l'Etat :
 * inutile de faire voyager un numero manifestement faux.
 *
 * Sur quatorze chiffres, on double ceux de rang PAIR en indexation a
 * partir de zero — la parite s'inverse par rapport au SIREN, qui en
 * compte neuf. Verifie sur un SIRET valide connu dans check:devis.
 *
 * La Poste fait exception : ses SIRET commencent par 356000000 et
 * suivent une regle a part, la somme des chiffres etant un multiple
 * de cinq. Sans ce cas, on refuserait un client parfaitement reel.
 */
export function siretValide(brut: string | undefined): boolean {
  const s = normaliserSiret(brut);
  if (!/^\d{14}$/.test(s)) return false;

  if (s.startsWith('356000000')) {
    const somme = [...s].reduce((t, c) => t + Number(c), 0);
    return somme % 5 === 0;
  }

  let somme = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(s[i]);
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    somme += d;
  }
  return somme % 10 === 0;
}

/** « 73282932000074 » → « 732 829 320 00074 », comme sur un Kbis. */
export function siretLisible(brut: string | undefined): string {
  const s = normaliserSiret(brut);
  if (s.length !== 14) return brut ?? '';
  return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)} ${s.slice(9)}`;
}

/* ── E-mail ──────────────────────────────────────────────────────── */

/**
 * La syntaxe, et rien de plus.
 *
 * On ne cherche pas a valider un e-mail par expression reguliere : la
 * grammaire reelle de la RFC 5322 est inapplicable, et toute tentative
 * refuse des adresses legitimes. Ce controle elimine ce qui ne peut pas
 * etre une adresse ; c'est la verification MX, puis la confirmation par
 * clic, qui etablissent qu'elle existe vraiment.
 */
export function emailSyntaxe(brut: string | undefined): boolean {
  const e = (brut ?? '').trim();
  if (e.length < 6 || e.length > 254) return false;
  if (/\s/.test(e)) return false;
  const parts = e.split('@');
  if (parts.length !== 2) return false;
  const [local, domaine] = parts;
  if (!local || local.length > 64) return false;
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (domaine.length > 253) return false;
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(domaine)) return false;
  return /\.[a-zA-Z]{2,}$/.test(domaine);
}

export function domaineDe(email: string | undefined): string {
  const e = (email ?? '').trim().toLowerCase();
  const i = e.lastIndexOf('@');
  return i < 0 ? '' : e.slice(i + 1);
}

/* ── Domaines jetables ───────────────────────────────────────────── */

/**
 * Les boites temporaires les plus courantes.
 *
 * Cette liste ne sera JAMAIS complete — il s'en cree tous les jours, et
 * courir apres serait sans fin. Elle n'est pas la pour tout arreter :
 * elle ecarte le gros du bruit sans frais. Ce qui protege vraiment,
 * c'est la confirmation par clic : une boite jetable inconnue d'ici
 * devra quand meme recevoir le lien et le suivre.
 *
 * BLOCKLIST permet d'en ajouter sans toucher au code.
 */
const JETABLES = new Set([
  '0-mail.com', '10minutemail.com', '10minutemail.net', '20minutemail.com',
  '33mail.com', 'anonbox.net', 'armyspy.com',
  'burnermail.io', 'byom.de', 'cuvox.de', 'dayrep.com', 'discard.email',
  'discardmail.com', 'dispostable.com', 'einrot.com', 'emailondeck.com',
  'emailtemporanea.net', 'fakeinbox.com', 'fakemail.net', 'fakemailgenerator.com',
  'gawab.com', 'getairmail.com', 'getnada.com', 'grr.la', 'guerrillamail.biz',
  'guerrillamail.com', 'guerrillamail.de', 'guerrillamail.info',
  'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
  'harakirimail.com', 'inboxbear.com', 'incognitomail.com', 'jetable.org',
  'maildrop.cc', 'mailcatch.com', 'mailexpire.com', 'mailforspam.com',
  'mailinator.com', 'mailinator.net', 'mailnesia.com', 'mailnull.com',
  'mailsac.com', 'mailtemp.info', 'mailtothis.com', 'minuteinbox.com',
  'mintemail.com', 'moakt.com', 'mohmal.com', 'mt2015.com', 'mytemp.email',
  'mytrashmail.com', 'nowmymail.com', 'nwytg.net', 'opayq.com', 'owlymail.com',
  'pokemail.net', 'rhyta.com', 'sharklasers.com', 'spam4.me', 'spambog.com',
  'spamgourmet.com', 'spamherelots.com', 'superrito.com', 'teleworm.us',
  'temp-mail.io', 'temp-mail.org', 'tempail.com', 'tempinbox.com',
  'tempmail.net', 'tempmail.plus', 'tempmailaddress.com', 'tempmails.net',
  'tempr.email', 'throwawaymail.com', 'tmail.ws', 'tmails.net', 'trashmail.com',
  'trashmail.de', 'trashmail.me', 'trashmail.net', 'trbvm.com', 'vomoto.com',
  'wegwerfmail.de', 'yopmail.com', 'yopmail.fr', 'yopmail.net', 'yourmail.pro',
  'zetmail.com',
]);

export function domaineJetable(email: string | undefined): boolean {
  const d = domaineDe(email);
  if (!d) return false;
  if (JETABLES.has(d)) return true;
  /* Les boites jetables sortent souvent des sous-domaines :
     « x.mailinator.com » vaut « mailinator.com ». */
  return [...JETABLES].some(j => d.endsWith('.' + j));
}

/* ── Liste noire ─────────────────────────────────────────────────── */

export type ListeNoire = {
  emails: Set<string>;
  domaines: Set<string>;
  telephones: Set<string>;
};

/**
 * Lit BLOCKLIST : e-mails, domaines et numeros melanges, separes par
 * des virgules. On trie par forme, sans demander a l'humain de ranger.
 *
 *   general@orvanes.tech, orvanes.tech, 0754540766
 */
export function lireListeNoire(brut: string | undefined): ListeNoire {
  const emails = new Set<string>();
  const domaines = new Set<string>();
  const telephones = new Set<string>();

  for (const entree of (brut ?? '').split(/[,;\n]/)) {
    const v = entree.trim().toLowerCase();
    if (!v) continue;
    if (v.includes('@')) { emails.add(v.replace(/^@/, '')); continue; }
    const tel = normaliserTel(v);
    /* Un numero ne contient que des chiffres et des separateurs ; un
       domaine contient au moins un point et des lettres. Sans cette
       seconde condition, « 10minutemail.com » finirait en telephone. */
    if (tel && !/[a-z]/.test(v)) { telephones.add(tel); continue; }
    domaines.add(v.replace(/^\./, ''));
  }
  return { emails, domaines, telephones };
}

/**
 * La demande correspond-elle a la liste noire ?
 *
 * Un « oui » n'est jamais annonce au visiteur : il voit le meme message
 * de succes que tout le monde. Dire « vous etes bloque » apprendrait a
 * l'expediteur quoi changer pour passer.
 */
export function estSurListeNoire(
  champs: { email?: string; telephone?: string },
  liste: ListeNoire,
): boolean {
  const email = (champs.email ?? '').trim().toLowerCase();
  if (email && liste.emails.has(email)) return true;

  const d = domaineDe(email);
  if (d) {
    if (liste.domaines.has(d)) return true;
    /* « orvanes.tech » bloque aussi « mail.orvanes.tech ». */
    for (const bloque of liste.domaines) {
      if (d.endsWith('.' + bloque)) return true;
    }
  }

  const tel = normaliserTel(champs.telephone);
  if (tel && liste.telephones.has(tel)) return true;

  return false;
}

/* ── Les formules qui exigent un SIRET ───────────────────────────── */

/**
 * « obligatoire pour les formules entreprise ».
 *
 * On reconnait la formule par inclusion et non par egalite : le champ
 * vient d'un lien (/devis?formule=entreprise), d'une pastille de budget
 * ou d'un ancien alias. Juger sur l'egalite stricte laisserait passer
 * « entreprise-pro » sans SIRET.
 */
export function siretRequis(formule: string | undefined): boolean {
  const f = sansAccents((formule ?? '')).toUpperCase();
  return f.includes('ENTREPRISE') || f.includes('BUSINESS');
}
