/// <reference types="astro/client" />

/**
 * LES VARIABLES D'ENVIRONNEMENT DU TABLEAU DE BORD.
 *
 * Toutes sont des SECRETS Cloudflare, sauf ADMIN_EMAILS et SHEET_ID qui
 * sont de simples variables. Aucune ne doit apparaitre dans le code, ni
 * partir vers le navigateur : elles ne sont lues que depuis un contexte
 * serveur (middleware, endpoint, page non prerendue).
 *
 * Elles ne sont PAS declarees via « import.meta.env » : sur Cloudflare,
 * les secrets n'existent qu'a l'execution, attaches a la requete. Les
 * lire au build donnerait undefined — et, pire, les figerait dans le
 * paquet si elles existaient.
 */
interface EnvAdminDoc {
  /** Liste blanche, separee par des virgules. La seule source de verite. */
  ADMIN_EMAILS: string;
  /** Cle HMAC du cookie de session. 32 octets aleatoires au minimum. */
  ADMIN_SESSION_SECRET: string;
  /** Identifiants du client OAuth dedie a l'admin. */
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  /** Compte de service, en lecture seule sur la feuille. */
  GOOGLE_SA_EMAIL: string;
  /** Cle privee PEM. Les sauts de ligne peuvent etre echappes en \n. */
  GOOGLE_SA_PRIVATE_KEY: string;
  /** Identifiant de la feuille de prospection. */
  SHEET_ID: string;
}

/* Les variables ne se lisent plus par « locals.runtime.env » : cet acces
   a ete retire. Elles passent par src/lib/admin/env.ts, qui importe
   « cloudflare:workers » a l'execution. L'interface ci-dessus documente
   donc le contrat ; le type utilisable vit dans ce module. */

declare namespace App {
  interface Locals extends import('@astrojs/cloudflare').Runtime {
    /**
     * Pose par le middleware quand, et seulement quand, la requete porte
     * une session valide dont l'e-mail est dans la liste blanche.
     * Une page qui lit ceci sait que la verification a eu lieu.
     */
    admin?: { email: string };
  }
}
