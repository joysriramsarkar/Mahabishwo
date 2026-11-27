import { useExplorer } from '@/state/explorer';
import { Viewport3D } from './Viewport3D';
import { ViewportSky } from './ViewportSky';
import { ViewportSlice } from './ViewportSlice';
import { ViewportWedge } from './ViewportWedge';
import { ComovingView, TimeLabView, CompareObsView, StatisticsView, ModelLabView, LocalScopeView } from './ExtraViews';

export function Viewport() {
  const mode = useExplorer((s) => s.mode);
  const scope = useExplorer((s) => s.scope);
  if (scope === 'local') {
    return (
      <div className="relative h-full w-full overflow-hidden" role="region" aria-label="স্থানীয় মহাবিশ্ব দৃশ্য">
        <LocalScopeView />
      </div>
    );
  }
  return (
    <div className="relative h-full w-full overflow-hidden" role="region" aria-label="মহাজাগতিক দৃশ্য">
      {mode === '3d' && <Viewport3D />}
      {mode === 'sky' && <ViewportSky />}
      {mode === 'wedge' && <ViewportWedge />}
      {mode === 'slice' && <ViewportSlice />}
      {mode === 'comoving' && <ComovingView />}
      {mode === 'timelab' && <TimeLabView />}
      {mode === 'compare' && <CompareObsView />}
      {mode === 'statistics' && <StatisticsView />}
      {mode === 'modellab' && <ModelLabView />}
    </div>
  );
}
