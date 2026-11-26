import type { CanvasEdge, CanvasKind, CanvasNode, CanvasProject, CanvasViewport } from './types.ts';

export const NODE_WIDTH = 320;
export const NODE_HEIGHT = 204;
export const MAX_NODES = 100;
export const MAX_EDGES = 300;
export const MAX_PROMPT_LENGTH = 32_000;
export const MAX_PROJECT_BYTES = 4 * 1024 * 1024;
const kinds: CanvasKind[] = ['text', 'image', 'video', 'audio', 'script'];
const models = ['seedream-5-pro', 'seedream-5-5', 'nano-banana-2-1', 'seedance-2-5'];
const titles: Record<CanvasKind, string> = { text: '텍스트', image: '이미지', video: '영상', audio: '오디오', script: '스크립트' };
type Point = { x: number; y: number };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('캔버스 데이터 형식이 올바르지 않습니다.');
  return value as Record<string, unknown>;
}
function string(value: unknown, max: number, name: string): string {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${name} 길이 또는 형식이 올바르지 않습니다.`);
  return value;
}
function id(value: unknown): string {
  const result = string(value, 128, 'ID');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(result)) throw new Error('캔버스 ID가 올바르지 않습니다.');
  return result;
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('캔버스 숫자 범위를 확인해주세요.');
  return value;
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('캔버스 항목 개수를 확인해주세요.');
  return value;
}
function unique(values: string[]): void {
  if (new Set(values).size !== values.length) throw new Error('중복된 캔버스 ID가 있습니다.');
}
function touch(project: CanvasProject): CanvasProject {
  return { ...project, updatedAt: new Date().toISOString() };
}
function pruneGroups(project: CanvasProject): CanvasProject {
  const used = new Set(project.nodes.map(node => node.groupId).filter(Boolean));
  return { ...project, groups: project.groups.filter(group => used.has(group.id)) };
}

export function createProject(title = '새 캔버스'): CanvasProject {
  return {
    format: 'bottopia-canvas-v1', id: crypto.randomUUID(), title: string(title, 160, '제목'),
    nodes: [], edges: [], groups: [], viewport: { x: 40, y: 40, zoom: 1 }, updatedAt: new Date().toISOString(),
  };
}

export function createNode(kind: CanvasKind, x: number, y: number): CanvasNode {
  if (!kinds.includes(kind)) throw new Error('지원하지 않는 노드입니다.');
  return {
    id: crypto.randomUUID(), kind, x: number(x, -1_000_000, 1_000_000), y: number(y, -1_000_000, 1_000_000),
    title: titles[kind], text: '', modelId: kind === 'video' ? 'seedance-2-5' : 'seedream-5-5',
    aspectRatio: '16:9', resolution: kind === 'video' ? '720p' : '2K', durationSeconds: 5,
    generateAudio: false, assetIds: [],
  };
}

export function canConnect(source: CanvasKind, target: CanvasKind): boolean {
  if (target !== 'image' && target !== 'video') return false;
  return source === 'text' || source === 'script' || source === 'image' || (target === 'video' && (source === 'video' || source === 'audio'));
}

function reaches(edges: CanvasEdge[], from: string, target: string): boolean {
  const visited = new Set<string>();
  const pending = [from];
  while (pending.length) {
    const current = pending.pop()!;
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) if (edge.source === current) pending.push(edge.target);
  }
  return false;
}

export function connectNodes(project: CanvasProject, sourceId: string, targetId: string): CanvasProject {
  const source = project.nodes.find(node => node.id === sourceId);
  const target = project.nodes.find(node => node.id === targetId);
  if (!source || !target) throw new Error('연결할 노드를 찾을 수 없습니다.');
  if (sourceId === targetId) throw new Error('같은 노드에는 연결할 수 없습니다.');
  if (!canConnect(source.kind, target.kind)) throw new Error('이 노드 종류는 연결할 수 없습니다.');
  if (project.edges.some(edge => edge.source === sourceId && edge.target === targetId)) throw new Error('이미 연결된 노드입니다.');
  if (reaches(project.edges, targetId, sourceId)) throw new Error('순환 연결은 만들 수 없습니다.');
  if (project.edges.length >= MAX_EDGES) throw new Error(`연결은 최대 ${MAX_EDGES}개까지 만들 수 있습니다.`);
  return touch({ ...project, edges: [...project.edges, { id: crypto.randomUUID(), source: sourceId, target: targetId }] });
}

export function removeNodes(project: CanvasProject, selectedIds: readonly string[]): CanvasProject {
  const selected = new Set(selectedIds);
  return touch(pruneGroups({
    ...project, nodes: project.nodes.filter(node => !selected.has(node.id)),
    edges: project.edges.filter(edge => !selected.has(edge.source) && !selected.has(edge.target)),
  }));
}

export function duplicateNodes(project: CanvasProject, selectedIds: readonly string[]): CanvasProject {
  const selected = new Set(selectedIds);
  const originals = project.nodes.filter(node => selected.has(node.id));
  if (!originals.length) return project;
  if (project.nodes.length + originals.length > MAX_NODES) throw new Error(`노드는 최대 ${MAX_NODES}개까지 만들 수 있습니다.`);
  const nodeMap = new Map(originals.map(node => [node.id, crypto.randomUUID()]));
  const groupMap = new Map<string, string>();
  for (const group of project.groups) {
    const members = project.nodes.filter(node => node.groupId === group.id);
    if (members.length && members.every(node => selected.has(node.id))) groupMap.set(group.id, crypto.randomUUID());
  }
  const copies = originals.map(node => {
    // A copy retains media references, never the running task or the original group membership.
    const copy: CanvasNode = { ...node, id: nodeMap.get(node.id)!, x: node.x + 40, y: node.y + 40, assetIds: [...node.assetIds] };
    delete copy.job;
    delete copy.groupId;
    if (node.groupId && groupMap.has(node.groupId)) copy.groupId = groupMap.get(node.groupId);
    return copy;
  });
  const copiedEdges = project.edges.filter(edge => selected.has(edge.source) && selected.has(edge.target))
    .map(edge => ({ id: crypto.randomUUID(), source: nodeMap.get(edge.source)!, target: nodeMap.get(edge.target)! }));
  if (project.edges.length + copiedEdges.length > MAX_EDGES) throw new Error(`연결은 최대 ${MAX_EDGES}개까지 만들 수 있습니다.`);
  return touch({
    ...project, nodes: [...project.nodes, ...copies], edges: [...project.edges, ...copiedEdges],
    groups: [...project.groups, ...project.groups.filter(group => groupMap.has(group.id)).map(group => ({ ...group, id: groupMap.get(group.id)! }))],
  });
}

export function groupNodes(project: CanvasProject, selectedIds: readonly string[], title = '그룹'): CanvasProject {
  const selected = new Set(selectedIds);
  if (project.nodes.filter(node => selected.has(node.id)).length < 2) throw new Error('그룹으로 묶을 노드를 두 개 이상 선택해주세요.');
  const group = { id: crypto.randomUUID(), title: string(title, 160, '그룹 제목') };
  return touch(pruneGroups({ ...project, groups: [...project.groups, group], nodes: project.nodes.map(node => selected.has(node.id) ? { ...node, groupId: group.id } : node) }));
}

export function ungroupNodes(project: CanvasProject, selectedIds: readonly string[]): CanvasProject {
  const selected = new Set(selectedIds);
  const groups = new Set(project.nodes.filter(node => selected.has(node.id)).map(node => node.groupId).filter(Boolean));
  return touch(pruneGroups({ ...project, nodes: project.nodes.map(node => {
    if (!node.groupId || !groups.has(node.groupId)) return node;
    const copy = { ...node };
    delete copy.groupId;
    return copy;
  }) }));
}

export function collectInputs(project: CanvasProject, nodeId: string): { prompt: string; assetIds: string[] } {
  const nodes = new Map(project.nodes.map(node => [node.id, node]));
  const target = nodes.get(nodeId);
  if (!target) throw new Error('노드를 찾을 수 없습니다.');
  const visited = new Set<string>();
  const prompts: string[] = [];
  const assetIds: string[] = [];
  function visit(currentId: string): void {
    if (visited.has(currentId)) return;
    visited.add(currentId);
    const current = nodes.get(currentId);
    if (!current) return;
    for (const edge of project.edges) if (edge.target === currentId) visit(edge.source);
    if ((current.kind === 'text' || current.kind === 'script') && current.text.trim()) prompts.push(current.text.trim());
  }
  for (const edge of project.edges) {
    if (edge.target !== nodeId) continue;
    visit(edge.source);
    const source = nodes.get(edge.source);
    if (source && source.kind !== 'text' && source.kind !== 'script') {
      const active = source.selectedAssetId ?? source.assetIds.at(-1);
      if (active && source.assetIds.includes(active) && !assetIds.includes(active)) assetIds.push(active);
    }
  }
  if (target.text.trim()) prompts.push(target.text.trim());
  const prompt = prompts.join('\n\n');
  if (prompt.length > MAX_PROMPT_LENGTH) throw new Error(`연결된 프롬프트는 ${MAX_PROMPT_LENGTH}자 이내로 줄여주세요.`);
  return { prompt, assetIds };
}

/** Normalize untrusted imports by explicitly selecting portable graph fields only. */
export function parseProject(text: string): CanvasProject {
  if (typeof text !== 'string' || text.length > MAX_PROJECT_BYTES || new TextEncoder().encode(text).byteLength > MAX_PROJECT_BYTES) throw new Error('캔버스 파일은 4MB 이하여야 합니다.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('캔버스 JSON 파일을 읽을 수 없습니다.'); }
  const data = record(value);
  if (data.format !== 'bottopia-canvas-v1') throw new Error('지원하지 않는 캔버스 파일입니다.');
  const nodes = array(data.nodes, MAX_NODES).map(value => {
    const raw = record(value);
    if (!kinds.includes(raw.kind as CanvasKind) || !models.includes(raw.modelId as string)) throw new Error('노드 종류 또는 모델을 확인해주세요.');
    if (typeof raw.generateAudio !== 'boolean') throw new Error('오디오 설정을 확인해주세요.');
    const assetIds = array(raw.assetIds, 100).map(id);
    unique(assetIds);
    const node: CanvasNode = {
      id: id(raw.id), kind: raw.kind as CanvasKind, x: number(raw.x, -1_000_000, 1_000_000), y: number(raw.y, -1_000_000, 1_000_000),
      title: string(raw.title, 160, '노드 제목'), text: string(raw.text, MAX_PROMPT_LENGTH, '프롬프트'),
      modelId: raw.modelId as CanvasNode['modelId'], aspectRatio: string(raw.aspectRatio, 20, '화면 비율'),
      resolution: string(raw.resolution, 20, '해상도'), durationSeconds: number(raw.durationSeconds, 1, 120),
      generateAudio: raw.generateAudio, assetIds,
    };
    if (raw.selectedAssetId !== undefined) {
      node.selectedAssetId = id(raw.selectedAssetId);
      if (!assetIds.includes(node.selectedAssetId)) throw new Error('선택된 결과를 찾을 수 없습니다.');
    }
    if (raw.groupId !== undefined) node.groupId = id(raw.groupId);
    if (raw.count !== undefined) {
      node.count = number(raw.count, 1, 4);
      if (!Number.isInteger(node.count)) throw new Error('생성 개수는 1~4개의 정수여야 합니다.');
    }
    return node;
  });
  unique(nodes.map(node => node.id));
  const groups = array(data.groups, MAX_NODES).map(value => {
    const raw = record(value);
    return { id: id(raw.id), title: string(raw.title, 160, '그룹 제목') };
  });
  unique(groups.map(group => group.id));
  if (nodes.some(node => node.groupId && !groups.some(group => group.id === node.groupId))) throw new Error('노드의 그룹을 찾을 수 없습니다.');
  const viewport = record(data.viewport);
  const updatedAt = string(data.updatedAt, 40, '저장 시간');
  if (!Number.isFinite(Date.parse(updatedAt))) throw new Error('저장 시간이 올바르지 않습니다.');
  let project: CanvasProject = {
    format: 'bottopia-canvas-v1', id: id(data.id), title: string(data.title, 160, '제목'), nodes, groups, edges: [],
    viewport: { x: number(viewport.x, -10_000_000, 10_000_000), y: number(viewport.y, -10_000_000, 10_000_000), zoom: number(viewport.zoom, 0.1, 3) },
    updatedAt,
  };
  const edges = array(data.edges, MAX_EDGES).map(value => {
    const raw = record(value);
    return { id: id(raw.id), source: id(raw.source), target: id(raw.target) };
  });
  unique(edges.map(edge => edge.id));
  for (const edge of edges) {
    project = connectNodes(project, edge.source, edge.target);
    project.edges[project.edges.length - 1] = edge;
  }
  return { ...project, updatedAt };
}

export function exportProject(project: CanvasProject): string {
  return JSON.stringify(parseProject(JSON.stringify(project)), null, 2);
}

/** Point must already be relative to the canvas container, not the page. */
export function screenToWorld(point: Point, viewport: CanvasViewport): Point {
  number(viewport.zoom, 0.1, 3);
  return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom };
}

export function fitViewport(project: CanvasProject, width: number, height: number, padding = 64): CanvasViewport {
  number(width, 1, 100_000); number(height, 1, 100_000); number(padding, 0, 10_000);
  if (!project.nodes.length) return { x: Math.min(padding, width / 2), y: Math.min(padding, height / 2), zoom: 1 };
  const left = Math.min(...project.nodes.map(node => node.x));
  const top = Math.min(...project.nodes.map(node => node.y));
  const right = Math.max(...project.nodes.map(node => node.x + NODE_WIDTH));
  const bottom = Math.max(...project.nodes.map(node => node.y + NODE_HEIGHT));
  const zoom = Math.max(0.1, Math.min(2, Math.max(1, width - 2 * padding) / (right - left), Math.max(1, height - 2 * padding) / (bottom - top)));
  return { x: width / 2 - (left + right) * zoom / 2, y: height / 2 - (top + bottom) * zoom / 2, zoom };
}
