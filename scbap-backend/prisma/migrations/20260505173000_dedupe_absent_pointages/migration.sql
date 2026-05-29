WITH duplicate_absences AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY obligation_id, date_heure
      ORDER BY id
    ) AS row_number
  FROM "pointages"
  WHERE
    obligation_id IS NOT NULL
    AND statut = 'ABSENT'
    AND source = 'SYSTEME'
)
DELETE FROM "notifications"
WHERE pointage_id IN (
  SELECT id
  FROM duplicate_absences
  WHERE row_number > 1
);

WITH duplicate_absences AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY obligation_id, date_heure
      ORDER BY id
    ) AS row_number
  FROM "pointages"
  WHERE
    obligation_id IS NOT NULL
    AND statut = 'ABSENT'
    AND source = 'SYSTEME'
)
DELETE FROM "alertes_surveillance"
WHERE
  type = 'ABSENCE_POINTAGE'
  AND metadata->>'pointageId' IN (
    SELECT id
    FROM duplicate_absences
    WHERE row_number > 1
  );

WITH duplicate_absences AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY obligation_id, date_heure
      ORDER BY id
    ) AS row_number
  FROM "pointages"
  WHERE
    obligation_id IS NOT NULL
    AND statut = 'ABSENT'
    AND source = 'SYSTEME'
)
DELETE FROM "pointages"
WHERE id IN (
  SELECT id
  FROM duplicate_absences
  WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "pointages_system_absence_obligation_date_unique"
ON "pointages" ("obligation_id", "date_heure")
WHERE
  obligation_id IS NOT NULL
  AND statut = 'ABSENT'
  AND source = 'SYSTEME';
