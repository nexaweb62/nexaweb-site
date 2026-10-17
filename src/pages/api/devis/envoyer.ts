/**
 * LA DEMANDE DE DEVIS — tout passe par ici, et rien ne part encore.
 *
 * Cette route REMPLACE l'ancien circuit, ou le navigateur inserait
 * lui-meme dans Supabase puis appelait la fonction d'envoi. Ce circuit
 * etait le probleme : les deux points d'entree acceptaient la cle
 * publique du site, donc n'importe quel robot pouvait les appeler
 * directement, sans jamais voir le formulaire ni ses controles.
 *
 * ── L'ORDRE DES CONTROLES EST UN CHOIX ──────────────────────────────
 *   1. pot de miel, puis liste noire — SILENCIEUX : on repond « merci »
 *      et rien ne part. Dire « vous etes bloque » apprendrait quoi
 *      changer pour passer.
 *   2. Turnstile — un robot ne sait pas produire ce jeton.
 *   3. les champs et leurs formats — gratuit, instantane.
 *   4. le domaine recoit-il du courrier — un appel DNS.
 *   5. le SIRET aupres de l'annuaire de l'Etat — le plus cher, donc
 *      le dernier.
 *
 * Les quatre premiers filtrent sans rien demander a personne ; on ne
 * fait travailler les services exterieurs que sur ce qui a survecu.
 *
 * ── CE QUI PART A LA FIN ────────────────────────────────────────────
 * UN SEUL courriel, a la personne, avec un lien. La notification
 * n'existe qu'apres le clic (voir src/pages/devis/confirme.ts).
 */

import type { APIRoute } from 'astro';
import {
  estSurListeNoire, lireListeNoire, emailSyntaxe, domaineDe, domaineJetable,
  telValide, normaliserTel, siretValide, normaliserSiret, siretRequis,
} from '../../../lib/devis/validation';
import { chercherSiret, domaineRecoitDuCourrier, turnstileValide } from '../../../lib/devis/reseau';
import { fabriquerJeton } from '../../../lib/devis/jeton';
import { envoyerConfirmation } from '../../../lib/devis/courriel';
import { lireEnv } from '../../../lib/admin/env';

export const prerender = false;

