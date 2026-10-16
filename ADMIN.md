# Tableau de bord interne — mise en service

Le code est en place. Il reste **six étapes manuelles**, toutes de ton côté :
trois dans la console Google Cloud, une dans la feuille, une chez Cloudflare,
et une vérification finale. La commande de déploiement, elle, ne change pas
— voir le point 7.

Tant qu'elles ne sont pas faites, `/admin` répond **403** et n'ouvre rien.
C'est voulu : une configuration absente ferme la porte, elle ne la laisse pas
entrouverte.

---

## 1. Projet Google Cloud

<https://console.cloud.google.com/>

1. Crée un projet, par exemple `nexaweb-interne`.
2. **API et services → Bibliothèque** → active **Google Sheets API**.

---

## 2. Écran de consentement OAuth

**API et services → Écran de consentement OAuth**

- Type : **Externe**
- Nom de l'application : `Nexa Web — interne`
- Adresse d'assistance et de contact : ton e-mail
- **Utilisateurs de test** : ajoute les deux adresses
  `ahmoudchteoui@gmail.com` et `imadtorchi6@gmail.com`

Tu n'as pas besoin de publier l'application ni de demander une validation :
en mode test, seuls les utilisateurs de test peuvent se connecter. C'est une
deuxième serrure, en plus de notre liste blanche.

---

## 3. Identifiant client OAuth

**API et services → Identifiants → Créer → ID client OAuth**

- Type : **Application Web**
- Nom : `Nexa Web admin`
- **URI de redirection autorisés** — exactement ceci, au caractère près :

  ```
  https://nexaaweb.com/admin/callback
  ```

  Une barre finale en trop, `http` au lieu de `https`, ou `www.` devant,
  et Google refusera la connexion avec `redirect_uri_mismatch`.

Note l'**ID client** et le **secret client**.

---

## 4. Compte de service (lecture de la feuille)

**IAM et administration → Comptes de service → Créer**

1. Nom : `nexaweb-sheets-lecture`. Aucun rôle IAM n'est nécessaire — l'accès
   à la feuille se donne par le partage, à l'étape 5.
2. Ouvre le compte créé → onglet **Clés** → **Ajouter une clé → Créer →
   JSON**. Un fichier se télécharge.
3. Dans ce fichier, relève :
   - `client_email` → ce sera `GOOGLE_SA_EMAIL`
   - `private_key` → ce sera `GOOGLE_SA_PRIVATE_KEY`

**Ce fichier JSON est une clé.** Ne le mets pas dans le dépôt, ne l'envoie
pas par message. Une fois les deux valeurs copiées dans Cloudflare, supprime-le.

---

## 5. Partage de la feuille

Ouvre **Nexa_Web_Prospection_semaine** → **Partager** → colle l'adresse
`client_email` du compte de service → droit **Lecteur** → Envoyer.

**Ne rends jamais la feuille publique.** Le compte de service n'a besoin que
d'être invité, et le jeton demandé est en lecture seule : même si la clé
fuyait, elle ne pourrait rien écrire.

---

## 6. Variables d'environnement chez Cloudflare

Worker **nexaweb-site** → **Settings → Variables and Secrets**

| Nom | Type | Valeur |
|---|---|---|
| `ADMIN_EMAILS` | Texte | `ahmoudchteoui@gmail.com,imadtorchi6@gmail.com` |
| `ADMIN_SESSION_SECRET` | **Secret** | `openssl rand -base64 48` |
| `GOOGLE_OAUTH_CLIENT_ID` | Texte | l'ID client de l'étape 3 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | **Secret** | le secret client de l'étape 3 |
| `GOOGLE_SA_EMAIL` | Texte | le `client_email` de l'étape 4 |
| `GOOGLE_SA_PRIVATE_KEY` | **Secret** | la `private_key` de l'étape 4, en entier |
| `SHEET_ID` | Texte | `1cqr42IttF4k9FC65BEuVklgJoYP_HYU1xB78gF4yr5k` |

Sur `GOOGLE_SA_PRIVATE_KEY` : colle la valeur **entière**, de
`-----BEGIN PRIVATE KEY-----` à `-----END PRIVATE KEY-----`. Les sauts de
ligne peuvent être de vrais retours ou des `\n` échappés, le code accepte les
deux.

