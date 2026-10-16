/**
 * L'ACCES AUX VARIABLES D'ENVIRONNEMENT — un seul endroit.
 *
 * ── POURQUOI CE DETOUR ──────────────────────────────────────────────
 * « Astro.locals.runtime.env » a disparu : l'adaptateur leve desormais
 * une erreur explicite et renvoie vers « import { env } from
 * "cloudflare:workers" ». Mais ce module n'existe QUE dans workerd.
 * Or le middleware est aussi charge par Node pendant le prerendu des 23
 * pages publiques, ou l'importer en tete de fichier casserait le build.
 *
 * D'ou l'importation dynamique, tentee une seule fois et mise en cache.
 * Hors Worker elle echoue sans bruit et l'on retombe sur process.env —
 * ce qui rend aussi les tests possibles en Node pur.
 *
 * Le resultat n'est JAMAIS passe au navigateur : seuls le middleware,
 * les endpoints et les pages non prerendues lisent ces valeurs.
 */

export type EnvAdmin = {
  ADMIN_EMAILS: string;
  ADMIN_SESSION_SECRET: string;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  GOOGLE_SA_EMAIL: string;
  GOOGLE_SA_PRIVATE_KEY: string;
  SHEET_ID: string;
};

let resolu: Partial<EnvAdmin> | null = null;

export async function lireEnv(): Promise<Partial<EnvAdmin>> {
  if (resolu) return resolu;
  try {
    /* Chaine construite a l'execution : Vite ne doit pas tenter de
       resoudre ce specificateur pendant le build Node du prerendu. */
    const module = 'cloudflare:workers';
    const m = await import(/* @vite-ignore */ module);
    if (m && m.env) {
      resolu = m.env as Partial<EnvAdmin>;
      return resolu;
    }
  } catch {
    /* Pas dans un Worker : on continue vers process.env. */
  }
  const p = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process;
  resolu = (p?.env ?? {}) as Partial<EnvAdmin>;
  return resolu;
}
