import { useMemo, useState, type ReactNode } from 'react';
import { PollingContext } from '../hooks/polling';

export function PollingProvider({ children }: { children: ReactNode }) {
  const [interval, setInterval] = useState(5000);
  const value = useMemo(() => ({ interval, setInterval }), [interval]);
  return <PollingContext.Provider value={value}>{children}</PollingContext.Provider>;
}
