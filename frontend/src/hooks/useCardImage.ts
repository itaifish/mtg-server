import { useState, useEffect, useContext, useRef } from 'react';
import { ApiClientContext } from '@/api/hooks';
import { getCardImageUrl } from '@/services/cardImageCache';

/** Fetches and caches a card image URL by oracleId. Retries on failure with backoff. */
export function useCardImage(oracleId?: string): string | null {
  const client = useContext(ApiClientContext);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const retryRef = useRef(0);

  useEffect(() => {
    if (!oracleId || !client) return;
    let cancelled = false;
    retryRef.current = 0;

    const attempt = () => {
      getCardImageUrl(client, oracleId).then((url) => {
        if (cancelled) return;
        if (url) {
          setImageUrl(url);
        } else if (retryRef.current < 2) {
          retryRef.current++;
          setTimeout(attempt, 1000 * retryRef.current);
        }
      });
    };
    attempt();

    return () => { cancelled = true; };
  }, [client, oracleId]);

  return oracleId ? imageUrl : null;
}
