import { AppShell } from '@/components/layout/AppShell';
import { SearchPanel } from '@/components/panels/SearchPanel';

export function App() {
  return <AppShell searchSlot={<SearchPanel />} />;
}
