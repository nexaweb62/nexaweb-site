/**
 * LES DEUX COURRIELS.
 *
 * 1. A la personne : le lien de confirmation. C'est le seul envoi qui
 *    part d'une demande non confirmee.
 * 2. A Nexa Web : la notification, UNE FOIS le lien suivi.
 *
 * ── CE QUI CHANGE PAR RAPPORT A AVANT ───────────────────────────────
 * Le formulaire envoyait la notification immediatement. N'importe quel
 * robot capable de poster un formulaire remplissait donc la boite. Le
 * detour par un clic dans une vraie boite aux lettres coute presque
 * rien a un client, et beaucoup a un envoi automatique.
 *
 * ── RIEN N'EST INSERE DANS LE HTML SANS ETRE ECHAPPE ────────────────
 * Tous les champs viennent d'un formulaire public. Un « <script> » dans
 * un nom d'entreprise ne doit pas devenir du balisage dans le courriel
 * qu'on lit. echapper() s'applique a CHAQUE valeur, sans exception.
 */

import type { Demande } from './jeton';
import { telLisible, siretLisible } from './validation';
import { EXPEDITEUR } from './contact';
/* Les couleurs viennent de tokens.css, par un fichier genere. Les
   retaper ici les ferait diverger de la charte au premier changement. */
import { COURRIEL as C } from './palette-courriel';

type Fetch = typeof fetch;
const RESEND = 'https://api.resend.com/emails';

