DELETE FROM "notifications" n
WHERE
  n.type = 'EVALUATION_SERVICE_EXTERNE_RECUE'
  AND n.metadata ? 'evaluationId'
  AND NOT EXISTS (
    SELECT 1
    FROM "evaluations_services_externes" e
    WHERE e.id = n.metadata->>'evaluationId'
  );

WITH duplicate_notifications AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY metadata->>'evaluationId'
      ORDER BY date_envoi DESC NULLS LAST, created_at DESC, id DESC
    ) AS row_number
  FROM "notifications"
  WHERE
    type = 'EVALUATION_SERVICE_EXTERNE_RECUE'
    AND metadata ? 'evaluationId'
)
DELETE FROM "notifications"
WHERE id IN (
  SELECT id
  FROM duplicate_notifications
  WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "notifications_evaluation_service_externe_unique"
ON "notifications" ((metadata->>'evaluationId'))
WHERE
  type = 'EVALUATION_SERVICE_EXTERNE_RECUE'
  AND metadata ? 'evaluationId';
