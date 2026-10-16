import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicationProvider } from '../../shared/runtime/publicationRuntime';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}><PublicationProvider>{children}</PublicationProvider></QueryClientProvider>;
}