function echapper(v: string | undefined): string {
  return (v ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

async function envoyer(
  cle: string, f: Fetch,
  message: Record<string, unknown>,
): Promise<boolean> {
  try {
    const r = await f(RESEND, {
      method: 'POST',
      headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!r.ok) {
      console.error('[devis] Resend a refusé l\'envoi :', r.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[devis] Resend injoignable :', e);
    return false;
  }
}

/* ── 1. Le lien de confirmation ──────────────────────────────────── */

export async function envoyerConfirmation(opts: {
  cle: string; vers: string; prenom: string; lien: string;
  /** Ou doit arriver une REPONSE a ce courriel. Certaines personnes
   *  repondent au lieu de cliquer : leur reponse doit atteindre la
   *  boite relevee, pas l'adresse d'expedition. */
  repondreA: string; f?: Fetch;
}): Promise<boolean> {
  const { cle, vers, prenom, lien, repondreA, f = fetch } = opts;
  const p = echapper(prenom);
  const l = echapper(lien);

  return envoyer(cle, f, {
    from: EXPEDITEUR,
    to: [vers],
    reply_to: repondreA,
    subject: 'Confirmez votre demande de devis — Nexa Web',
    html: `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:${C.bg};font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${C.text}">
<div style="max-width:520px;margin:0 auto;background:${C.surface};border-radius:14px;padding:32px">
  <p style="margin:0 0 18px">Bonjour ${p},</p>
  <p style="margin:0 0 18px">Il ne reste qu'une étape : confirmez votre demande en cliquant ci-dessous. Nous ne la recevons qu'après ce clic.</p>
  <p style="margin:0 0 24px;text-align:center">
    <a href="${l}" style="display:inline-block;padding:13px 26px;border-radius:10px;background:${C.accent};color:${C.onAccent};text-decoration:none;font-weight:600">Confirmer ma demande</a>
  </p>
  <p style="margin:0 0 8px;font-size:13px;color:${C.textMuted}">Ce lien est valable 24 heures.</p>
  <p style="margin:0 0 18px;font-size:13px;color:${C.textMuted}">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br><span style="word-break:break-all">${l}</span></p>
  <p style="margin:0;font-size:13px;color:${C.textMuted}">Vous n'êtes à l'origine d'aucune demande ? Ignorez ce message, rien ne sera envoyé.</p>
</div></body></html>`,
    text: `Bonjour ${prenom},

Il ne reste qu'une étape : confirmez votre demande de devis en ouvrant ce lien. Nous ne la recevons qu'après ce clic.

${lien}

Ce lien est valable 24 heures.
Vous n'êtes à l'origine d'aucune demande ? Ignorez ce message, rien ne sera envoyé.

Nexa Web`,
  });
}

/* ── 2. La notification, apres confirmation ──────────────────────── */

const LIGNES: [string, (d: Demande) => string][] = [
  ['Nom', d => `${d.prenom} ${d.nom}`],
  ['E-mail', d => d.email],
  ['Téléphone', d => telLisible(d.telephone)],
  ['Entreprise (saisie)', d => d.entreprise],
  ['SIRET', d => siretLisible(d.siret)],
  ['Formule', d => d.formule],
  ['Type de site', d => d.type_site],
  ['Délai souhaité', d => d.delai_souhaite],
  ['Budget estimé', d => d.budget_estime],
  ['Échéancier', d => d.paiement],
  ['Site existant', d => d.site_existant],
];

export async function envoyerNotification(opts: {
  cle: string; vers: string; demande: Demande; f?: Fetch;
}): Promise<boolean> {
  const { cle, vers, demande: d, f = fetch } = opts;

  /* Le bloc officiel ne s'affiche que s'il y a quelque chose a dire :
     une formule sans SIRET n'a pas d'entreprise verifiee. */
  const officiel = d.ent_nom ? `
  <div style="margin:0 0 22px;padding:14px 16px;border:1px solid ${C.border};border-radius:10px;background:${C['surface-2']}">
    <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${C.textMuted};margin-bottom:8px">Vérifié auprès de l'annuaire des entreprises</div>
    <div style="font-weight:600;font-size:17px">${echapper(d.ent_nom)}</div>
    ${d.ent_activite ? `<div style="color:${C.text};margin-top:4px">${echapper(d.ent_activite)}</div>` : ''}
    ${d.ent_commune ? `<div style="color:${C.textMuted};font-size:14px;margin-top:2px">${echapper(d.ent_commune)}</div>` : ''}
  </div>` : '';

  const rangees = LIGNES
    .map(([libelle, lire]) => [libelle, (lire(d) || '').trim()] as const)
    .filter(([, v]) => v !== '')
    .map(([libelle, v]) => `<tr>
      <td style="padding:7px 14px 7px 0;color:${C.textMuted};vertical-align:top;white-space:nowrap">${echapper(libelle)}</td>
      <td style="padding:7px 0;font-weight:500">${echapper(v)}</td></tr>`)
    .join('');

  return envoyer(cle, f, {
    from: EXPEDITEUR,
    to: [vers],
    reply_to: d.email,
    subject: `Devis confirmé — ${d.prenom} ${d.nom}${d.ent_nom ? ' · ' + d.ent_nom : ''}`,
    html: `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:${C.bg};font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${C.text}">
<div style="max-width:620px;margin:0 auto;background:${C.surface};border-radius:14px;padding:30px">
  <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${C.accent};margin-bottom:6px">Demande confirmée par e-mail</div>
  <h1 style="margin:0 0 20px;font-size:21px">${echapper(d.prenom)} ${echapper(d.nom)}</h1>
  ${officiel}
  <table style="border-collapse:collapse;width:100%;font-size:15px">${rangees}</table>
  <div style="margin-top:22px;padding-top:18px;border-top:1px solid ${C.border}">
    <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${C.textMuted};margin-bottom:8px">Description du projet</div>
    <div style="white-space:pre-wrap">${echapper(d.description)}</div>
  </div>
</div></body></html>`,
    text: [
      `Demande de devis confirmée par e-mail`,
      ``,
      d.ent_nom ? `Entreprise vérifiée : ${d.ent_nom}${d.ent_activite ? ' — ' + d.ent_activite : ''}${d.ent_commune ? ' (' + d.ent_commune + ')' : ''}` : '',
      ``,
      ...LIGNES.map(([l, lire]) => {
        const v = (lire(d) || '').trim();
        return v ? `${l} : ${v}` : '';
      }).filter(Boolean),
      ``,
      `Description :`,
      d.description,
    ].filter(l => l !== undefined).join('\n'),
  });
}