const JSON_ENTETES = {
  'content-type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

/** Ce que voit le visiteur quand tout s'est bien passe — et aussi quand
 *  sa demande a ete ecartee en silence. Les deux sont indistinguables. */
const SUCCES = () => new Response(
  JSON.stringify({ ok: true }), { status: 200, headers: JSON_ENTETES },
);

const refus = (message: string, champ?: string) => new Response(
  JSON.stringify({ ok: false, message, champ }), { status: 400, headers: JSON_ENTETES },
);

const texte = (v: unknown, max = 2000) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

export const POST: APIRoute = async ({ request }) => {
  const env = await lireEnv() as Record<string, string | undefined>;

  let d: Record<string, unknown>;
  try { d = await request.json() as Record<string, unknown>; }
  catch { return refus('Demande illisible.'); }

  const prenom = texte(d.prenom, 80);
  const nom = texte(d.nom, 80);
  const email = texte(d.email, 254).toLowerCase();
  const telephone = texte(d.telephone, 40);
  const entreprise = texte(d.entreprise, 160);
  const siret = normaliserSiret(texte(d.siret, 40));
  const formule = texte(d.formule, 60);
  const description = texte(d.description, 4000);

  /* ── 1. Le pot de miel ─────────────────────────────────────────── */
  /* Un champ invisible qu'un humain ne remplit jamais. Rempli = robot. */
  if (texte(d.website_url, 200) !== '') return SUCCES();

  /* ── 2. La liste noire, en silence ─────────────────────────────── */
  if (estSurListeNoire({ email, telephone }, lireListeNoire(env.BLOCKLIST))) {
    /* Aucune trace cote visiteur, aucune notification, aucun courriel.
       Le journal garde une ligne : savoir que le filtre sert. */
    console.info('[devis] demande écartée (liste noire)');
    return SUCCES();
  }

  /* ── 3. Turnstile ──────────────────────────────────────────────── */
  const ip = request.headers.get('cf-connecting-ip') ?? undefined;
  const robotOk = await turnstileValide(
    texte(d.turnstile, 3000), env.TURNSTILE_SECRET_KEY, ip,
  );
  if (!robotOk) {
    return refus(
      'La vérification anti-robot n’a pas abouti. Rechargez la page et réessayez.',
      'turnstile',
    );
  }

  /* ── 4. Les champs, et rien que leur forme ─────────────────────── */
  if (!prenom) return refus('Le prénom est requis.', 'prenom');
  if (!nom) return refus('Le nom est requis.', 'nom');
  if (!email) return refus('L’e-mail est requis.', 'email');
  if (!emailSyntaxe(email)) return refus('Adresse e-mail invalide.', 'email');
  if (domaineJetable(email)) {
    return refus(
      'Les adresses e-mail temporaires ne sont pas acceptées. Merci d’utiliser une adresse où nous pourrons vous répondre.',
      'email',
    );
  }
  if (description.length < 20) {
    return refus('Décrivez votre projet en au moins 20 caractères.', 'description');
  }
  if (telephone && !telValide(telephone)) {
    return refus(
      'Numéro de téléphone invalide. Attendu : un numéro français à 10 chiffres (01 à 07, ou 09).',
      'tel',
    );
  }
  if (d.rgpd !== true) {
    return refus('Vous devez accepter le traitement de vos données pour continuer.', 'rgpd');
  }

  /* ── 5. Le domaine recoit-il vraiment du courrier ? ────────────── */
  const mx = await domaineRecoitDuCourrier(domaineDe(email));
  if (mx === 'non') {
    return refus(
      'Ce domaine ne reçoit pas d’e-mails. Vérifiez votre adresse.',
      'email',
    );
  }
  /* « indisponible » : le DNS n'a pas repondu. On laisse passer — une
     panne de resolveur ne doit pas couper les demandes. */

  /* ── 6. Le SIRET ───────────────────────────────────────────────── */
  const exige = siretRequis(formule);
  let entNom = '', entActivite = '', entCommune = '';

  if (exige && !siret) {
    return refus(
      'Le numéro SIRET est requis pour la formule Entreprise.',
      'siret',
    );
  }
  if (siret) {
    if (!siretValide(siret)) {
      return refus(
        'Ce numéro SIRET ne semble pas valide. Vérifiez les 14 chiffres.',
        'siret',
      );
    }
    const r = await chercherSiret(siret);
    if (r.etat === 'inconnu') {
      return refus(
        'Nous n’avons pas trouvé d’entreprise à ce numéro SIRET. Vérifiez-le, ou laissez le champ vide si vous êtes un particulier.',
        'siret',
      );
    }
    if (r.etat === 'ferme') {
      return refus(
        'Cet établissement est enregistré comme fermé. Si c’est une erreur, écrivez-nous directement et nous reprendrons contact.',
        'siret',
      );
    }
    if (r.etat === 'trouve') {
      entNom = r.entreprise.nom;
      entActivite = r.entreprise.activite;
      entCommune = r.entreprise.commune;
    }
    /* « indisponible » : l'annuaire n'a pas repondu. La demande passe
       sans nom officiel — perdre un client reel parce qu'une API de
       l'Etat est en maintenance serait absurde. */
  }

  /* ── 7. Le lien de confirmation ────────────────────────────────── */
  const secret = env.DEVIS_TOKEN_SECRET;
  const cleResend = env.RESEND_API_KEY;
  if (!secret || !cleResend) {
    console.error('[devis] DEVIS_TOKEN_SECRET ou RESEND_API_KEY manquant');
    return new Response(
      JSON.stringify({
        ok: false,
        message: 'Le formulaire est momentanément indisponible. Écrivez-nous à contact@nexaaweb.com.',
      }), { status: 503, headers: JSON_ENTETES },
    );
  }

  const jeton = await fabriquerJeton({
    prenom, nom, email, telephone: normaliserTel(telephone) ?? telephone,
    entreprise, siret, formule,
    type_site: texte(d.type_site, 80),
    delai_souhaite: texte(d.delai_souhaite, 80),
    budget_estime: texte(d.budget_estime, 80),
    paiement: texte(d.paiement, 40) || 'comptant',
    description, site_existant: texte(d.site_existant, 300),
    ent_nom: entNom, ent_activite: entActivite, ent_commune: entCommune,
  }, secret);

  const lien = `${new URL(request.url).origin}/devis/confirme?t=${jeton}`;
  const parti = await envoyerConfirmation({ cle: cleResend, vers: email, prenom, lien });

  if (!parti) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: 'Nous n’avons pas pu envoyer l’e-mail de confirmation. Réessayez dans un instant, ou écrivez-nous à contact@nexaaweb.com.',
      }), { status: 502, headers: JSON_ENTETES },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, confirmation: true }),
    { status: 200, headers: JSON_ENTETES },
  );
};
