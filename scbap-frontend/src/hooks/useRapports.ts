import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type {
  ApiResponse,
  DocumentRecu,
  EvaluationRecue,
  RapportRedige,
} from "../types";

function createCollectionHook<T>(path: string) {
  return function useCollection() {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get<ApiResponse<T[]>>(path);
        setItems(res.data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      fetch();
    }, [fetch]);

    return {
      items,
      loading,
      error,
      refetch: fetch,
    };
  };
}

export const useRapportsRediges = createCollectionHook<RapportRedige>("/rapports");
export const useEvaluationsRecues = createCollectionHook<EvaluationRecue>(
  "/rapports/evaluations",
);
export const useDocumentsRecus = createCollectionHook<DocumentRecu>("/rapports/documents");

export function createPrefilledRapport(input: {
  beneficiaireId: string;
  type: string;
  periodeDu?: string;
  periodeAu?: string;
}) {
  return api.post<ApiResponse<RapportRedige>>("/rapports/prefilled", input);
}

export type DraftRapportPayload = {
  obligations: Array<{
    obligationId: string;
    statut: "RESPECTEE" | "NON_RESPECTEE";
    commentaire?: string;
  }>;
  commentaireGeneral?: string;
};

export function updateDraftRapport(id: string, input: DraftRapportPayload) {
  return api.patch<ApiResponse<RapportRedige>>(`/rapports/${id}/draft`, input);
}

export function finalizeRapport(id: string, input: DraftRapportPayload) {
  return api.patch<ApiResponse<RapportRedige>>(`/rapports/${id}/finalize`, input);
}

export function reopenRapportDraft(id: string) {
  return api.patch<ApiResponse<RapportRedige>>(`/rapports/${id}/reopen`, {});
}
