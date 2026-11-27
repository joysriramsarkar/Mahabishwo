import { useExplorer } from '@/state/explorer';
import { Viewport3D } from './Viewport3D';
import { ViewportSky } from './ViewportSky';
import { ViewportSlice } from './ViewportSlice';

export function Viewport() {
  const mode = useExplorer((s) => s.mode);
  return (
    <div className="relative h-full w-full overflow-hidden" role="region" aria-label="মহাজাগতিক দৃশ্য">
      {mode === '3d' && <Viewport3D />}
      {mode === 'sky' && <ViewportSky />}
      {mode === 'slice' && <ViewportSlice />}
    </div>
  );
}
