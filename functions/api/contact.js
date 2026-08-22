/**
 * POST /api/contact — reçoit le formulaire de rappel et envoie l'e-mail.
 *
 * Fonction Cloudflare Pages. Volontairement sans dépendance : `fetch` suffit.
 * Le formulaire fonctionne sans JavaScript côté client — c'est un POST HTML
 * classique, et la réponse est une redirection 303. Un visiteur qui bloque le
 * JavaScript peut donc quand même vous joindre.
 *
 * Variables d'environnement à définir dans le tableau de bord Cloudflare
 * (Settings → Environment variables) :
 *   RESEND_API_KEY  — obligatoire, en secret chiffré
 *   RESEND_FROM     — optionnel, ex. "Nexa Web <formulaire@nexaaweb.com>".
 *                     Tant que le domaine n'est pas vérifié chez Resend, laisser
 *                     vide : l'expéditeur de test ci-dessous prend le relais.
 *   CONTACT_TO      — optionnel, destinataire des demandes
 */

const DESTINATAIRE_DEFAUT = 'contact.nexaweb62@gmail.com';
const EXPEDITEUR_DEFAUT = 'Nexa Web <onboarding@resend.dev>';

/* Bornes de longueur : un formulaire public reçoit tôt ou tard des charges
   utiles absurdes. On tronque plutôt que de rejeter, pour ne pas perdre une
   demande légitime un peu bavarde. */
const LIMITES = { nom: 120, commerce: 160, telephone: 40, moment: 80 };

const redirige = (vers) => new Response(null, { status: 303, headers: { Location: vers } });

export async function onRequestPost({ request, env }) {
  const origine = new URL(request.url).origin;

  let donnees;
  try {
    donnees = await request.formData();
  } catch {
    return redirige(`${origine}/probleme`);
  }

  /* Piège à robots. S'il est rempli, on renvoie la page de succès sans rien
     envoyer : un robot qui reçoit une erreur réessaie, un robot qui croit
     avoir réussi passe à autre chose. */
  const piege = (donnees.get('bot-field') ?? '').toString().trim();
  if (piege !== '') return redirige(`${origine}/merci`);

  const lire = (champ) =>
    (donnees.get(champ) ?? '').toString().trim().slice(0, LIMITES[champ] ?? 200);

  const nom = lire('nom');
  const commerce = lire('commerce');
  const telephone = lire('telephone');
  const moment = lire('moment') || 'Non précisé';

  if (!nom || !commerce || !telephone) return redirige(`${origine}/probleme`);

  const cle = env.RESEND_API_KEY;
  if (!cle) {
    console.error('RESEND_API_KEY absente : la demande de %s n a pas pu partir.', commerce);
    return redirige(`${origine}/probleme`);
  }

  const corps = [
    `Nom       : ${nom}`,
    `Commerce  : ${commerce}`,
    `Téléphone : ${telephone}`,
    `Rappel    : ${moment}`,
    '',
    `Reçu le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
  ].join('\n');

  try {
    const reponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM || EXPEDITEUR_DEFAUT,
        to: env.CONTACT_TO || DESTINATAIRE_DEFAUT,
        subject: `Demande de rappel — ${commerce}`,
        text: corps,
      }),
    });

    if (!reponse.ok) {
      console.error('Resend a refusé l envoi :', reponse.status, await reponse.text());
      return redirige(`${origine}/probleme`);
    }
  } catch (erreur) {
    console.error('Envoi impossible :', erreur);
    return redirige(`${origine}/probleme`);
  }

  return redirige(`${origine}/merci`);
}

/* Une requête GET sur cette adresse n'a pas de sens : on renvoie au formulaire. */
export async function onRequestGet({ request }) {
  return redirige(`${new URL(request.url).origin}/#contact`);
}
