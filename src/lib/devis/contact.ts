/**
 * L'ADRESSE DE CONTACT — un seul endroit.
 *
 * Elle apparait a six endroits : la notification, trois messages
 * d'erreur, la page de confirmation, le modele d'environnement. Ecrite
 * six fois, elle aurait diverge au premier changement — c'est
 * exactement ce qui venait d'arriver, le code envoyant vers une adresse
 * et la documentation vers une autre.
 *
 * ── DEUX ADRESSES, DEUX ROLES ───────────────────────────────────────
 * EXPEDITEUR : contact@nexaaweb.com, le domaine verifie chez Resend.
 *   Il ne change pas : c'est lui qui authentifie nos envois.
 * DESTINATAIRE : la boite reellement relevee. C'est elle qu'on donne au
 *   visiteur quand on lui demande d'ecrire directement, et elle qui
 *   recoit les notifications.
 *
 * Les confondre reviendrait a envoyer les gens vers une adresse que
 * personne ne lit.
 */

/** L'expediteur verifie chez Resend. Ne pas changer sans reverifier le
 *  domaine, sous peine de voir tous les envois refuses. */
export const EXPEDITEUR = 'Nexa Web <contact@nexaaweb.com>';

/** La boite relevee, par defaut. CONTACT_EMAIL la remplace sans
 *  toucher au code. */
export const CONTACT_DEFAUT = 'contact.nexaweb62@gmail.com';

/** L'adresse a donner au visiteur, et a qui envoyer la notification. */
export const adresseContact = (env: Record<string, string | undefined>): string =>
  env.CONTACT_EMAIL || CONTACT_DEFAUT;
