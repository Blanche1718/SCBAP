-- Remet en coherence les statuts des beneficiaires
-- Source de verite:
--   1. REVOQUE si deja marque comme revoque
--   2. ACTIF si profil_confirme = true
--   3. sinon A_CONFIGURER

UPDATE beneficiaires
SET
  profil_statut = CASE
    WHEN profil_statut = 'REVOQUE' OR statut = 'REVOQUE' THEN 'REVOQUE'
    WHEN profil_confirme IS TRUE THEN 'ACTIF'
    ELSE 'A_CONFIGURER'
  END,
  statut = CASE
    WHEN profil_statut = 'REVOQUE' OR statut = 'REVOQUE' THEN 'REVOQUE'
    WHEN profil_confirme IS TRUE THEN 'ACTIF'
    ELSE 'A_CONFIGURER'
  END,
  profil_confirme = CASE
    WHEN profil_statut = 'REVOQUE' OR statut = 'REVOQUE' THEN FALSE
    WHEN profil_confirme IS TRUE THEN TRUE
    ELSE FALSE
  END,
  profil_confirme_le = CASE
    WHEN (CASE
      WHEN profil_statut = 'REVOQUE' OR statut = 'REVOQUE' THEN 'REVOQUE'
      WHEN profil_confirme IS TRUE THEN 'ACTIF'
      ELSE 'A_CONFIGURER'
    END) = 'ACTIF'
    THEN COALESCE(profil_confirme_le, created_at)
    ELSE NULL
  END;
