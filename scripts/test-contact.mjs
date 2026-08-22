/* Test de la fonction /api/contact, sans reseau et sans Cloudflare.

   Le formulaire est le seul chemin de conversion du site : une erreur de
   syntaxe ou un champ oublie ne se voit nulle part avant la premiere demande
   perdue. Ce test appelle la fonction directement, avec un `fetch` remplace,
   et verifie les quatre comportements qui comptent.

   `npm run test:contact` */

import assert from 'node:assert/strict';

const { onRequestPost, onRequestGet } = await import('../functions/api/contact.js');

const requete = (champs) => {
  const donnees = new FormData();
  for (const [k, v] of Object.entries(champs)) donnees.set(k, v);
  return {
    url: 'https://nexaaweb.com/api/contact',
    formData: async () => donnees,
  };
};

const vrai = { RESEND_API_KEY: 'test' };
let envoye = null;
globalThis.fetch = async (url, init) => {
  envoye = { url, corps: JSON.parse(init.body) };
  return { ok: true, status: 200, text: async () => '' };
};

const complet = { nom: 'Marie Dupont', commerce: 'Le Grenier', telephone: '0612345678', moment: 'En matinée — 9h à 11h30', origine: 'site-internet-restaurant' };

/* 1. Demande complete : e-mail envoye, redirection vers /merci */
let r = await onRequestPost({ request: requete(complet), env: vrai });
assert.equal(r.status, 303);
assert.equal(r.headers.get('Location'), 'https://nexaaweb.com/merci');
assert.match(envoye.corps.text, /Marie Dupont/);
assert.match(envoye.corps.text, /Le Grenier/);
assert.match(envoye.corps.text, /site-internet-restaurant/, "la provenance doit figurer dans l'e-mail");
assert.match(envoye.corps.subject, /Le Grenier/);
console.log('  ok — demande complete transmise, provenance comprise');

/* 2. Champ obligatoire manquant : rien n'est envoye */
envoye = null;
r = await onRequestPost({ request: requete({ ...complet, telephone: '' }), env: vrai });
assert.equal(r.headers.get('Location'), 'https://nexaaweb.com/probleme');
assert.equal(envoye, null);
console.log('  ok — demande incomplete refusee sans envoi');

/* 3. Piege a robots rempli : succes affiche, rien envoye */
envoye = null;
r = await onRequestPost({ request: requete({ ...complet, 'bot-field': 'spam' }), env: vrai });
assert.equal(r.headers.get('Location'), 'https://nexaaweb.com/merci');
assert.equal(envoye, null);
console.log('  ok — robot silencieusement ecarte');

/* 4. Cle absente : page d'echec, aucune tentative */
envoye = null;
r = await onRequestPost({ request: requete(complet), env: {} });
assert.equal(r.headers.get('Location'), 'https://nexaaweb.com/probleme');
assert.equal(envoye, null);
console.log('  ok — cle absente signalee au visiteur');

/* 5. GET : renvoi au formulaire */
r = await onRequestGet({ request: { url: 'https://nexaaweb.com/api/contact' } });
assert.equal(r.headers.get('Location'), 'https://nexaaweb.com/#contact');
console.log('  ok — GET renvoye vers le formulaire');

console.log('test-contact : 5 verifications passees.');
