# Mise en ligne — Nexa Web · nexaaweb.com

> Domaine de production : **https://nexaaweb.com** (deux A dans "nexaa")
> Projet Supabase : `abbplzlczwpqmyelopxo`

---

## A. Modifications dans le code ✅ (effectuées par Claude)

### A.1 · Occurrences 127.0.0.1 / localhost

| Fichier | Ligne | Contenu | Traitement |
|---------|-------|---------|------------|
| `supabase/functions/chat/index.ts` | 3 | `'http://127.0.0.1:5500'` | Conservé (dev local) |
| `supabase/functions/chat/index.ts` | 4 | `'http://localhost:5500'` | Conservé (dev local) |
| `supabase/functions/chat/index.ts` | 5 | `'https://nexaweb62.github.io'` | Remplacé par nexaaweb.com |
| `login.html` / `inscription.html` | — | `window.location.origin + '/espace-client.html'` | Dynamique — aucune action |
| `NOTES.md` | 72 | `localhost` dans un commentaire | Documentation — aucune action |

- [x] **`supabase/functions/chat/index.ts`** — ALLOWED_ORIGINS mis à jour :
  `nexaaweb.com`, `www.nexaaweb.com` ajoutés ; `nexaweb62.github.io` retiré ;
  `127.0.0.1:5500` et `localhost:5500` conservés pour le développement local.

### A.2 · CORS des Edge Functions

- [x] **`supabase/functions/chat/index.ts`** — tableau `ALLOWED_ORIGINS` clairement identifié
  en haut du fichier, facile à modifier.
- [x] **`supabase/functions/send-devis-email/index.ts`** — CORS restreint (remplace `"*"`)
  avec le même tableau `ALLOWED_ORIGINS` + helper `getCorsHeaders()`.

> ⚠️ Après modification des origines, redéployer les deux Edge Functions :
> ```
> supabase functions deploy chat
> supabase functions deploy send-devis-email
> ```

### A.3 · Audit des clés secrètes

- [x] **Clé anon Supabase** (`sb_publishable_uv77NJiEHPnkYYfHgltaZw_QvbEWoHd`) — présente
  dans `supabase-client.js` et `chat-widget.js`. **C'est normal** : c'est une clé publique
  par conception, protégée par les politiques RLS côté Supabase.
- [x] **GEMINI_API_KEY** — uniquement dans `Deno.env.get('GEMINI_API_KEY')` côté Edge Function.
  Jamais dans le code front. ✅
- [x] **RESEND_API_KEY** — uniquement dans `Deno.env.get('RESEND_API_KEY')` côté Edge Function.
  Jamais dans le code front. ✅
- [x] **Aucune clé service_role** détectée dans le code versionné. ✅

> ⚠️ `send-devis-email/index.ts` ligne ~62 : `from: "Nexa Web <onboarding@resend.dev>"`
> À changer en `"Nexa Web <devis@nexaaweb.com>"` **après** vérification DNS Resend.
> Ne pas changer avant — les emails ne partiront pas si le domaine n'est pas vérifié.

### A.4 · .gitignore

- [x] **`.gitignore`** complété :
  `.env`, `.env.*`, `*.local`, `supabase/.temp/`, `graphify-out/`, `.DS_Store`, `Thumbs.db`

### A.5 · netlify.toml

- [x] **`netlify.toml`** créé à la racine.
  Contenu : `publish = "."`, en-têtes de sécurité
  (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS),
  redirection 404 → `404.html`.
  Aucune commande de build (site statique pur).

### A.6 · Chemins de fichiers

- [x] Tous les `href` et `src` sont **relatifs** (`href="index.html"`, `src="script.js"`…).
  Aucun chemin absolu local détecté. Le site fonctionnera sur tout hébergement statique. ✅

---

## B. Modifications dans les dashboards (à faire manuellement)

### Supabase

- [ ] **Site URL** → `https://nexaaweb.com`
  URL : https://supabase.com/dashboard/project/abbplzlczwpqmyelopxo/auth/url-configuration

