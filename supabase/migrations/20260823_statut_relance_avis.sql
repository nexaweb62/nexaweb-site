-- ── Ajout des colonnes de statut et de relance avis sur demandes_devis ──────
-- À exécuter dans l'éditeur SQL de Supabase (une seule fois).

ALTER TABLE demandes_devis
  ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'nouveau'
    CHECK (statut IN ('nouveau', 'en_cours', 'termine', 'annule')),
  ADD COLUMN IF NOT EXISTS statut_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS avis_relance_envoyee boolean NOT NULL DEFAULT false;

-- ── Trigger : met à jour statut_updated_at à chaque changement de statut ────
CREATE OR REPLACE FUNCTION update_statut_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.statut IS DISTINCT FROM NEW.statut THEN
    NEW.statut_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_statut_updated_at ON demandes_devis;

CREATE TRIGGER trg_statut_updated_at
BEFORE UPDATE ON demandes_devis
FOR EACH ROW EXECUTE FUNCTION update_statut_updated_at();
