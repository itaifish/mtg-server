import type { MtgApiClient } from '@/api/client';

/** In-memory cache: oracleId → blob object URL */
const cache = new Map<string, string>();
const failures = new Map<string, number>();
const MAX_RETRIES = 3;

/** Fetch a card image via the backend proxy, download as blob, and cache as object URL. */
export async function getCardImageUrl(
  client: MtgApiClient,
  oracleId: string,
): Promise<string | null> {
  const cached = cache.get(oracleId);
  if (cached) return cached;

  const retryCount = failures.get(oracleId) ?? 0;
  if (retryCount >= MAX_RETRIES) return null;

  try {
    // Get the image URL from our backend
    const { imageUrl } = await client.getCardImage(oracleId, 'normal');
    // Download the image through our fetch pipeline (Tauri HTTP plugin bypasses CORS)
    const res = await client.fetchRaw(imageUrl);
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    cache.set(oracleId, objectUrl);
    failures.delete(oracleId);
    return objectUrl;
  } catch {
    failures.set(oracleId, retryCount + 1);
    return null;
  }
}
