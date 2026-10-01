/**
 * Un compteur qui survit d'une instance de composant a l'autre.
 *
 * Le bloc de tete d'un composant Astro est le corps de sa fonction de
 * rendu : il est rejoue a chaque instance, et un `let` declare la-bas
 * repart donc a zero a chaque fois. Pour numeroter des instances, il faut
 * un module separe — celui-ci est charge une fois par construction.
 */
const compteurs = new Map<string, number>();

export function uid(prefixe: string): string {
  const n = compteurs.get(prefixe) ?? 0;
  compteurs.set(prefixe, n + 1);
  return prefixe + n.toString(36);
}
