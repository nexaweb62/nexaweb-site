/**
 * LE CLIC QUI DECLENCHE TOUT.
 *
 * C'est ici, et nulle part ailleurs, que la notification part vers
 * Nexa Web. Tant que ce lien n'est pas suivi, la demande n'existe que
 * dans un jeton chiffre, dans la boite aux lettres de la personne.
 *
 * ── POURQUOI UNE PAGE ET NON UNE REDIRECTION ────────────────────────
 * La personne vient de cliquer dans son courriel : elle doit voir une
 * reponse claire, pas un aller-retour vers un formulaire vide. Les
 * quatre issues possibles — confirme, deja expire, lien abime, envoi
 * rate — ont chacune leur message.
 *
 * ── AUCUNE COULEUR ECRITE ICI ───────────────────────────────────────
 * Cette page est fabriquee dans une chaine et ne peut pas lire les
 * jetons de tokens.css. Elle s'appuie donc sur les couleurs SYSTEME
 * (Canvas, CanvasText), qui sont des mots-cles et que le navigateur
 * resout lui-meme en clair comme en sombre — meme raisonnement que la
 * page de refus de l'espace interne.
 */

import type { APIRoute } from 'astro';
import { lireJeton, type Demande } from '../../lib/devis/jeton';
import { envoyerNotification } from '../../lib/devis/courriel';
import { lireEnv } from '../../lib/admin/env';
import { adresseContact } from '../../lib/devis/contact';

export const prerender = false;

function page(titre: string, corps: string, statut = 200): Response {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${titre} · Nexa Web</title>
<style>
:root{color-scheme:dark light}
body{margin:0;min-height:100vh;display:grid;place-items:center;
  font:400 16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  background:Canvas;color:CanvasText;padding:24px;text-align:center}
main{max-width:46ch}
h1{font-size:1.5rem;font-weight:600;margin:0 0 14px;letter-spacing:-.02em}
p{margin:0 0 18px;opacity:.8}
a{color:LinkText;text-underline-offset:3px}
</style></head><body><main>${corps}</main></body></html>`,
    {
      status: statut,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}

const retour = '<p><a href="/">Retour au site</a></p>';

export const GET: APIRoute = async ({ request }) => {
  const env = await lireEnv() as Record<string, string | undefined>;
  const secret = env.DEVIS_TOKEN_SECRET;
  const cleResend = env.RESEND_API_KEY;
  /* L'adresse de notification : la boite reellement relevee, pas
     l'adresse d'expedition. Voir src/lib/devis/contact.ts. */
  const vers = adresseContact(env);

  if (!secret || !cleResend) {
    console.error('[devis] confirmation impossible : secrets manquants');
    return page('Indisponible', `
      <h1>Confirmation momentanément indisponible</h1>
      <p>Réessayez dans quelques minutes, ou écrivez-nous directement à
         <a href="mailto:${vers}">${vers}</a>.</p>${retour}`, 503);
  }

  const jeton = new URL(request.url).searchParams.get('t') ?? undefined;
  const lu = await lireJeton(jeton, secret);

  if (lu.etat === 'expire') {
    return page('Lien expiré', `
      <h1>Ce lien a expiré</h1>
      <p>Les liens de confirmation sont valables 24 heures. Remplissez à nouveau
         le formulaire, cela ne prend qu’un instant.</p>
      <p><a href="/devis">Refaire une demande</a></p>`, 410);
  }

  if (lu.etat === 'invalide') {
    return page('Lien invalide', `
      <h1>Ce lien n’est pas valide</h1>
      <p>Il a peut-être été coupé par votre messagerie. Essayez de le copier
         en entier dans la barre d’adresse, ou refaites une demande.</p>
      <p><a href="/devis">Refaire une demande</a></p>`, 400);
  }

  const parti = await envoyerNotification({ cle: cleResend, vers, demande: lu.demande });
  if (!parti) {
    /* On ne dit pas « c'est confirme » si rien n'est parti : la personne
       croirait sa demande transmise et attendrait une reponse qui ne
       viendrait jamais. */
    return page('Envoi impossible', `
      <h1>Nous n’avons pas pu transmettre votre demande</h1>
      <p>Le lien reste valable : réessayez dans quelques minutes. Si cela
         persiste, écrivez-nous à
         <a href="mailto:${vers}">${vers}</a>.</p>${retour}`, 502);
  }

  /* La trace dans Supabase, pour garder l'historique des demandes. Elle
     n'est tentee QU'APRES l'envoi : si elle echoue, la demande est deja
     entre nos mains, et c'est ce qui compte. */
  await enregistrer(env, lu.demande).catch(e =>
    console.warn('[devis] enregistrement Supabase échoué (la demande est partie) :', e));

  return page('Demande confirmée', `
    <h1>C’est confirmé, merci${lu.demande.prenom ? ' ' + echapper(lu.demande.prenom) : ''}.</h1>
    <p>Votre demande vient de nous parvenir. Nous revenons vers vous sous 24 heures
       ouvrées, à l’adresse ${echapper(lu.demande.email)}.</p>${retour}`);
};

function echapper(v: string): string {
  return v.replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

/**
 * Ecrit la demande dans la table existante.
 *
 * On passe par la cle ANONYME, celle que le site publie deja : elle ne
 * donne que ce que les regles de securite au niveau des lignes (RLS)
 * autorisent, c'est-a-dire l'insertion — exactement ce que faisait le
 * navigateur avant. Aucun nouveau secret n'est donc necessaire.
 */
async function enregistrer(
  env: Record<string, string | undefined>,
  d: Demande,
): Promise<void> {
  const url = env.SUPABASE_URL || 'https://abbplzlczwpqmyelopxo.supabase.co';
  const cle = env.SUPABASE_ANON_KEY || 'sb_publishable_uv77NJiEHPnkYYfHgltaZw_QvbEWoHd';

  const ligne: Record<string, unknown> = {
    prenom: d.prenom, nom: d.nom, email: d.email,
    telephone: d.telephone || null,
    entreprise: d.ent_nom || d.entreprise || null,
    type_site: d.type_site || null,
    delai_souhaite: d.delai_souhaite || null,
    budget_estime: d.budget_estime || null,
    description: d.description,
    site_existant: d.site_existant || null,
    formule: d.formule || null,
    paiement: d.paiement || 'comptant',
  };

  const envoi = (corps: Record<string, unknown>) => fetch(`${url}/rest/v1/demandes_devis`, {
    method: 'POST',
    headers: {
      apikey: cle, authorization: `Bearer ${cle}`,
      'content-type': 'application/json', prefer: 'return=minimal',
    },
    body: JSON.stringify(corps),
  });

  let r = await envoi(ligne);
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    /* La colonne « paiement » vient d'une migration qui n'est peut-etre
       pas passee. PostgREST refuse alors la ligne ENTIERE. Une demande
       perdue coute plus cher qu'un champ manquant : on renvoie sans lui.
       Meme raisonnement que l'ancien code du formulaire. */
    if (/paiement/.test(detail)) {
      const { paiement, ...sansPaiement } = ligne;
      void paiement;
      r = await envoi(sansPaiement);
    }
    if (!r.ok) throw new Error('PostgREST ' + r.status);
  }
}