`ADMIN_EMAILS` est relue **à chaque requête** : retirer une adresse ferme
l'accès immédiatement, sans attendre l'expiration du cookie. Changer
`ADMIN_SESSION_SECRET` déconnecte tout le monde d'un coup.

---

## 7. La commande de déploiement — rien à changer

**Je t'ai d'abord dit le contraire. C'était faux, et voici la mesure qui
le montre.**

Le build produit maintenant deux dossiers au lieu d'un :

```
dist/client/   les 23 pages publiques, prérendues comme avant
dist/server/   le Worker, pour /admin et son API seulement
```

J'en avais conclu qu'il fallait remplacer la commande de déploiement par
`npx wrangler deploy -c dist/server/wrangler.json`. Vérification faite,
c'est inutile : `npm run build` écrit `.wrangler/deploy/config.json`, un
fichier de **redirection** que wrangler lit tout seul. Un `npx wrangler
deploy` nu annonce alors :

```
Using redirected Wrangler configuration.
 - Configuration being used: "dist/server/wrangler.json"
 - Original user's configuration: "wrangler.toml"
```

et déploie le Worker avec ses 143 fichiers statiques. Testé après avoir
effacé `.wrangler/` **et** `dist/`, donc dans les conditions d'un
checkout propre comme celui de Cloudflare.

**Tu n'as donc rien à toucher dans le tableau de bord Cloudflare.** Ni la
commande de build (`npm run build`), ni celle de déploiement.

## 8. Vérifier

1. Ouvre <https://nexaaweb.com/admin> dans une fenêtre privée → tu dois
   arriver sur la page de connexion.
2. Connecte-toi avec `ahmoudchteoui@gmail.com` → le tableau de bord s'affiche.
3. Déconnecte-toi, puis essaie avec **un troisième compte Google** → tu dois
   voir **« Accès refusé »**, et non le tableau de bord.
4. Toujours avec ce troisième compte, ouvre
   <https://nexaaweb.com/api/admin/data> → tu dois recevoir du JSON
   `{"erreur":"..."}` en 403, jamais les données.

Les points 3 et 4 sont les seuls qui comptent vraiment. Le reste du système
peut marcher parfaitement et être inutile si ceux-là échouent.

---

## Les deux onglets à créer

Ils n'existent pas encore, et le tableau de bord l'affiche proprement plutôt
que de planter. Dès que tu les crées, ils apparaissent tout seuls — en-têtes
en **ligne 1** :

**`Ventes`**

| facture | date | client | prestation | montant_ht | statut |
|---|---|---|---|---|---|

`statut` vaut `Payé` ou `En attente`. Un `date` au format `15/03/2026` ou
`2026-03-15`, les deux sont lus.

**`Projets`**

| client | projet | statut | assigne | echeance | montant_ht |
|---|---|---|---|---|---|

Un projet compte comme livré si son statut contient `Livré`, `Terminé`,
`Fini` ou `En ligne`. Les échéances vides partent en fin de liste, jamais en
tête.

---

## Comment les indicateurs sont comptés

La colonne `STATUT` est du texte libre. On normalise (accents retirés,
majuscules) et on cherche par **inclusion** : « Refusé » compte comme un
refus, « Devis envoyé » comme un devis.

| Indicateur | Objectif | Règle |
|---|---|---|
| Prospects actifs | 40 | statut ne contenant ni `Écarté`, ni `Refus`, ni `Perdu` |
| Contactés | 30 | actif, et statut ni vide ni `À appeler` |
| RDV obtenus | 5 | statut contenant `RDV`, `Devis` ou `Signé` |
| Clients signés | 1 | statut contenant `Signé` ou `Gagné` |

**Une case `STATUT` vide vaut « À appeler »** : elle compte dans les actifs,
pas dans les contactés. Pris à la lettre, « différent de À appeler » aurait
fait entrer toutes les cases vides dans le compteur des contactés et annoncé
des appels qui n'ont jamais eu lieu.

Une ligne dont `ENTREPRISE` est vide est ignorée — c'est une séparation, pas
un prospect.

---

## Tester en local

```bash
cp .env.example .dev.vars     # puis remplis les valeurs
npm run build
cp .dev.vars dist/server/.dev.vars
npx wrangler dev -c dist/server/wrangler.json --port 8787 --local

npm run check:admin           # 24 contrôles d'accès
npm run check:admin:rendu     # le tableau de bord s'affiche et compte juste
```

`.dev.vars` est dans `.gitignore`. Ne le commite jamais.
