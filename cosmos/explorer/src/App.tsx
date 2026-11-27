import { AppShell } from '@/components/layout/AppShell';
import { SearchPanel } from '@/components/panels/SearchPanel';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { useGlobalKeyboard } from '@/hooks/useKeyboard';
import { MotionConfig } from 'framer-motion';

export function App() {
  useGlobalKeyboard();
  return (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <AppShell searchSlot={<SearchPanel />} />
      </ErrorBoundary>
    </MotionConfig>
  );
}
