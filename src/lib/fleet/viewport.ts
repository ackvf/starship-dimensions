import { INITIAL_SCALE, MIN_SCALE } from '$lib/constants'
import type { FleetBounds, FleetViewport } from './types';

export const computeMinScale = (
	bounds: FleetBounds,
	containerWidth: number,
  containerHeight: number,
  absoluteMinScale = MIN_SCALE,
  fitFactor = INITIAL_SCALE
): number => {
  const fleetWidth = Math.max(1, bounds.maxX - bounds.minX)
  const fleetHeight = Math.max(1, bounds.maxY - bounds.minY)
  const safeContainerWidth = Math.max(1, containerWidth)
  const safeContainerHeight = Math.max(1, containerHeight)
  const fitScale = Math.min(safeContainerWidth / fleetWidth, safeContainerHeight / fleetHeight);
	return Math.max(absoluteMinScale, fitScale * fitFactor);
};

export const centerBoundsAtScale = (
	bounds: FleetBounds,
	targetScale: number,
	containerWidth: number,
	containerHeight: number
): FleetViewport => {
	const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
	return {
		scale: targetScale,
		panX: containerWidth / 2 - centerX * targetScale,
		panY: containerHeight / 2 - centerY * targetScale
	};
};
