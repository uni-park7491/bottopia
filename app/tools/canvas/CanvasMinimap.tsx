'use client';

import type { KeyboardEvent, MouseEvent } from 'react';
import { NODE_HEIGHT, NODE_WIDTH } from '../../../lib/canvas/graph';
import type { CanvasKind, CanvasProject } from '../../../lib/canvas/types';

export type CanvasMinimapProps = {
  project: CanvasProject;
  /** Current canvas stage dimensions in CSS pixels. */
  width: number;
  height: number;
  onNavigate: (world: { x: number; y: number }) => void;
};

const MAP_WIDTH = 200;
const MAP_HEIGHT = 120;
const PADDING = 8;
const nodeColors: Record<CanvasKind, string> = {
  text: '#686868', image: '#8c8c8c', video: '#a0a0a0', audio: '#777777', script: '#595959',
};
const arrowDirections: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};

export function CanvasMinimap({ project, width, height, onNavigate }: CanvasMinimapProps) {
  const zoom = Number.isFinite(project.viewport.zoom) && project.viewport.zoom > 0 ? project.viewport.zoom : 1;
  const visible = {
    x: -project.viewport.x / zoom,
    y: -project.viewport.y / zoom,
    width: Math.max(1, width) / zoom,
    height: Math.max(1, height) / zoom,
  };
  const nodes = project.nodes.filter(node => Number.isFinite(node.x) && Number.isFinite(node.y));
  const nodeBounds = nodes.length ? {
    left: Math.min(...nodes.map(node => node.x)),
    top: Math.min(...nodes.map(node => node.y)),
    right: Math.max(...nodes.map(node => node.x + NODE_WIDTH)),
    bottom: Math.max(...nodes.map(node => node.y + NODE_HEIGHT)),
  } : {
    left: visible.x, top: visible.y,
    right: visible.x + visible.width, bottom: visible.y + visible.height,
  };
  // Include the visible region so its outline remains meaningful even far from the nodes.
  const left = Math.min(nodeBounds.left, visible.x);
  const top = Math.min(nodeBounds.top, visible.y);
  const right = Math.max(nodeBounds.right, visible.x + visible.width);
  const bottom = Math.max(nodeBounds.bottom, visible.y + visible.height);
  const scale = Math.min((MAP_WIDTH - PADDING * 2) / Math.max(1, right - left), (MAP_HEIGHT - PADDING * 2) / Math.max(1, bottom - top));
  const offsetX = (MAP_WIDTH - (right - left) * scale) / 2;
  const offsetY = (MAP_HEIGHT - (bottom - top) * scale) / 2;
  const mapX = (x: number) => offsetX + (x - left) * scale;
  const mapY = (y: number) => offsetY + (y - top) * scale;

  function navigate(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (event.detail === 0) {
      onNavigate({ x: (nodeBounds.left + nodeBounds.right) / 2, y: (nodeBounds.top + nodeBounds.bottom) / 2 });
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = Math.max(0, Math.min(MAP_WIDTH, (event.clientX - box.left) / box.width * MAP_WIDTH));
    const y = Math.max(0, Math.min(MAP_HEIGHT, (event.clientY - box.top) / box.height * MAP_HEIGHT));
    onNavigate({ x: left + (x - offsetX) / scale, y: top + (y - offsetY) / scale });
  }

  function navigateWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const direction = arrowDirections[event.key];
    if (!direction) return; // Native button Enter/Space activation uses navigate's center action.
    event.preventDefault();
    const step = event.shiftKey ? 0.1 : 0.25;
    onNavigate({
      x: visible.x + visible.width / 2 + direction[0] * visible.width * step,
      y: visible.y + visible.height / 2 + direction[1] * visible.height * step,
    });
  }

  return <button
    type="button"
    aria-label="미니맵"
    title="클릭하여 이동 · 방향키로 화면 이동 · Shift로 미세 이동 · Enter/Space로 노드 중앙 이동"
    onClick={navigate}
    onKeyDown={navigateWithKeyboard}
    onPointerDown={event => event.stopPropagation()}
    onDoubleClick={event => event.stopPropagation()}
    onWheel={event => event.stopPropagation()}
    style={{
      display: 'block', width: MAP_WIDTH, height: MAP_HEIGHT, padding: 0, border: 0, boxShadow: 'inset 0 0 0 1px #454545',
      borderRadius: 12, overflow: 'hidden', background: '#202020', color: '#d6d6d6', cursor: 'crosshair',
      font: 'inherit', flexShrink: 0,
    }}
  >
    <svg aria-hidden="true" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} width="100%" height="100%" style={{ display: 'block' }}>
      {nodes.map(node => <rect
        key={node.id} x={mapX(node.x)} y={mapY(node.y)}
        width={Math.max(1, NODE_WIDTH * scale)} height={Math.max(1, NODE_HEIGHT * scale)}
        rx={Math.min(2, NODE_WIDTH * scale / 8)} fill={nodeColors[node.kind]}
      />)}
      <rect
        x={mapX(visible.x)} y={mapY(visible.y)} width={visible.width * scale} height={visible.height * scale}
        rx={2} fill="#ffffff" fillOpacity={0.06} stroke="#dedede" strokeWidth={1}
      />
      {!nodes.length && <text x={MAP_WIDTH / 2} y={MAP_HEIGHT / 2} textAnchor="middle" dominantBaseline="central" fill="#999" fontSize={11}>빈 캔버스</text>}
    </svg>
  </button>;
}

export default CanvasMinimap;
