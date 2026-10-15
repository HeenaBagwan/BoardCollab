import { useMemo } from 'react';
import { ViewportBox } from '../types';

export function useViewportCulling(
  stagePos: { x: number; y: number },
  stageScale: number,
  dimensions: { width: number; height: number },
  buffer: number = 200
): ViewportBox {
  return useMemo(() => {
    // Transform screen viewport rectangle into canvas coordinate space
    const minX = (-stagePos.x - buffer) / stageScale;
    const minY = (-stagePos.y - buffer) / stageScale;
    const maxX = (-stagePos.x + dimensions.width + buffer) / stageScale;
    const maxY = (-stagePos.y + dimensions.height + buffer) / stageScale;

    return { minX, minY, maxX, maxY };
  }, [stagePos.x, stagePos.y, stageScale, dimensions.width, dimensions.height, buffer]);
}

export default useViewportCulling;
