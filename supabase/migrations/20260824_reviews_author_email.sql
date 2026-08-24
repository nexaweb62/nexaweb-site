-- Ajoute un champ e-mail optionnel sur la table reviews.
-- Permet d'envoyer un accusé de réception au reviewer après soumission.
-- NULL = reviewer n'a pas fourni son e-mail (cas normal).

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS author_email text;
