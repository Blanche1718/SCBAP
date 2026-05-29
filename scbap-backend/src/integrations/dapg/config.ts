const DAPG_BASE_URL =
  process.env.DAPG_BASE_URL?.trim() ||
  "https://pprod-amenagementdepeine.justice.bj/api";

const DAPG_API_KEY = process.env.DAPG_API_KEY?.trim() || "";

export { DAPG_BASE_URL, DAPG_API_KEY };

