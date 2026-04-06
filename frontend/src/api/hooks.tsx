import { createContext, useContext, useMemo } from 'react';
import { MtgApiClient } from './client';
import type { ApiClientConfig } from './client';

export const ApiClientContext = createContext<MtgApiClient | null>(null);

export function ApiClientProvider({
  config,
  children,
}: {
  config: ApiClientConfig;
  children: React.ReactNode;
}) {
  const client = useMemo(
    () => new MtgApiClient(config),
    [config.baseUrl, config.apiKey],
  );
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}

export function useApiClient(): MtgApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be used within an ApiClientProvider');
  }
  return client;
}
