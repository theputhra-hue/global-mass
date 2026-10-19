// Presentation geometry only: rotations preserve distances and source coordinates.
export interface CityPoint { x: number; y: number }
export interface CityBox extends CityPoint { w: number; h: number }
export function rotateCity(point: CityPoint, angle: number): CityPoint {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: point.x * c - point.y * s, y: point.x * s + point.y * c };
}
export function fitCity(points: CityPoint[], width: number, height: number, angle: number) {
  if (!points.length || width <= 0 || height <= 0) return { ox: 0, oy: 0, scale: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const point of points) { const p = rotateCity(point, angle); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const scale = Math.max(.0001, Math.min(Math.max(1, width - 100) / Math.max(1, maxX - minX), Math.max(1, height - 100) / Math.max(1, maxY - minY)));
  return { ox: -(minX + maxX) * scale / 2, oy: -(minY + maxY) * scale / 2, scale };
}
export function cityRotation(points: CityPoint[], width: number, height: number): number {
  let angle = 0, best = fitCity(points, width, height, 0).scale;
  // One rigid rotation for the complete release; never stretch axes or relocate nodes.
  for (let degrees = 5; degrees < 180; degrees += 5) {
    const candidate = degrees * Math.PI / 180, scale = fitCity(points, width, height, candidate).scale;
    if (scale > best * 1.005) { best = scale; angle = candidate; }
  }
  return angle;
}
export function cityBoxesOverlap(a: CityBox, b: CityBox, gap = 5): boolean {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}
export interface CityLabel extends CityPoint { id: string; r: number; text: string; width: number }
export function placeCityLabels(labels: CityLabel[], width: number, height: number, reserved: CityBox[], limit: number) {
  const placed: Array<CityBox & { id: string; text: string; anchor: CityPoint }> = [];
  for (const label of labels) {
    if (placed.length >= limit) break;
    const w = label.width, h = 22, gap = label.r + 9;
    const candidates = [
      { x: label.x - w / 2, y: label.y + gap },
      { x: label.x - w / 2, y: label.y - gap - h },
      { x: label.x + gap, y: label.y - h / 2 },
      { x: label.x - gap - w, y: label.y - h / 2 },
    ];
    const position = candidates.find(p => p.x >= 8 && p.y >= 8 && p.x + w <= width - 8 && p.y + h <= height - 8 &&
      ![...reserved, ...placed].some(b => cityBoxesOverlap({ ...p, w, h }, b)));
    if (position) placed.push({ ...position, w, h, id: label.id, text: label.text, anchor: { x: label.x, y: label.y } });
  }
  return placed;
}
export function cityWheelFactor(deltaY: number, deltaMode: number, height: number): number {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? height : 1);
  return Math.exp(-Math.max(-240, Math.min(240, pixels)) * .0025);
}