- [ ] **Redirect URLs** → ajouter `https://nexaaweb.com/**`
  (conserver `http://127.0.0.1:5500/**` pour le dev local)
  URL : https://supabase.com/dashboard/project/abbplzlczwpqmyelopxo/auth/url-configuration

- [ ] **CAPTCHA hCaptcha** → activer + coller la clé secrète (obtenue sur hcaptcha.com)
  URL : https://supabase.com/dashboard/project/abbplzlczwpqmyelopxo/auth/attack-protection
  > La clé **publique** hCaptcha devra ensuite être ajoutée dans `inscription.html`
  > (appel à `signUp` avec `options.captchaToken`).

### Google Cloud

- [ ] **Authorized JavaScript origins** → ajouter `https://nexaaweb.com`
  URL : https://console.cloud.google.com/apis/credentials
  → Clients → NexaWeb OAuth → Modifier

- [ ] **Publier l'application OAuth** (passer de "Testing" à "Production")
  URL : https://console.cloud.google.com/apis/credentials/consent
  > ⚠️ **Critique** : en mode "Testing", seuls les utilisateurs ajoutés manuellement
  > peuvent se connecter avec Google. Sans cette étape, la connexion Google est bloquée
  > pour tous les visiteurs. La publication est immédiate pour les scopes de base
  > (email, profile, openid) — aucune vérification Google requise.

### Resend

- [ ] **Vérifier le domaine nexaaweb.com**
  URL : https://resend.com/domains
  → Ajouter nexaaweb.com → Suivre les instructions DNS (enregistrements TXT/DKIM/DMARC)
  > Sans domaine vérifié, les emails ne partent que vers l'adresse du compte Resend.
  > Les notifications de devis n'arriveront pas en prod.

- [ ] **Après vérification DNS** → dans `supabase/functions/send-devis-email/index.ts`,
  remplacer :
  ```
  from: "Nexa Web <onboarding@resend.dev>"
  ```
  par :
  ```
  from: "Nexa Web <devis@nexaaweb.com>"
  ```
  Puis redéployer : `supabase functions deploy send-devis-email`

### Netlify

- [ ] **Ajouter le domaine personnalisé** nexaaweb.com
  URL : https://app.netlify.com → ton site → Domain management → Add custom domain

- [ ] **Configurer les DNS** chez le registrar
  (pointer l'enregistrement A ou CNAME vers les serveurs Netlify indiqués)

- [ ] **Vérifier le certificat HTTPS** (Let's Encrypt, émis automatiquement par Netlify
  une fois les DNS propagés — peut prendre jusqu'à 48 h)

---

## C. Tests après mise en ligne

- [ ] **Formulaire de devis** : soumettre un devis complet →
  vérifier réception email + ligne en base
  (Supabase → Table Editor → `demandes_devis`)

- [ ] **Inscription classique** : créer un compte → vérifier email de confirmation →
  cliquer le lien → se connecter → accéder à l'espace client

- [ ] **Connexion Google** : cliquer "Continuer avec Google" →
  vérifier redirection vers espace client → vérifier que le profil est créé dans `profiles`

- [ ] **Connexion classique** : email + mot de passe → vérifier redirection

- [ ] **RLS — test double compte** :
  Créer 2 comptes distincts → assigner un projet à chacun via le dashboard Supabase
  (Table Editor → `projets` → insérer avec le bon `client_id`) →
  vérifier que chaque utilisateur ne voit **que ses propres données**

- [ ] **Chat IA** : envoyer 10 messages → vérifier les réponses Gemini →
  envoyer un 11e → vérifier le blocage rate limit (message d'erreur ou silence)

- [ ] **Console navigateur propre** : ouvrir DevTools (F12) sur chaque page principale →
  aucune erreur rouge → aucun avertissement CORS

- [ ] **Mobile** : tester sur smartphone (largeur 375 px minimum) —
  navigation, formulaire de devis, espace client, chat widget
