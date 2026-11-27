import { AppShell } from '@/components/layout/AppShell';
import { SearchPanel } from '@/components/panels/SearchPanel';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { useGlobalKeyboard } from '@/hooks/useKeyboard';

export function App() {
  useGlobalKeyboard();
  return (
    <ErrorBoundary>
      <AppShell searchSlot={<SearchPanel />} />
    </ErrorBoundary>
  );
}
