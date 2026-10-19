import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CityNetworkCanvas, type CityCanvasHandle } from '../src/features/graph/components/CityNetworkCanvas';
import type { CityScene } from '../src/features/graph/lib/cityScene';
import { cityBoxesOverlap, cityRotation, cityWheelFactor, fitCity, placeCityLabels, rotateCity } from '../src/features/graph/lib/cityViewport';

describe('city viewport geometry', () => {
  const points = [{ x: -50, y: -500 }, { x: 50, y: 500 }, { x: 0, y: 0 }];
  it('fills a landscape viewport through a rigid rotation without changing distances', () => {
    const before = structuredClone(points), angle = cityRotation(points, 1200, 600);
    expect(fitCity(points, 1200, 600, angle).scale).toBeGreaterThan(fitCity(points, 1200, 600, 0).scale * 1.5);
    const [a, b] = points.map(p => rotateCity(p, angle));
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y));
    expect(rotateCity(a, -angle)).toEqual(expect.objectContaining({ x: expect.closeTo(points[0].x), y: expect.closeTo(points[0].y) }));
    const fit = fitCity(points, 1200, 600, angle);
    for (const p of points.map(p => rotateCity(p, angle))) { expect(Math.abs(fit.ox + p.x * fit.scale)).toBeLessThanOrEqual(550); expect(Math.abs(fit.oy + p.y * fit.scale)).toBeLessThanOrEqual(250); }
    expect(points).toEqual(before);
  });
  it('fits tiny or empty scenes safely without the old 2x scale cap', () => {
    expect(fitCity([{ x: 0, y: 0 }, { x: 1, y: 1 }], 1000, 600, 0).scale).toBeGreaterThan(2);
    expect(fitCity([], 1000, 600, 0)).toEqual({ ox: 0, oy: 0, scale: 1 });
    expect(fitCity(points, 0, 0, 0).scale).toBe(1);
  });
  it('places dense labels without overlapping labels, hub counts, controls or the viewport', () => {
    const reserved = [{ x: 180, y: 160, w: 40, h: 40 }, { x: 8, y: 8, w: 220, h: 60 }];
    const labels = Array.from({ length: 15 }, (_, i) => ({ id: String(i), text: `Topic ${i}`, x: 200 + i % 3 * 12, y: 180 + i % 4 * 12, r: 20, width: 110 }));
    const placed = placeCityLabels(labels, 500, 400, reserved, 12);
    expect(placed.length).toBeGreaterThan(0); expect(placed.length).toBeLessThan(labels.length);
    for (const [i, p] of placed.entries()) {
      expect(p.x).toBeGreaterThanOrEqual(8); expect(p.y).toBeGreaterThanOrEqual(8); expect(p.x + p.w).toBeLessThanOrEqual(492); expect(p.y + p.h).toBeLessThanOrEqual(392);
      expect([...reserved, ...placed.slice(0, i)].some(b => cityBoxesOverlap(p, b))).toBe(false);
    }
  });
  it('normalizes wheel directions, line/page deltas and large touchpad deltas', () => {
    expect(cityWheelFactor(-100, 0, 600)).toBeGreaterThan(1);
    expect(cityWheelFactor(100, 0, 600)).toBeLessThan(1);
    expect(cityWheelFactor(1, 1, 600)).toBe(cityWheelFactor(16, 0, 600));
    expect(cityWheelFactor(1, 2, 600)).toBe(cityWheelFactor(100000, 0, 600));
  });
});

describe('city map zoom interaction', () => {
  it('accepts ordinary wheel input, zoom buttons and keyboard without resetting the camera', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
    const scene: CityScene = { nodes: [{ id: 'a', kind: 'article', label: 'A', x: 0, y: 0, value: 0, color: '#fff', topic: null }, { id: 'b', kind: 'article', label: 'B', x: 50, y: 80, value: 0, color: '#fff', topic: null }], edges: [], unsupported: [], degree: new Map(), isolated: 2 };
    const onView = vi.fn(), ref = createRef<CityCanvasHandle>();
    const props = { ref, scene, scaleScene: scene, selected: null, selectedEdge: null, streets: 'auto' as const, uniform: false, onSelect: vi.fn(), onRoute: vi.fn(), onView };
    const result = render(<CityNetworkCanvas {...props} />), canvas = result.container.querySelector('canvas')!;
    const wheel = new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, bubbles: true, cancelable: true });
    fireEvent(canvas, wheel);
    expect(wheel.defaultPrevented).toBe(true); expect(onView.mock.lastCall?.[0].zoom).toBeGreaterThan(1);
    const zoomed = onView.mock.lastCall![0].zoom;
    result.rerender(<CityNetworkCanvas {...props} onView={onView} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(onView.mock.lastCall![0].zoom).toBeCloseTo(zoomed * 1.4);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(onView.mock.lastCall![0].zoom).toBeCloseTo(zoomed);
    fireEvent.keyDown(screen.getByRole('group', { name: 'City relationship map' }), { key: '0' });
    expect(onView.mock.lastCall![0].zoom).toBe(1);
    fireEvent.keyDown(screen.getByRole('group', { name: 'City relationship map' }), { key: '+' });
    expect(onView.mock.lastCall![0].zoom).toBeCloseTo(1.4);
  });
});
