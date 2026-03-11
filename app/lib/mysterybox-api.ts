/**
 * Mystery box list + status + open flow from backend.
 * Set NEXT_PUBLIC_API_URL (e.g. http://localhost:3001). Backend EIP-712 domain.chainId
 * must match the wallet chain (wagmi config) or signature will fail.
 */

const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "";

export type BoxListEntry = {
  boxId: string;
  opened: boolean;
  chainRegistered: boolean;
};

export type BoxListResponse = {
  items: BoxListEntry[];
  total: number;
  limit: number;
  offset: number;
};

/** Backend GET /boxes/:boxId/open-typed-data response — pass to signTypedData */
export type OpenTypedDataResponse = {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: `0x${string}`;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: "OpenIntent";
  message: {
    boxId: string;
    user: `0x${string}`;
    nonce: string;
    deadline: string;
  };
};

export function getApiBase(): string {
  return API_BASE;
}

export async function fetchBoxList(params: {
  opened?: boolean;
  limit?: number;
  offset?: number;
}): Promise<BoxListResponse | null> {
  if (!API_BASE) return null;
  const sp = new URLSearchParams();
  if (params.opened === true) sp.set("opened", "true");
  if (params.opened === false) sp.set("opened", "false");
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  const url = `${API_BASE}/boxes${sp.toString() ? `?${sp}` : ""}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return r.json() as Promise<BoxListResponse>;
  } catch {
    // 后端未启动 / CORS / 网络 → 避免未捕获的 TypeError: Failed to fetch
    return null;
  }
}

export async function fetchBoxStatus(boxId: string): Promise<{
  boxId: string;
  opened: boolean;
  chainRegistered: boolean;
  chainCommitment: string | null;
} | null> {
  if (!API_BASE) return null;
  try {
    const r = await fetch(`${API_BASE}/boxes/${encodeURIComponent(boxId)}/status`, {
      cache: "no-store",
    });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

export async function fetchOpenTypedData(
  boxId: string,
  user: `0x${string}`
): Promise<OpenTypedDataResponse | { error: string }> {
  if (!API_BASE) return { error: "API not configured" };
  let r: Response;
  try {
    r = await fetch(
      `${API_BASE}/boxes/${encodeURIComponent(boxId)}/open-typed-data?user=${encodeURIComponent(user)}`,
      { cache: "no-store" }
    );
  } catch {
    return { error: "Failed to fetch (backend down or CORS)" };
  }
  const j = await r.json();
  if (!r.ok) return { error: (j as { error?: string }).error ?? r.statusText };
  return j as OpenTypedDataResponse;
}

export async function postOpen(
  boxId: string,
  signature: `0x${string}`,
  message: OpenTypedDataResponse["message"]
): Promise<{ txHash: string; boxId: string } | { error: string; detail?: string }> {
  if (!API_BASE) return { error: "API not configured" };
  let r: Response;
  try {
    r = await fetch(`${API_BASE}/boxes/${encodeURIComponent(boxId)}/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature, message }),
    });
  } catch {
    return { error: "Failed to fetch (backend down or CORS)" };
  }
  const j = await r.json();
  if (!r.ok)
    return {
      error: (j as { error?: string }).error ?? r.statusText,
      detail: (j as { detail?: string }).detail,
    };
  return j as { txHash: string; boxId: string };
}

/** My page: opens recorded for this wallet after POST /open */
export type MyOpenEntry = {
  boxId: string;
  amount: string | null;
  /** 实际发放的 wei；有则展示为 HSK */
  rewardWei?: string | null;
  txHash: string | null;
  openedAt: string | null;
};

/** GET /boxes/:boxId/chain-open — 链上 getOpen 摘要 */
export type ChainOpenSummary = {
  boxId: string;
  proofLength: number;
  commitment: string;
  timestamp: string;
  user: `0x${string}`;
};

export type HealthResponse = {
  ok: boolean;
  chainId: number;
  persistence: string;
  blindBoxAddress?: `0x${string}`;
  vaultAddress?: `0x${string}` | null;
};

export async function fetchHealth(): Promise<HealthResponse | null> {
  if (!API_BASE) return null;
  try {
    const r = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (!r.ok) return null;
    return r.json() as Promise<HealthResponse>;
  } catch {
    return null;
  }
}

export async function fetchChainOpen(boxId: string): Promise<ChainOpenSummary | null> {
  if (!API_BASE) return null;
  try {
    const r = await fetch(`${API_BASE}/boxes/${encodeURIComponent(boxId)}/chain-open`, {
      cache: "no-store",
    });
    if (!r.ok) return null;
    return r.json() as Promise<ChainOpenSummary>;
  } catch {
    return null;
  }
}

export async function fetchMyOpens(
  user: `0x${string}`,
  params?: { limit?: number; offset?: number }
): Promise<{ items: MyOpenEntry[]; total: number } | null> {
  if (!API_BASE) return null;
  const sp = new URLSearchParams({ user });
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  try {
    const r = await fetch(`${API_BASE}/me/opens?${sp}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as { items: MyOpenEntry[]; total: number };
    return { items: j.items ?? [], total: j.total ?? 0 };
  } catch {
    return null;
  }
}
