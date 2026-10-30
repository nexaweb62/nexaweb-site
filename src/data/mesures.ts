/**
 * Mesures de CE site, lues par tous les composants Mesure.
 *
 * D'où viennent ces valeurs : Lighthouse 12.8.2 en ligne de commande, profil mobile par défaut
 * (réseau et processeur simulés, Moto G Power), sur le build de production servi en local
 * (`astro preview`). Médiane de 3 passes, une instance de Chrome neuve par passe.
 *
 * Pourquoi elles sont prudentes : le serveur local ne compresse pas. Le poids ci-dessous compte donc
 * les octets NON compressés ; en ligne (Cloudflare compresse en Brotli/gzip), la page pèse moins.
 *
 * Ce qui n'est volontairement PAS ici : le LCP et le score de performance. En laboratoire, le LCP
 * de l'accueil dépasse le seuil « bon » de Google (2,5 s) ; on ne publie que ce qu'on peut tenir.
 *
 * Remesurer : `npm run build && npx astro preview --port 4321`, puis
 * `npx lighthouse http://localhost:4321/ --chrome-flags="--headless=new --no-sandbox"
 *  --only-categories=performance --output=json` trois fois ; prendre la médiane de
 * `audits["total-byte-weight"].numericValue` (octets) / 1024, et de `audits["cumulative-layout-shift"]`.
 * Mettre à jour `date` le jour de la mesure.
 *
 * Dernière mesure : 30/10/2026, après l'ajout du simulateur et des graphiques (529,0 Ko, CLS 0,
 * identiques sur les 3 passes). Avant ces ajouts : 458,4 Ko.
 */
export const MESURE_ACCUEIL = {
  /** Poids total de la page d'accueil sur mobile, en Ko (1 Ko = 1 024 octets), non compressé. */
  poidsKo: 529.0,
  /** false : octets comptés sans compression (voir plus haut). */
  compresse: false,
  /** Décalage cumulé de mise en page (CLS) de l'accueil, médiane des 3 passes. */
  cls: 0,
  /** Jour de la mesure, AAAA-MM-JJ (le composant l'écrit dans la langue de la page). */
  date: '2026-10-30',
  /** Outil et version (le composant ajoute lui-même « mobile simulé »). */
  outil: 'Lighthouse 12.8.2',
} as const;
