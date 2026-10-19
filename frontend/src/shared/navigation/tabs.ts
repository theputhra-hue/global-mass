/** Stable legacy dashboard destinations, shared without importing a UI component. */
export const dashboardTabs = ['overview', 'factcheck', 'atlas', 'fullgraph', 'timeline', 'masala', 'graph', 'vector', 'cache', 'corpus', 'eval', 'project', 'casebook'] as const;
export type TabType = typeof dashboardTabs[number];

export function isDashboardTab(value: string): value is TabType {
  return (dashboardTabs as readonly string[]).includes(value);
}
