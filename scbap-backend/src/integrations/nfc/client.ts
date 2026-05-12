const NFC_DETENUS_URL =
  process.env.NFC_DETENUS_URL?.trim() ||
  "http://172.17.57.95:50049/api/detenus/all";

const NFC_TIMEOUT_MS = Number(process.env.NFC_TIMEOUT_MS || "60000");

export type NfcDetenuPayload = Record<string, unknown>;

export async function listNfcDetenus(): Promise<NfcDetenuPayload[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NFC_TIMEOUT_MS);

  try {
    const response = await fetch(NFC_DETENUS_URL, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`Erreur API NFC: ${response.status}${details ? ` - ${details}` : ""}`);
    }

    const payload = await response.json();

    if (Array.isArray(payload)) {
      return payload as NfcDetenuPayload[];
    }

    if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
      return (payload as { data: NfcDetenuPayload[] }).data;
    }

    throw new Error("Format de réponse API NFC invalide");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `L'API NFC ne répond pas après ${Math.round(NFC_TIMEOUT_MS / 1000)}s (${NFC_DETENUS_URL}). Vérifiez que le serveur backend peut joindre cette adresse.`,
      );
    }

    if (error instanceof Error && /fetch failed|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|ETIMEDOUT/i.test(error.message)) {
      throw new Error(`Impossible de contacter l'API NFC (${NFC_DETENUS_URL}): ${error.message}`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
