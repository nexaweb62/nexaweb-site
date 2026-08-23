-- ── Ajout des colonnes de suivi livraison et de relance avis ────────────────
-- À exécuter dans l'éditeur SQL de Supabase (une seule fois).
--
-- livre_le : date à laquelle le site a été livré au client.
--   NULL  = projet non livré (en cours, refusé, archivé, sans suite…)
--   non NULL = livraison confirmée → déclenchera la relance avis 7 jours après
--
-- avis_relance_envoyee : flag anti-doublon — passe à true après envoi réussi.

ALTER TABLE demandes_devis
  ADD COLUMN IF NOT EXISTS livre_le              timestamptz,
  ADD COLUMN IF NOT EXISTS avis_relance_envoyee  boolean NOT NULL DEFAULT false;
