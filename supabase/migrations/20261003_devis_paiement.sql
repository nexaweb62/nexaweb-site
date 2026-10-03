-- ── L'échéancier choisi par le visiteur ────────────────────────────────────
-- À exécuter dans l'éditeur SQL de Supabase (une seule fois).
--
-- paiement : comment le client souhaite régler, repris de la page Tarifs.
--   'comptant' = en une fois (valeur par défaut, et ce que le formulaire
--                envoie quand le visiteur ne touche à rien)
--   '3'        = en 3 mensualités
--   '4'        = en 4 mensualités
--
-- Tant que cette migration n'est pas passée, le formulaire continue de
-- fonctionner : il renvoie la demande sans cette colonne et l'échéancier
-- n'arrive que par e-mail. Aucune demande n'est perdue.

ALTER TABLE demandes_devis
  ADD COLUMN IF NOT EXISTS paiement text NOT NULL DEFAULT 'comptant';
