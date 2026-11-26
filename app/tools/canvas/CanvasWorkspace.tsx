'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { CanvasAsset, CanvasJob, CanvasKind, CanvasNode, CanvasProject, ModelAvailability } from '../../../lib/canvas/types';
import { canConnect, collectInputs, connectNodes, createNode, createProject, duplicateNodes, fitViewport, groupNodes, MAX_NODES, NODE_HEIGHT, NODE_WIDTH, removeNodes, screenToWorld, ungroupNodes } from '../../../lib/canvas/graph';
import { estimateGenerationCost, MODELS } from '../../../lib/canvas/models';
import { deleteProject, listProjects, loadAssets, loadProject, saveProject } from './canvas-store';
import { makeArchive, readArchive } from './canvas-archive';
import { CanvasClientError, deleteReferences, inspectAsset, pollGeneration, submitGeneration, uploadReferences } from './canvas-generation';
import { downloadFile } from '../download';
import CanvasMinimap from './CanvasMinimap';
import CanvasIcon from './CanvasIcon';
import './canvas.css';

const TOOLS: Array<{ kind: CanvasKind; label: string; icon: string }> = [
  { kind: 'text', label: '텍스트', icon: 'T' }, { kind: 'image', label: '이미지', icon: '▧' },
  { kind: 'video', label: '영상', icon: '▶' }, { kind: 'audio', label: '오디오', icon: '♫' }, { kind: 'script', label: '스크립트', icon: '≡' },
];
const JOB_LABELS = { queued: '접수됨', running: '생성 중', succeeded: '완료', failed: '실패', unknown: '확인 필요' };
const NODE_PORT_Y = NODE_HEIGHT / 2;
type NodeMenu = { x: number; y: number; world: { x: number; y: number }; sourceId?: string; fit?: boolean };
type Panel = 'history' | 'tools' | 'shortcuts' | 'guide' | 'view' | null;
type SaveState = 'loading' | 'dirty' | 'saving' | 'saved' | 'error';
type ProjectSummary = { id: string; title: string; updatedAt: string };
type Drag = {
  kind: 'pan' | 'nodes' | 'connection'; pointerId: number; startX: number; startY: number;
  viewport: CanvasProject['viewport']; nodes?: Array<{ id: string; x: number; y: number }>; sourceId?: string;
};
const activeJob = (node: CanvasNode) => !!node.job && !['succeeded', 'failed'].includes(node.job.state);
const errorMessage = (error: unknown) => error instanceof Error ? error.message : '작업을 마치지 못했습니다. 다시 확인해주세요.';

function MediaPreview({ asset, kind = 'image' }: { asset?: CanvasAsset; kind?: CanvasAsset['kind'] }) {
  const [failedId, setFailedId] = useState('');
  const element = useRef<HTMLImageElement | HTMLVideoElement | HTMLAudioElement | null>(null);
  const blob = asset?.blob, remoteUrl = asset?.remoteUrl;
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    const blobUrl = blob ? URL.createObjectURL(blob) : undefined;
    target.src = blobUrl ?? remoteUrl ?? '';
    return () => {
      if (target instanceof HTMLMediaElement) target.pause();
      target.removeAttribute('src');
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blob, remoteUrl]);
  if (!asset) return <div className="bc-media-empty"><CanvasIcon name={kind} width="26" height="26" /><p className="bc-sr-only">미디어를 올리거나 노드를 연결해 생성하세요.</p></div>;
  if (failedId === asset.id) return <div className="bc-preview-failed"><p>미리보기를 불러오지 못했습니다.</p>{asset.remoteUrl && <a href={asset.remoteUrl} target="_blank" rel="noopener noreferrer">원본 파일 열기 ↗</a>}</div>;
  if (asset.kind === 'image') return <img className="bc-media" crossOrigin="anonymous" onError={() => setFailedId(asset.id)} ref={value => { element.current = value; }} alt={asset.name} loading="lazy" draggable={false} />; // eslint-disable-line @next/next/no-img-element
  if (asset.kind === 'video') return <video className="bc-media" crossOrigin="anonymous" onError={() => setFailedId(asset.id)} ref={value => { element.current = value; }} controls playsInline preload="metadata" aria-label={asset.name} />;
  return <div className="bc-audio-preview"><span aria-hidden="true">♫</span><audio crossOrigin="anonymous" onError={() => setFailedId(asset.id)} ref={value => { element.current = value; }} controls preload="metadata" aria-label={asset.name} /></div>;
}

export default function CanvasWorkspace({ memberId, onOpenTools }: { memberId: string; onOpenTools?: () => void }) {
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [assets, setAssets] = useState<CanvasAsset[]>([]);
  const [owner, setOwner] = useState('');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [models, setModels] = useState<ModelAvailability[]>(MODELS.map(model => ({ ...model, connected: false, canGenerate: false })));
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectionPoint, setConnectionPoint] = useState<{ x: number; y: number } | null>(null);
  const [hand, setHand] = useState(false);
  const [spaceHand, setSpaceHand] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('loading');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [nodeMenu, setNodeMenu] = useState<NodeMenu | null>(null);
  const [showMinimap, setShowMinimap] = useState(false);
  const [showEdges, setShowEdges] = useState(true);
  const [snap, setSnap] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 1024, height: 720 });
  const [composerHeight, setComposerHeight] = useState(220);
  const stage = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLDivElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string | null>(null);
  const uploadReferenceTarget = useRef<string | null>(null);
  const projectRef = useRef<CanvasProject | null>(null);
  const assetsRef = useRef<CanvasAsset[]>([]);
  const ownerRef = useRef('');
  const busyRef = useRef<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const undoStack = useRef<CanvasProject[]>([]);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const persistedAssets = useRef(new Map<string, Map<string, CanvasAsset>>());
  const firstSelectedId = selected[0];
  const composerVisible = !!firstSelectedId && !connectionPoint;

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [project?.id, owner]);

  useEffect(() => {
    const element = composer.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setComposerHeight(entry.borderBoxSize?.[0]?.blockSize ?? element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [firstSelectedId, composerVisible, owner]);

  const commit = useCallback((edit: (current: CanvasProject) => CanvasProject, remember = true) => {
    const current = projectRef.current;
    if (!current || ownerRef.current !== memberId || busyRef.current === 'project' || busyRef.current === 'import') return;
    const next = { ...edit(current), updatedAt: new Date().toISOString() };
    if (remember) { undoStack.current.push(current); if (undoStack.current.length > 30) undoStack.current.shift(); }
    projectRef.current = next; setProject(next); setSaveState('dirty');
  }, [memberId]);

  const putAssets = useCallback((next: CanvasAsset[]) => {
    assetsRef.current = next; setAssets(next); setSaveState('dirty');
  }, []);

  const persist = useCallback(async (snapshot: CanvasProject, media: CanvasAsset[]) => {
    setSaveState('saving');
    const task = saveQueue.current.catch(() => {}).then(async () => {
      const cacheKey = `${memberId}/${snapshot.id}`;
      const previous = persistedAssets.current.get(cacheKey);
      const changed = media.filter(asset => previous?.get(asset.id) !== asset);
      await saveProject(memberId, snapshot, changed);
      persistedAssets.current.set(cacheKey, new Map(media.map(asset => [asset.id, asset])));
    });
    saveQueue.current = task;
    try {
      await task;
      if (ownerRef.current === memberId && projectRef.current === snapshot && assetsRef.current === media) setSaveState('saved');
      if (ownerRef.current === memberId) setProjects(rows => [{ id: snapshot.id, title: snapshot.title, updatedAt: snapshot.updatedAt }, ...rows.filter(row => row.id !== snapshot.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } catch (error) { setSaveState('error'); setMessage(`기기 저장 실패: ${errorMessage(error)} 작업 파일로 내려받아 보관해주세요.`); throw error; }
  }, [memberId]);

  const adopt = useCallback((next: CanvasProject, media: CanvasAsset[], saved: boolean) => {
    projectRef.current = next; assetsRef.current = media; ownerRef.current = memberId;
    if (saved) persistedAssets.current.set(`${memberId}/${next.id}`, new Map(media.map(asset => [asset.id, asset])));
    setProject(next); setAssets(media); setOwner(memberId); setSelected([]); setSelectedEdge(null); setConnecting(null); setNodeMenu(null); setPanel(null);
    undoStack.current = []; setSaveState(saved ? 'saved' : 'dirty');
  }, [memberId]);

  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();
    void listProjects(memberId).then(async rows => {
      if (cancelled) return;
      setProjects(rows);
      const first = rows[0];
      const [saved, media] = first ? await Promise.all([loadProject(memberId, first.id), loadAssets(memberId, first.id)]) : [null, [] as CanvasAsset[]];
      if (!cancelled) adopt(saved ?? createProject(), media, !!saved);
    }).catch(error => {
      if (!cancelled) { adopt(createProject(), [], false); setSaveState('error'); setMessage(`저장된 작업을 읽지 못했습니다. ${errorMessage(error)}`); }
    });
    void fetch('/api/canvas/models', { credentials: 'same-origin', cache: 'no-store', signal: abort.signal })
      .then(async response => { if (!response.ok) throw new Error('모델 연결 상태를 읽지 못했습니다.'); return response.json(); })
      .then(data => { if (!cancelled && Array.isArray(data.models)) setModels(data.models); })
      .catch(error => { if (!cancelled && error.name !== 'AbortError') setMessage(errorMessage(error)); });
    return () => { cancelled = true; abort.abort(); };
  }, [memberId, adopt]);

  useEffect(() => {
    if (!project || owner !== memberId || saveState === 'saved' || saveState === 'loading' || saveState === 'error') return;
    const timer = window.setTimeout(() => { void persist(project, assets).catch(() => {}); }, 650);
    return () => window.clearTimeout(timer);
  }, [project, assets, memberId, owner, persist, saveState]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (saveState === 'dirty' || saveState === 'saving' || saveState === 'error' || busyRef.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  useEffect(() => {
    if (owner !== memberId) return;
    let cancelled = false;
    let timer: number;
    async function tick() {
      const current = projectRef.current;
      if (!current || ownerRef.current !== memberId) return;
      if (busyRef.current === 'project' || busyRef.current === 'import') { timer = window.setTimeout(tick, 1500); return; }
      const jobs = current.nodes.filter(node => activeJob(node) && node.job?.receipt);
      for (const node of jobs) {
        if (cancelled) break;
        const receipt = node.job!.receipt;
        try {
          const result = await pollGeneration(receipt);
          if (cancelled || projectRef.current?.id !== current.id || busyRef.current === 'project' || busyRef.current === 'import') continue;
          const latest = projectRef.current.nodes.find(item => item.id === node.id);
          if (!latest?.job || latest.job.receipt !== receipt) continue;
          const newAssets: CanvasAsset[] = result.outputs.flatMap((output, index) => {
            if (assetsRef.current.some(asset => asset.jobReceipt === receipt && asset.outputIndex === index)) return [];
            const ext = output.kind === 'image' ? 'png' : output.kind === 'video' ? 'mp4' : 'mp3';
            return [{ id: crypto.randomUUID(), kind: output.kind, name: `${latest.title || '생성 결과'}-${index + 1}.${ext}`, mime: output.mime ?? `${output.kind}/${ext === 'mp3' ? 'mpeg' : ext}`, bytes: 0, remoteUrl: output.url, jobReceipt: receipt, outputIndex: index, ...(output.kind === 'video' ? { durationSeconds: latest.durationSeconds } : {}) }];
          });
          if (newAssets.length) putAssets([...assetsRef.current, ...newAssets]);
          commit(value => ({ ...value, nodes: value.nodes.map(item => item.id === node.id ? {
            ...item, assetIds: [...item.assetIds, ...newAssets.map(asset => asset.id)], selectedAssetId: newAssets.at(-1)?.id ?? item.selectedAssetId,
            job: { ...item.job!, state: result.state, message: result.message, pollAfterSeconds: result.pollAfterSeconds },
          } : item) }), false);
          if (result.state === 'succeeded' || result.state === 'failed') {
            undoStack.current = [];
            await persist(projectRef.current!, assetsRef.current);
            if (latest.job.assetKeys?.length) {
              try {
                await deleteReferences(latest.job.assetKeys);
                if (!cancelled && projectRef.current?.id === current.id) commit(value => ({ ...value, nodes: value.nodes.map(item => item.id === node.id && item.job?.receipt === receipt ? { ...item, job: { ...item.job, assetKeys: [] } } : item) }), false);
              } catch { /* Keep keys in the local receipt for a later explicit cleanup. */ }
            }
          }
        } catch (error) {
          if (!cancelled && projectRef.current?.id === current.id) commit(value => ({ ...value, nodes: value.nodes.map(item => item.id === node.id && item.job?.receipt === receipt ? { ...item, job: { ...item.job, state: 'unknown', message: `결과 확인 지연: ${errorMessage(error)}` } } : item) }), false);
        }
      }
      if (!cancelled) timer = window.setTimeout(tick, Math.max(8, ...jobs.map(node => node.job?.pollAfterSeconds ?? 8)) * 1000);
    }
    timer = window.setTimeout(tick, 1500);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [owner, memberId, commit, persist, putAssets]);

  const assetMap = useMemo(() => new Map(assets.map(asset => [asset.id, asset])), [assets]);
  const selectedNode = project?.nodes.find(node => node.id === selected[0]);
  const selectedModel = models.find(model => model.id === selectedNode?.modelId);
  const inputs = useMemo(() => {
    if (!project || !selectedNode) return { prompt: '', assetIds: [] as string[], error: '' };
    try { return { ...collectInputs(project, selectedNode.id), error: '' }; }
    catch (error) { return { prompt: '', assetIds: [] as string[], error: errorMessage(error) }; }
  }, [project, selectedNode]);
  const references = inputs.assetIds.map(id => assetMap.get(id)).filter((asset): asset is CanvasAsset => !!asset);
  let estimate: ReturnType<typeof estimateGenerationCost> | undefined;
  let estimateError = inputs.error;
  if (selectedNode && (selectedNode.kind === 'image' || selectedNode.kind === 'video')) {
    try { estimate = estimateGenerationCost({ modelId: selectedNode.modelId, providerId: selectedModel?.providerId, resolution: selectedNode.resolution, durationSeconds: selectedNode.durationSeconds, references }); }
    catch (error) { estimateError = errorMessage(error); }
  }

  function updateNode(nodeId: string, values: Partial<CanvasNode>) {
    commit(value => ({ ...value, nodes: value.nodes.map(node => node.id === nodeId ? { ...node, ...values } : node) }));
  }
  function worldPoint(clientX: number, clientY: number) {
    const rect = stage.current!.getBoundingClientRect();
    return screenToWorld({ x: clientX - rect.left, y: clientY - rect.top }, projectRef.current!.viewport);
  }
  function openNodeMenu(point?: { x: number; y: number }, sourceId?: string) {
    const current = projectRef.current;
    if (!current || !stage.current) return;
    const screen = point ?? { x: stage.current.clientWidth / 2 - 115, y: stage.current.clientHeight - 340 };
    const anchor = current.nodes.find(node => node.id === selected[0]) ?? current.nodes.at(-1);
    const world = point ? screenToWorld(point, current.viewport) : anchor ? { x: anchor.x + NODE_WIDTH + 80, y: anchor.y } : screenToWorld({ x: stage.current.clientWidth / 2, y: stage.current.clientHeight / 2 }, current.viewport);
    if (sourceId) world.y -= NODE_PORT_Y;
    if (!point && !anchor) { world.x -= NODE_WIDTH / 2; world.y -= NODE_HEIGHT / 2; }
    if (!point) while (current.nodes.some(node => Math.abs(node.x - world.x) < NODE_WIDTH + 20 && Math.abs(node.y - world.y) < NODE_HEIGHT + 20)) world.y += NODE_HEIGHT + 40;
    setNodeMenu({ ...screen, world, sourceId, fit: !point }); setPanel(null);
  }
  function createFromMenu(kind: CanvasKind) {
    const current = projectRef.current;
    if (!current || !nodeMenu) return;
    if (current.nodes.length >= MAX_NODES) { setMessage(`노드는 최대 ${MAX_NODES}개까지 추가할 수 있습니다.`); return; }
    try {
      const node = createNode(kind, nodeMenu.world.x, nodeMenu.world.y);
      commit(value => {
        let next = { ...value, nodes: [...value.nodes, node] };
        if (nodeMenu.sourceId) next = connectNodes(next, nodeMenu.sourceId, node.id);
        if (nodeMenu.fit && stage.current) next.viewport = fitViewport(next, stage.current.clientWidth, Math.max(100, stage.current.clientHeight - 180));
        return next;
      });
      setSelected([node.id]); setNodeMenu(null); setConnecting(null); setConnectionPoint(null); setMessage('');
    } catch (error) { setMessage(errorMessage(error)); }
  }
  function fitAll() {
    if (stage.current) commit(value => ({ ...value, viewport: fitViewport(value, stage.current!.clientWidth, Math.max(100, stage.current!.clientHeight - 90)) }), false);
  }
  function arrangeNodes() {
    commit(value => {
      const depth = new Map<string, number>();
      const level = (id: string): number => {
        if (depth.has(id)) return depth.get(id)!;
        const parents = value.edges.filter(edge => edge.target === id);
        const result = parents.length ? Math.max(...parents.map(edge => level(edge.source))) + 1 : 0;
        depth.set(id, result); return result;
      };
      const rows = new Map<number, number>();
      const next = { ...value, nodes: value.nodes.map(node => {
        const column = level(node.id), row = rows.get(column) ?? 0; rows.set(column, row + 1);
        return { ...node, x: column * (NODE_WIDTH + 120), y: row * (NODE_HEIGHT + 72) };
      }) };
      if (stage.current) next.viewport = fitViewport(next, stage.current.clientWidth, Math.max(100, stage.current.clientHeight - 90));
      return next;
    });
  }
  function starter() {
    const current = projectRef.current;
    if (!current || current.nodes.length) return;
    const text = createNode('text', 0, 80), image = createNode('image', NODE_WIDTH + 120, 80), video = createNode('video', 2 * (NODE_WIDTH + 120), 80);
    text.title = '장면의 시작';
    let next = { ...current, nodes: [text, image, video] };
    next = connectNodes(connectNodes(next, text.id, image.id), image.id, video.id);
    if (stage.current) next.viewport = fitViewport(next, stage.current.clientWidth, stage.current.clientHeight);
    commit(() => next); setSelected([text.id]);
  }
  function connect(source: string, target: string) {
    try { commit(value => connectNodes(value, source, target)); setConnecting(null); setConnectionPoint(null); setNodeMenu(null); setMessage(''); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  function removeSelection() {
    if (!projectRef.current) return;
    if (selected.some(id => { const node = projectRef.current!.nodes.find(item => item.id === id); return node && (activeJob(node) || busyRef.current === id); })) { setMessage('진행 중인 노드는 결과 확인 후 삭제할 수 있습니다.'); return; }
    if (selectedEdge) { commit(value => ({ ...value, edges: value.edges.filter(edge => edge.id !== selectedEdge) })); setSelectedEdge(null); }
    else { commit(value => removeNodes(value, selected)); setSelected([]); }
    stage.current?.focus({ preventScroll: true });
  }
  function duplicateSelection() {
    try {
      const before = projectRef.current?.nodes.length ?? 0;
      commit(value => duplicateNodes(value, selected)); setSelected(projectRef.current?.nodes.slice(before).map(node => node.id) ?? []);
    } catch (error) { setMessage(errorMessage(error)); }
  }
  function undo() {
    if (busyRef.current || projectRef.current?.nodes.some(activeJob)) { setMessage('생성 중에는 실행 취소를 잠시 사용할 수 없습니다.'); return; }
    const previous = undoStack.current.pop();
    if (previous) { commit(() => previous, false); setSelected([]); }
  }
  function zoomAt(factor: number, point?: { x: number; y: number }) {
    const current = projectRef.current;
    if (!current || !stage.current) return;
    const screen = point ?? { x: stage.current.clientWidth / 2, y: stage.current.clientHeight / 2 };
    const world = screenToWorld(screen, current.viewport);
    const zoom = Math.max(0.1, Math.min(3, current.viewport.zoom * factor));
    commit(value => ({ ...value, viewport: { zoom, x: screen.x - world.x * zoom, y: screen.y - world.y * zoom } }), false);
  }
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const wheel = (event: globalThis.WheelEvent) => {
      if ((event.target as Element).closest('textarea,input,select,video,audio,.bc-floating-ui')) {
        if (event.ctrlKey || event.metaKey) event.preventDefault();
        return;
      }
      const current = projectRef.current;
      if (!current) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const rect = element.getBoundingClientRect();
        const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const world = screenToWorld(screen, current.viewport);
        const zoom = Math.max(0.1, Math.min(3, current.viewport.zoom * Math.exp(-event.deltaY * 0.008)));
        commit(value => ({ ...value, viewport: { zoom, x: screen.x - world.x * zoom, y: screen.y - world.y * zoom } }), false);
      } else commit(value => ({ ...value, viewport: { ...value.viewport, x: value.viewport.x - event.deltaX, y: value.viewport.y - event.deltaY } }), false);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [project?.id, owner, commit]);
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('.bc-node,.bc-group,.bc-floating-ui,button')) return;
    if (event.button !== 0 && event.button !== 1) return;
    if (hand || spaceHand || event.button === 1) {
      drag.current = { kind: 'pan', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, viewport: projectRef.current!.viewport };
      event.currentTarget.setPointerCapture(event.pointerId);
    } else { setSelected([]); setSelectedEdge(null); setConnecting(null); setNodeMenu(null); setPanel(null); }
    stage.current?.focus();
  }
  function nodePointerDown(event: PointerEvent<HTMLElement>, node: CanvasNode) {
    if (event.button !== 0) return;
    event.stopPropagation(); event.preventDefault();
    if (hand || spaceHand) {
      drag.current = { kind: 'pan', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, viewport: projectRef.current!.viewport };
      stage.current?.setPointerCapture(event.pointerId);
      return;
    }
    const next = event.shiftKey ? selected.includes(node.id) ? selected.filter(id => id !== node.id) : [...selected, node.id] : selected.includes(node.id) ? selected : [node.id];
    setSelected(next); setSelectedEdge(null);
    if (event.shiftKey) return;
    undoStack.current.push(projectRef.current!); if (undoStack.current.length > 30) undoStack.current.shift();
    drag.current = { kind: 'nodes', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, viewport: projectRef.current!.viewport, nodes: projectRef.current!.nodes.filter(item => next.includes(item.id)).map(item => ({ id: item.id, x: item.x, y: item.y })) };
    stage.current?.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (state.kind === 'connection') { setConnectionPoint(worldPoint(event.clientX, event.clientY)); return; }
    const dx = event.clientX - state.startX, dy = event.clientY - state.startY;
    if (state.kind === 'pan') commit(value => ({ ...value, viewport: { ...state.viewport, x: state.viewport.x + dx, y: state.viewport.y + dy } }), false);
    else commit(value => ({ ...value, nodes: value.nodes.map(node => {
      const original = state.nodes!.find(item => item.id === node.id);
      const grid = (position: number) => Math.max(-999_000, Math.min(999_000, snap ? Math.round(position / 16) * 16 : position));
      return original ? { ...node, x: grid(original.x + dx / state.viewport.zoom), y: grid(original.y + dy / state.viewport.zoom) } : node;
    }) }), false);
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (state?.kind === 'connection') {
      const input = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-canvas-input]');
      if (input?.dataset.canvasInput && state.sourceId) connect(state.sourceId, input.dataset.canvasInput);
      else if (state.sourceId && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 5) {
        const target = document.elementFromPoint(event.clientX, event.clientY);
        if (!target?.closest('.bc-node,.bc-floating-ui')) {
          const rect = event.currentTarget.getBoundingClientRect();
          openNodeMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top }, state.sourceId);
        }
      }
    }
    drag.current = null; setConnectionPoint(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    const editing = (event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]');
    if (event.key === 'Escape') { setConnecting(null); setSelectedEdge(null); setNodeMenu(null); setPanel(null); drag.current = null; event.stopPropagation(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (projectRef.current) void persist(projectRef.current, assetsRef.current).catch(() => {}); return; }
    if (editing || (event.target as HTMLElement).closest('.bc-floating-ui,.bc-project-menu,.bc-project-actions')) return;
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelection(); }
    if (event.code === 'Space' && !(event.target as HTMLElement).closest('button,a,[role=button]')) { event.preventDefault(); setSpaceHand(true); }
    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelection(); }
      if (event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
      if (event.key.toLowerCase() === 'g') { event.preventDefault(); try { commit(value => event.shiftKey ? ungroupNodes(value, selected) : groupNodes(value, selected)); } catch (error) { setMessage(errorMessage(error)); } }
    }
  }

  async function switchProject(id: string) {
    if (busyRef.current) return;
    busyRef.current = 'project'; setBusy('project');
    try {
      if (projectRef.current) await persist(projectRef.current, assetsRef.current);
      const [next, media] = await Promise.all([loadProject(memberId, id), loadAssets(memberId, id)]);
      if (next) { adopt(next, media, true); setMessage(''); }
    } catch (error) { setMessage(errorMessage(error)); }
    finally { busyRef.current = null; setBusy(null); }
  }
  async function newProject() {
    if (busyRef.current) return;
    busyRef.current = 'project'; setBusy('project');
    try { if (projectRef.current) await persist(projectRef.current, assetsRef.current); adopt(createProject(), [], false); setMessage(''); }
    catch (error) { setMessage(errorMessage(error)); }
    finally { busyRef.current = null; setBusy(null); }
  }
  async function removeProject() {
    if (!project || busyRef.current || project.nodes.some(activeJob)) { setMessage('진행 중인 생성 결과를 먼저 확인해주세요.'); return; }
    if (!window.confirm('이 기기에 저장된 캔버스와 미디어를 삭제할까요? 내려받은 작업 파일은 유지됩니다.')) return;
    try { await saveQueue.current.catch(() => {}); await deleteProject(memberId, project.id); setProjects(rows => rows.filter(row => row.id !== project.id)); adopt(createProject(), [], false); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  async function importFile(file?: File) {
    if (!file || busyRef.current) return;
    busyRef.current = 'import'; setBusy('import');
    try {
      if (projectRef.current) await persist(projectRef.current, assetsRef.current);
      const archive = await readArchive(file);
      const next = { ...archive.project, id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
      await persist(next, archive.assets); adopt(next, archive.assets, true); setMessage('작업 파일을 새 캔버스로 가져왔습니다.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { busyRef.current = null; setBusy(null); }
  }
  async function exportFile() {
    if (!projectRef.current) return;
    try { const archive = await makeArchive(projectRef.current, assetsRef.current); downloadFile(archive, `${projectRef.current.title || '캔버스'}.bottopia.json`); }
    catch (error) { setMessage(errorMessage(error)); }
  }
  async function addFiles(files: File[], point?: { x: number; y: number }) {
    const current = projectRef.current;
    if (!current || !files.length || busyRef.current) return;
    const targetId = uploadTarget.current, referenceTargetId = uploadReferenceTarget.current;
    uploadTarget.current = null; uploadReferenceTarget.current = null;
    if (files.length + current.nodes.length > MAX_NODES) { setMessage('노드 개수 제한을 초과합니다. 파일을 나눠 추가해주세요.'); return; }
    busyRef.current = 'upload'; setBusy('upload');
    try {
      const media: CanvasAsset[] = [];
      for (const file of files) media.push(await inspectAsset(file));
      if (ownerRef.current !== memberId || projectRef.current?.id !== current.id) throw new Error('작업이 바뀌었습니다. 현재 캔버스에서 파일을 다시 추가해주세요.');
      const latest = projectRef.current;
      const base = point ?? screenToWorld({ x: 80, y: 100 }, latest.viewport);
      const target = latest.nodes.find(node => node.id === targetId);
      const referenceTarget = latest.nodes.find(node => node.id === referenceTargetId);
      if ((targetId && !target) || (referenceTargetId && !referenceTarget)) throw new Error('미디어를 추가할 노드가 삭제되었습니다. 노드를 다시 선택해주세요.');
      if (referenceTarget && media.some(asset => !canConnect(asset.kind, referenceTarget.kind))) throw new Error(referenceTarget.kind === 'image' ? '이미지 노드에는 이미지 참조를 추가해주세요.' : '이 파일을 선택한 노드의 참조로 연결할 수 없습니다.');
      let next: CanvasProject;
      let nextSelected: string[];
      if (referenceTarget) {
        const nodes = media.map((asset, index) => ({ ...createNode(asset.kind, referenceTarget.x - NODE_WIDTH - 120, referenceTarget.y + index * (NODE_HEIGHT + 40)), title: asset.name.slice(0, 100), assetIds: [asset.id], selectedAssetId: asset.id }));
        next = { ...latest, nodes: [...latest.nodes, ...nodes] };
        for (const node of nodes) next = connectNodes(next, node.id, referenceTarget.id);
        nextSelected = [referenceTarget.id];
      } else if (target && media.every(asset => asset.kind === target.kind)) {
        next = { ...latest, nodes: latest.nodes.map(node => node.id === target.id ? { ...node, assetIds: [...node.assetIds, ...media.map(asset => asset.id)], selectedAssetId: media[0].id } : node) };
        nextSelected = [target.id];
      } else {
        const nodes = media.map((asset, index) => ({ ...createNode(asset.kind, base.x + (index % 3) * (NODE_WIDTH + 32), base.y + Math.floor(index / 3) * (NODE_HEIGHT + 32)), title: asset.name.slice(0, 100), assetIds: [asset.id], selectedAssetId: asset.id }));
        next = { ...latest, nodes: [...latest.nodes, ...nodes] };
        nextSelected = nodes.map(node => node.id);
      }
      if (next.nodes.length > MAX_NODES) throw new Error('노드 개수 제한을 초과합니다. 파일을 나눠 추가해주세요.');
      putAssets([...assetsRef.current, ...media]);
      commit(() => next); setSelected(nextSelected);
      setMessage('미디어를 추가했습니다. 아직 생성 비용은 발생하지 않았습니다.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { busyRef.current = null; setBusy(null); }
  }
  async function downloadAsset(asset: CanvasAsset) {
    try {
      const blob = asset.blob ?? await fetch(asset.remoteUrl!).then(response => { if (!response.ok) throw new Error('결과 파일을 읽지 못했습니다.'); return response.blob(); });
      if (!blob) throw new Error('파일을 찾을 수 없습니다.');
      downloadFile(blob, asset.name);
    } catch { if (asset.remoteUrl) window.open(asset.remoteUrl, '_blank', 'noopener,noreferrer'); else setMessage('파일을 내려받지 못했습니다.'); }
  }
  function splitScript(node: CanvasNode) {
    const scenes = node.text.split(/\n\s*\n/).map(text => text.trim()).filter(Boolean);
    if (!scenes.length) { setMessage('빈 줄로 구분한 장면 내용을 먼저 적어주세요.'); return; }
    if (scenes.length > 16 || (projectRef.current?.nodes.length ?? 0) + scenes.length * 2 > MAX_NODES) { setMessage('한 번에 최대 16개 장면을 나눌 수 있습니다. 캔버스의 노드 개수도 확인해주세요.'); return; }
    commit(value => {
      let next = value;
      scenes.forEach((text, index) => {
        const prompt = { ...createNode('text', node.x + NODE_WIDTH + 120, node.y + index * (NODE_HEIGHT + 72)), title: `장면 ${index + 1}`, text };
        const image = { ...createNode('image', node.x + 2 * (NODE_WIDTH + 120), node.y + index * (NODE_HEIGHT + 72)), title: `장면 ${index + 1} 이미지` };
        next = connectNodes({ ...next, nodes: [...next.nodes, prompt, image] }, prompt.id, image.id);
      });
      return next;
    });
    setMessage(`${scenes.length}개 장면으로 나눴습니다. 각 이미지 노드에서 설정을 확인하고 생성하세요.`);
  }
  function unlockUnknown(node: CanvasNode) {
    if (!window.confirm('제공자의 생성 기록을 확인했나요? 미접수 또는 생성 종료를 확인한 경우에만 잠금을 해제하세요. 다음 생성 요청에는 별도 요금이 발생할 수 있습니다.')) return;
    updateNode(node.id, { job: { ...node.job!, state: 'failed', message: '사용자가 제공자 기록 확인 후 잠금을 해제했습니다. 새 요청은 생성 버튼으로만 보낼 수 있습니다.' } });
    undoStack.current = [];
  }
  async function cleanupReferences(node: CanvasNode) {
    if (busyRef.current || activeJob(node) || !node.job?.assetKeys?.length) return;
    busyRef.current = 'cleanup'; setBusy('cleanup');
    try {
      await deleteReferences(node.job.assetKeys);
      commit(value => ({ ...value, nodes: value.nodes.map(item => item.id === node.id && item.job?.startedAt === node.job?.startedAt ? { ...item, job: { ...item.job!, assetKeys: [] } } : item) }), false);
      setMessage('임시 참조 파일을 정리했습니다. 기기에 보관한 원본은 유지됩니다.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { busyRef.current = null; setBusy(null); }
  }
  async function run() {
    const snapshot = projectRef.current;
    const node = snapshot?.nodes.find(item => item.id === selected[0]);
    if (!snapshot || !node || busyRef.current || activeJob(node)) return;
    const model = models.find(item => item.id === node.modelId);
    if (!model?.canGenerate) { setMessage(model?.configurationNote ?? '이 모델의 API 연결과 생성 권한을 확인해주세요.'); return; }
    let keys: string[] = [];
    busyRef.current = node.id; setBusy(node.id); setMessage('');
    try {
      const input = collectInputs(snapshot, node.id);
      if (!input.prompt.trim()) throw new Error('생성할 내용을 입력해주세요.');
      const minPrompt = node.modelId === 'seedream-5-5' ? 5 : node.modelId === 'seedream-5-pro' ? 4 : 1;
      const maxPrompt = node.modelId === 'nano-banana-2-1' ? 20_000 : 5000;
      if (input.prompt.length < minPrompt || input.prompt.length > maxPrompt) throw new Error(`이 모델의 프롬프트는 ${minPrompt}~${maxPrompt.toLocaleString()}자로 입력해주세요.`);
      const refs = input.assetIds.map(id => { const asset = assetsRef.current.find(item => item.id === id); if (!asset) throw new Error('참조 미디어 파일을 다시 추가해주세요.'); return asset; });
      const incomingMedia = snapshot.edges.filter(edge => edge.target === node.id).map(edge => snapshot.nodes.find(item => item.id === edge.source)).filter(item => item && !['text', 'script'].includes(item.kind));
      if (incomingMedia.some(item => !item!.assetIds.length)) throw new Error('연결된 참조 노드에 미디어가 없습니다. 먼저 업로드하거나 생성해주세요.');
      estimateGenerationCost({ modelId: node.modelId, providerId: model.providerId, resolution: node.resolution, durationSeconds: node.durationSeconds, references: refs });
      await persist(snapshot, assetsRef.current);
      const uploaded = await uploadReferences(refs); keys = uploaded.assetKeys;
      const result = await submitGeneration({ operationId: crypto.randomUUID(), modelId: node.modelId, prompt: input.prompt, aspectRatio: node.aspectRatio, resolution: node.resolution, durationSeconds: node.durationSeconds, generateAudio: node.generateAudio, references: uploaded.references });
      const job: CanvasJob = { receipt: result.receipt, receipts: [result.receipt], expectedCount: 1, assetKeys: keys, state: result.state, startedAt: new Date().toISOString(), pollAfterSeconds: result.pollAfterSeconds };
      undoStack.current = [];
      commit(value => ({ ...value, nodes: value.nodes.map(item => item.id === node.id ? { ...item, job } : item) }), false);
      await persist(projectRef.current!, assetsRef.current);
    } catch (error) {
      const uncertain = error instanceof CanvasClientError && error.uncertain;
      const retained = error instanceof CanvasClientError && error.assetKeys.length ? error.assetKeys : keys;
      // An existing receipt must survive a subsequent local-save failure.
      const latest = projectRef.current?.nodes.find(item => item.id === node.id);
      if (!latest?.job?.receipt || latest.job.state === 'failed' || latest.job.state === 'succeeded') {
        let remainingKeys = retained;
        if (!uncertain && retained.length) { try { await deleteReferences(retained); remainingKeys = []; } catch { /* Preserve keys for explicit cleanup. */ } }
        commit(value => ({ ...value, nodes: value.nodes.map(item => item.id === node.id ? { ...item, job: { receipt: '', state: uncertain ? 'unknown' : 'failed', startedAt: new Date().toISOString(), message: uncertain ? `접수 결과 확인 필요. 자동 재시도하지 않습니다. ${errorMessage(error)}` : errorMessage(error), assetKeys: remainingKeys } } : item) }), false);
      }
      setMessage(errorMessage(error));
    } finally { busyRef.current = null; setBusy(null); }
  }

  if (!project || owner !== memberId) return <section className="bottopia-canvas bc-loading" aria-busy="true"><p>캔버스를 불러오는 중…</p></section>;
  const selectedAsset = selectedNode ? assetMap.get(selectedNode.selectedAssetId ?? selectedNode.assetIds.at(-1) ?? '') : undefined;
  const nodeMap = new Map(project.nodes.map(node => [node.id, node]));
  const saveLabel = { loading: '불러오는 중', dirty: '저장 대기', saving: '저장 중…', saved: '기기에 저장됨', error: '저장 실패' }[saveState];
  const composerWidth = Math.max(240, Math.min(635, stageSize.width - 24));
  const composerLeft = selectedNode ? Math.max(8, Math.min(stageSize.width - composerWidth - 8, project.viewport.x + (selectedNode.x + NODE_WIDTH / 2) * project.viewport.zoom - composerWidth / 2)) : 8;
  const composerTop = selectedNode ? Math.max(8, Math.min(stageSize.height - composerHeight - (stageSize.width <= 850 ? 130 : 78), project.viewport.y + (selectedNode.y + NODE_HEIGHT) * project.viewport.zoom + 12)) : 8;
  const contextLeft = selectedNode ? Math.max(8, Math.min(stageSize.width - 250, project.viewport.x + (selectedNode.x + NODE_WIDTH / 2) * project.viewport.zoom - 110)) : stageSize.width / 2 - 80;
  const contextTop = selectedNode ? Math.max(8, project.viewport.y + selectedNode.y * project.viewport.zoom - 42) : 12;
  const incoming = selectedNode ? project.edges.filter(edge => edge.target === selectedNode.id) : [];
  const menuSource = nodeMenu?.sourceId ? nodeMap.get(nodeMenu.sourceId) : undefined;
  const togglePanel = (next: Panel) => { setPanel(panel === next ? null : next); setNodeMenu(null); };
  const openUpload = (nodeId: string | null = null, asReference = false) => { uploadTarget.current = asReference ? null : nodeId; uploadReferenceTarget.current = asReference ? nodeId : null; mediaInput.current?.click(); };

  return <section className={`bottopia-canvas${busy === 'project' || busy === 'import' ? ' bc-project-loading' : ''}`} aria-busy={busy === 'project' || busy === 'import'} onPaste={event => { const files = Array.from(event.clipboardData.files); if (files.length) { event.preventDefault(); uploadTarget.current = null; uploadReferenceTarget.current = null; void addFiles(files); } }} onKeyDown={keyboard} onKeyUp={event => { if (event.code === 'Space') setSpaceHand(false); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSpaceHand(false); }}>
    <header className="bc-project-bar">
      <button className="bc-tools-back" onClick={onOpenTools ?? (() => togglePanel('tools'))}><span className="bc-brand-mark">B</span><span>창작도구</span><CanvasIcon name="chevron" width="12" height="12" /></button>
      <span className="bc-project-divider" />
      <label className="bc-title-field"><span className="bc-sr-only">작업 이름</span><input value={project.title} maxLength={160} onChange={event => commit(value => ({ ...value, title: event.target.value }))} /></label>
      <span className={`bc-save-state ${saveState}`} role="status" title="이 브라우저에 저장됩니다. 다른 기기로 옮길 때는 작업 파일을 내려받으세요.">{saveLabel}</span>
      <div className="bc-project-actions"><label><span className="bc-sr-only">저장한 작업 선택</span><select value={projects.some(row => row.id === project.id) ? project.id : ''} disabled={!!busy} onChange={event => void switchProject(event.target.value)}>{!projects.some(row => row.id === project.id) && <option value="">현재 작업</option>}{projects.map(row => <option key={row.id} value={row.id}>{row.title || '이름 없는 작업'}</option>)}</select></label>
        <details className="bc-project-menu"><summary aria-label="작업 메뉴"><CanvasIcon name="more" /></summary><div><button onClick={() => void newProject()} disabled={!!busy}>새 캔버스</button><button onClick={() => void persist(project, assets).catch(() => {})} disabled={!!busy}>지금 저장</button><button onClick={() => void exportFile()} disabled={!!busy}>작업 파일 내려받기</button><button onClick={() => importInput.current?.click()} disabled={!!busy}>작업 파일 가져오기</button><button className="bc-danger" onClick={() => void removeProject()} disabled={!!busy || project.nodes.some(activeJob)}>이 기기의 작업 삭제</button></div></details>
      </div>
    </header>
    <input ref={mediaInput} className="bc-file-input" type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm" multiple onChange={event => { void addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
    <input ref={importInput} className="bc-file-input" type="file" accept=".json,.bottopia.json" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }} />
    <div ref={stage} className={`bc-stage ${hand || spaceHand ? 'is-hand' : ''} ${connecting ? 'is-connecting' : ''}`} tabIndex={0} aria-label="노드 캔버스" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { drag.current = null; setConnectionPoint(null); }} onDoubleClick={event => { if (!(event.target as HTMLElement).closest('.bc-node,.bc-floating-ui,.bc-group')) { const rect = event.currentTarget.getBoundingClientRect(); openNodeMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top }); } }} onContextMenu={event => { if (!(event.target as HTMLElement).closest('.bc-node,.bc-floating-ui,input,textarea,video,audio')) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); openNodeMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top }); } }} onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }} onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); uploadTarget.current = null; uploadReferenceTarget.current = null; void addFiles(Array.from(event.dataTransfer.files), worldPoint(event.clientX, event.clientY)); } }}>
      {!project.nodes.length && <div className="bc-empty"><span className="bc-empty-title">아이디어를 연결해보세요</span><p>아래 ＋에서 노드를 추가하거나 파일을 놓아주세요.</p><button onClick={starter}>텍스트 → 이미지 → 영상으로 시작 <CanvasIcon name="chevron" width="13" height="13" /></button></div>}
      <div className="bc-world" style={{ transform: `translate(${project.viewport.x}px,${project.viewport.y}px) scale(${project.viewport.zoom})` }}>
        <svg className="bc-edges" width="1" height="1" aria-label="노드 연결선">
          {showEdges && project.edges.map(edge => {
            const source = nodeMap.get(edge.source), target = nodeMap.get(edge.target);
            if (!source || !target) return null;
            const sx = source.x + NODE_WIDTH, sy = source.y + NODE_PORT_Y, tx = target.x, ty = target.y + NODE_PORT_Y, bend = Math.max(70, Math.abs(tx - sx) / 2);
            const d = `M ${sx} ${sy} C ${sx + bend} ${sy},${tx - bend} ${ty},${tx} ${ty}`;
            return <g key={edge.id} className={selectedEdge === edge.id ? 'is-selected' : ''}><path className="bc-edge-line" d={d} /><path className="bc-edge-hit" d={d} tabIndex={0} role="button" aria-label={`${source.title}에서 ${target.title} 연결 선택`} onClick={event => { event.stopPropagation(); setSelectedEdge(edge.id); setSelected([]); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setSelectedEdge(edge.id); setSelected([]); } }} /></g>;
          })}
          {connecting && connectionPoint && nodeMap.has(connecting) && <path className="bc-edge-draft" d={`M ${nodeMap.get(connecting)!.x + NODE_WIDTH} ${nodeMap.get(connecting)!.y + NODE_PORT_Y} C ${nodeMap.get(connecting)!.x + NODE_WIDTH + 80} ${nodeMap.get(connecting)!.y + NODE_PORT_Y},${connectionPoint.x - 80} ${connectionPoint.y},${connectionPoint.x} ${connectionPoint.y}`} />}
        </svg>
        {project.groups.map(group => {
          const members = project.nodes.filter(node => node.groupId === group.id);
          if (!members.length) return null;
          const left = Math.min(...members.map(node => node.x)) - 20, top = Math.min(...members.map(node => node.y)) - 32;
          return <div key={group.id} className="bc-group" style={{ left, top, width: Math.max(...members.map(node => node.x + NODE_WIDTH)) - left + 20, height: Math.max(...members.map(node => node.y + NODE_HEIGHT)) - top + 20 }}><button onClick={() => setSelected(members.map(node => node.id))}>{group.title} <small>{members.length}</small></button></div>;
        })}
        {project.nodes.map(node => {
          const tool = TOOLS.find(item => item.kind === node.kind)!;
          const asset = assetMap.get(node.selectedAssetId ?? node.assetIds.at(-1) ?? '');
          return <article key={node.id} data-node-id={node.id} data-kind={node.kind} className={`bc-node ${selected.includes(node.id) ? 'is-selected' : ''} ${connecting === node.id ? 'is-source' : ''}`} style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }} onClick={event => { event.stopPropagation(); if (!(event.target as HTMLElement).closest('button,input,textarea,audio,video,.bc-node-header')) { setSelected(event.shiftKey ? selected.includes(node.id) ? selected.filter(id => id !== node.id) : [...selected, node.id] : [node.id]); setSelectedEdge(null); setNodeMenu(null); } }}>
            <header className="bc-node-header" onPointerDown={event => nodePointerDown(event, node)}><CanvasIcon name={node.kind} width="13" height="13" /><strong>{node.title || tool.label}</strong><span className={`bc-node-status ${node.job?.state ?? ''}`}>{busy === node.id ? '접수 중' : node.job ? JOB_LABELS[node.job.state] : node.kind === 'image' || node.kind === 'video' ? node.resolution : tool.label}</span></header>
            {node.kind === 'image' || node.kind === 'video' ? <button style={{ top: NODE_PORT_Y - 10 }} className="bc-port bc-input" data-canvas-input={node.id} aria-label={`${node.title} 입력 연결`} onPointerDown={event => event.stopPropagation()} onClick={() => { if (connecting) connect(connecting, node.id); else { setSelected([node.id]); setMessage('참조 노드의 오른쪽 ＋에서 이 ＋까지 연결하세요.'); } }}><CanvasIcon name="add" width="12" height="12" /></button> : null}
            <button style={{ top: NODE_PORT_Y - 10 }} className="bc-port bc-output" aria-label={`${node.title} 출력 연결`} aria-pressed={connecting === node.id} onPointerDown={event => { event.stopPropagation(); event.preventDefault(); setSelected([node.id]); setNodeMenu(null); setConnecting(node.id); setConnectionPoint(worldPoint(event.clientX, event.clientY)); drag.current = { kind: 'connection', sourceId: node.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, viewport: project.viewport }; stage.current?.setPointerCapture(event.pointerId); }} onClick={event => { if (event.detail === 0) { setConnecting(node.id); setSelected([node.id]); setMessage('연결할 노드의 왼쪽 ＋를 선택하세요.'); } }}><CanvasIcon name="add" width="12" height="12" /></button>
            <div className="bc-node-body" onDoubleClick={event => { if (!['text', 'script'].includes(node.kind) && !asset) { event.stopPropagation(); openUpload(node.id); } }}>{node.kind === 'text' || node.kind === 'script' ? <textarea aria-label={`${node.title} 내용`} placeholder={node.kind === 'script' ? '장면과 대사, 흐름을 적어보세요…' : '어떤 장면을 만들까요?'} maxLength={32000} value={node.text} onFocus={() => setSelected([node.id])} onChange={event => updateNode(node.id, { text: event.target.value })} onPointerDown={event => event.stopPropagation()} /> : <MediaPreview asset={asset} kind={node.kind} />}</div>
          </article>;
        })}
      </div>

      {(selected.length > 0 || selectedEdge) && <div className="bc-contextbar bc-floating-ui" aria-label="선택 항목 도구" style={{ left: contextLeft, top: contextTop }}>{selected.length > 0 && <><span>{selected.length > 1 ? `${selected.length}개 선택` : TOOLS.find(tool => tool.kind === selectedNode?.kind)?.label}</span><button title="복제 · ⌘/Ctrl D" aria-label="선택 노드 복제" onClick={duplicateSelection}><CanvasIcon name="duplicate" width="15" height="15" /></button>{selected.length > 1 && <button title="그룹 만들기" aria-label="선택 노드 그룹 만들기" onClick={() => { try { commit(value => groupNodes(value, selected)); } catch (error) { setMessage(errorMessage(error)); } }}><CanvasIcon name="group" width="15" height="15" /></button>}{selected.some(id => nodeMap.get(id)?.groupId) && <button onClick={() => commit(value => ungroupNodes(value, selected))} title="그룹 해제">해제</button>}{selectedAsset && <button title="선택 미디어 내려받기" aria-label="선택 미디어 내려받기" onClick={() => void downloadAsset(selectedAsset)}><CanvasIcon name="download" width="15" height="15" /></button>}</>}<button className="bc-danger" title="선택 항목 삭제" aria-label="선택 항목 삭제" onClick={removeSelection}><CanvasIcon name="trash" width="15" height="15" /></button></div>}

      {selectedNode && !connectionPoint && <div ref={composer} className="bc-composer bc-floating-ui" aria-label="선택한 노드 설정" style={{ width: composerWidth, left: composerLeft, top: composerTop }}>
        {(selectedNode.kind === 'image' || selectedNode.kind === 'video') && <div className="bc-ref-strip" aria-label="연결한 참조">
          <button className="bc-add-reference" onClick={() => openUpload(selectedNode.id, true)} title="참조 미디어 추가"><CanvasIcon name="upload" width="15" height="15" /><span>미디어</span></button>
          {incoming.map(edge => { const source = nodeMap.get(edge.source); if (!source) return null; const asset = assetMap.get(source.selectedAssetId ?? source.assetIds.at(-1) ?? ''); return <div className={`bc-ref-chip ${asset?.kind === 'image' ? 'has-thumb' : ''}`} key={edge.id} title={source.title}>{asset?.kind === 'image' && <span className="bc-ref-thumb"><MediaPreview asset={asset} /></span>}<CanvasIcon name={source.kind} width="12" height="12" /><span>{source.title}</span><button aria-label={`${source.title} 연결 해제`} title="연결 해제" onClick={() => commit(value => ({ ...value, edges: value.edges.filter(item => item.id !== edge.id) }))}><CanvasIcon name="close" width="11" height="11" /></button></div>; })}
          {!incoming.length && <small>노드를 연결하면 참조로 사용합니다</small>}
        </div>}
        <label className="bc-prompt"><span className="bc-sr-only">{selectedNode.kind === 'text' || selectedNode.kind === 'script' ? '노드 내용' : '프롬프트'}</span><textarea rows={3} maxLength={32000} value={selectedNode.text} placeholder={selectedNode.kind === 'audio' ? '오디오 메모를 적어주세요. 파일은 미디어 추가로 넣을 수 있어요.' : '어떤 장면을 만들고 싶으세요?'} onChange={event => updateNode(selectedNode.id, { text: event.target.value })} /></label>
        <div className="bc-composer-footer">
          {selectedNode.kind === 'image' || selectedNode.kind === 'video' ? <>
            <label className="bc-inline-field bc-model-field"><span className="bc-sr-only">모델</span><select aria-label="모델" disabled={!!busy || activeJob(selectedNode)} value={selectedNode.modelId} onChange={event => { const model = models.find(item => item.id === event.target.value); if (model) updateNode(selectedNode.id, { modelId: model.id, resolution: model.id === 'seedream-5-pro' || model.id === 'seedream-5-5' ? '2K' : model.resolutions.includes(selectedNode.resolution) ? selectedNode.resolution : model.resolutions[0], aspectRatio: model.aspectRatios.includes(selectedNode.aspectRatio) ? selectedNode.aspectRatio : model.aspectRatios[0] }); }}>{models.filter(model => model.kind === selectedNode.kind).map(model => <option key={model.id} value={model.id}>{model.label}</option>)}</select></label>
            <label className="bc-inline-field"><span className="bc-sr-only">비율</span><select aria-label="비율" value={selectedNode.aspectRatio} disabled={!!busy || activeJob(selectedNode)} onChange={event => updateNode(selectedNode.id, { aspectRatio: event.target.value })}>{selectedModel?.aspectRatios.map(ratio => <option key={ratio} value={ratio}>{ratio === 'auto' || ratio === 'adaptive' ? '자동' : ratio}</option>)}</select></label>
            <label className="bc-inline-field"><span className="bc-sr-only">해상도</span><select aria-label="해상도" value={selectedNode.resolution} disabled={!!busy || activeJob(selectedNode)} onChange={event => updateNode(selectedNode.id, { resolution: event.target.value })}>{selectedModel?.resolutions.map(resolution => <option key={resolution}>{resolution}</option>)}</select></label>
            {selectedNode.kind === 'video' && <><label className="bc-inline-field bc-duration-field" title="영상 길이"><input aria-label="길이 (초)" type="number" min={selectedModel?.minDuration ?? 4} max={selectedModel?.maxDuration ?? 30} step="1" disabled={!!busy || activeJob(selectedNode)} value={selectedNode.durationSeconds} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 1 && value <= 120) updateNode(selectedNode.id, { durationSeconds: value }); }} /><span>초</span></label><label className="bc-audio-check" title="영상 오디오 생성"><input type="checkbox" aria-label="영상에 오디오 생성" checked={selectedNode.generateAudio} disabled={!!busy || activeJob(selectedNode)} onChange={event => updateNode(selectedNode.id, { generateAudio: event.target.checked })} /><CanvasIcon name="audio" width="14" height="14" /></label></>}
            <details className="bc-price-info"><summary title="예상 요금과 근거">{estimate?.amount != null ? `$${estimate.amount.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}` : '견적 —'}</summary><div><strong>1개 생성 예상 비용</strong><p>{estimate?.note ?? selectedModel?.priceNote}</p><p>{estimate?.approximate ? '잠정 예상입니다. ' : ''}실제 청구는 달라질 수 있습니다.</p>{selectedModel && <a href={selectedModel.pricingSource} target="_blank" rel="noreferrer">{selectedModel.providerLabel} 가격표 ↗</a>}<small>{selectedModel?.checkedAt} 확인</small></div></details>
            <button className="bc-run" aria-label="1개 생성하기" title="버튼을 누를 때만 유료 생성 요청을 보냅니다" disabled={!!busy || activeJob(selectedNode) || !selectedModel?.canGenerate || !!estimateError || !inputs.prompt.trim()} onClick={() => void run()}>{busy === selectedNode.id || activeJob(selectedNode) ? <span className="bc-working-dot" /> : <CanvasIcon name="arrow" width="21" height="21" />}</button>
          </> : <><span className="bc-local-note">{selectedNode.kind === 'audio' ? '내 오디오 파일' : '직접 작성 · 생성 비용 없음'}</span>{selectedNode.kind === 'script' && <button className="bc-small-action" onClick={() => splitScript(selectedNode)}>장면 나누기</button>}{selectedNode.kind === 'audio' && <button className="bc-small-action" onClick={() => openUpload(selectedNode.id)}><CanvasIcon name="upload" width="13" height="13" />미디어 추가</button>}</>}
          <details className="bc-node-options"><summary aria-label="노드 상세 설정"><CanvasIcon name="more" width="17" height="17" /></summary><div><label className="bc-field">이름<input value={selectedNode.title} maxLength={160} onChange={event => updateNode(selectedNode.id, { title: event.target.value })} /></label>{selectedNode.kind !== 'text' && selectedNode.kind !== 'script' && <button onClick={() => openUpload(selectedNode.id)}>미디어 추가</button>}{selectedNode.assetIds.length > 0 && <><label className="bc-field">미디어 · 결과<select value={selectedAsset?.id ?? ''} onChange={event => updateNode(selectedNode.id, { selectedAssetId: event.target.value })}>{selectedNode.assetIds.map((id, index) => <option key={id} value={id}>{index + 1}. {assetMap.get(id)?.name ?? '파일을 찾을 수 없음'}</option>)}</select></label>{selectedAsset && <button onClick={() => void downloadAsset(selectedAsset)}><CanvasIcon name="download" width="14" height="14" />원본 내려받기</button>}{selectedAsset?.remoteUrl && !selectedAsset.blob && <small>결과 주소가 만료되기 전에 원본을 보관하세요.</small>}</>}{selectedNode.job?.assetKeys?.length && !activeJob(selectedNode) ? <button disabled={!!busy} onClick={() => void cleanupReferences(selectedNode)}>임시 참조 파일 정리</button> : null}<small>이 작업은 내 기기에 저장됩니다.<br />포트폴리오에 자동 게시되지 않습니다.</small></div></details>
        </div>
        {(estimateError || ((selectedNode.kind === 'image' || selectedNode.kind === 'video') && !selectedModel?.canGenerate)) && <p className="bc-model-note">{estimateError || selectedModel?.configurationNote || (selectedModel?.connected ? '현재 계정의 생성 권한을 확인해주세요.' : '이 모델의 생성 API 연결이 필요합니다.')}</p>}
        {selectedNode.job && <div className={`bc-job ${selectedNode.job.state}`} role="status"><strong>{JOB_LABELS[selectedNode.job.state]}</strong>{selectedNode.job.message && <span>{selectedNode.job.message}</span>}{selectedNode.job.state === 'unknown' && !selectedNode.job.receipt && <button onClick={() => unlockUnknown(selectedNode)}>기록 확인 후 잠금 해제</button>}</div>}
      </div>}

      {nodeMenu && <div className="bc-add-menu bc-floating-ui" role="menu" aria-label={menuSource ? '연결할 노드 추가' : '노드 추가'} style={{ left: Math.max(8, Math.min(stageSize.width - 238, nodeMenu.x)), top: Math.max(8, Math.min(stageSize.height - 326, nodeMenu.y)) }}><div className="bc-popup-heading"><span>{menuSource ? '이어서 만들기' : '노드 추가'}</span><button aria-label="노드 추가 메뉴 닫기" onClick={() => { setNodeMenu(null); setConnecting(null); }}><CanvasIcon name="close" width="13" height="13" /></button></div>{TOOLS.filter(tool => !menuSource || canConnect(menuSource.kind, tool.kind)).map(tool => <button key={tool.kind} role="menuitem" onClick={() => createFromMenu(tool.kind)}><CanvasIcon name={tool.kind} /><span>{tool.label}</span><CanvasIcon name="add" width="13" height="13" /></button>)}{!menuSource && <><hr /><button role="menuitem" disabled={!!busy} onClick={() => { setNodeMenu(null); openUpload(); }}><CanvasIcon name="upload" /><span>미디어 업로드</span></button></>}<small>{menuSource ? '새 노드가 자동으로 연결됩니다' : '빈 공간을 두 번 눌러도 추가할 수 있어요'}</small></div>}

      {panel && <section className={`bc-popup bc-floating-ui bc-popup-${panel}`} aria-label={panel === 'history' ? '이 작업의 미디어 기록' : panel === 'tools' ? '캔버스 도구' : panel === 'view' ? '보기 설정' : panel === 'shortcuts' ? '단축키' : '캔버스 가이드'}><div className="bc-popup-heading"><strong>{panel === 'history' ? '이 작업의 미디어' : panel === 'tools' ? '캔버스 도구' : panel === 'view' ? '보기' : panel === 'shortcuts' ? '단축키' : '캔버스 사용법'}</strong><button aria-label="패널 닫기" onClick={() => setPanel(null)}><CanvasIcon name="close" width="14" height="14" /></button></div>
        {panel === 'view' ? <><div className="bc-zoom-row"><button aria-label="축소" onClick={() => zoomAt(1 / 1.2)}>−</button><span>{Math.round(project.viewport.zoom * 100)}%</span><button aria-label="확대" onClick={() => zoomAt(1.2)}>＋</button></div><button onClick={() => zoomAt(1 / project.viewport.zoom)}>100%로 보기</button><button onClick={fitAll}>전체 노드 맞추기</button></> : panel === 'history' ? <>{assets.length ? <div className="bc-history-grid">{assets.map(asset => <button key={asset.id} title={`${asset.name} · 클릭하여 노드로 추가`} onClick={() => { const node = { ...createNode(asset.kind, screenToWorld({ x: stageSize.width / 2, y: stageSize.height / 2 }, project.viewport).x, screenToWorld({ x: stageSize.width / 2, y: stageSize.height / 2 }, project.viewport).y), title: asset.name.slice(0, 100), assetIds: [asset.id], selectedAssetId: asset.id }; if (project.nodes.length >= MAX_NODES) { setMessage(`노드는 최대 ${MAX_NODES}개까지 추가할 수 있습니다.`); return; } commit(value => ({ ...value, nodes: [...value.nodes, node] })); setSelected([node.id]); setPanel(null); }}>{asset.kind === 'image' ? <MediaPreview asset={asset} /> : <CanvasIcon name={asset.kind} width="28" height="28" />}<span>{asset.name}</span></button>)}</div> : <p>추가하거나 생성한 미디어가 여기에 모입니다.</p>}<small>이 기기에 저장한 현재 작업의 파일입니다. 선택하면 새 노드로 추가합니다.</small></> : panel === 'tools' ? <><button onClick={undo} disabled={!undoStack.current.length || !!busy || project.nodes.some(activeJob)}><CanvasIcon name="undo" />실행 취소</button><button onClick={arrangeNodes} disabled={!project.nodes.length}><CanvasIcon name="arrange" />노드 정리</button><button onClick={() => { setPanel(null); openUpload(); }} disabled={!!busy}><CanvasIcon name="upload" />미디어 업로드</button><button onClick={() => void exportFile()} disabled={!!busy}><CanvasIcon name="download" />작업 파일 내려받기</button><button onClick={() => importInput.current?.click()} disabled={!!busy}>작업 파일 가져오기</button><button onClick={() => void newProject()} disabled={!!busy}>새 캔버스</button></> : panel === 'shortcuts' ? <dl className="bc-shortcuts"><div><dt>화면 이동</dt><dd>Space + 드래그</dd></div><div><dt>확대 · 축소</dt><dd>⌘/Ctrl + 스크롤</dd></div><div><dt>여러 노드 선택</dt><dd>Shift + 클릭</dd></div><div><dt>복제</dt><dd>⌘/Ctrl D</dd></div><div><dt>실행 취소</dt><dd>⌘/Ctrl Z</dd></div><div><dt>그룹 · 해제</dt><dd>⌘/Ctrl G · + Shift</dd></div><div><dt>저장</dt><dd>⌘/Ctrl S</dd></div><div><dt>삭제 · 연결 취소</dt><dd>Delete · Esc</dd></div></dl> : <ol className="bc-guide"><li><strong>노드를 추가하세요</strong><p>하단 ＋에서 텍스트, 이미지, 영상, 오디오, 스크립트를 선택하세요. 파일을 끌어 넣거나 붙여넣을 수도 있어요.</p></li><li><strong>아이디어와 참조를 연결하세요</strong><p>오른쪽 ＋를 다음 노드의 왼쪽 ＋까지 끌어주세요. 빈 공간에 놓으면 연결할 노드를 바로 만들 수 있어요.</p></li><li><strong>선택한 노드 아래에서 완성하세요</strong><p>프롬프트와 모델을 확인하고 ↑를 누르면 한 개를 생성합니다. 유료 요청은 생성 버튼을 누를 때만 전송돼요.</p></li><li><strong>작업을 보관하세요</strong><p>기기에 자동 저장됩니다. 다른 기기로 옮기기 전에는 작업 메뉴에서 파일을 내려받으세요.</p></li></ol>}
      </section>}

      {showMinimap && <div className="bc-minimap bc-floating-ui"><CanvasMinimap project={project} width={stageSize.width} height={stageSize.height} onNavigate={world => commit(value => ({ ...value, viewport: { ...value.viewport, x: stageSize.width / 2 - world.x * value.viewport.zoom, y: stageSize.height / 2 - world.y * value.viewport.zoom } }), false)} /></div>}
      <nav className="bc-view-dock bc-floating-ui" aria-label="캔버스 보기 도구"><button className="bc-zoom-button" title="확대 · 축소" onClick={() => togglePanel('view')} aria-expanded={panel === 'view'}>{Math.round(project.viewport.zoom * 100)}%<span>⌄</span></button><button title="노드 정리" aria-label="노드 정리" onClick={arrangeNodes} disabled={!project.nodes.length}><CanvasIcon name="arrange" width="16" height="16" /></button><button title="미니맵" aria-label="미니맵" aria-pressed={showMinimap} onClick={() => setShowMinimap(value => !value)}><CanvasIcon name="map" width="16" height="16" /></button><button title={showEdges ? '연결선 숨기기' : '연결선 보기'} aria-label={showEdges ? '연결선 숨기기' : '연결선 보기'} aria-pressed={!showEdges} onClick={() => setShowEdges(value => !value)}><CanvasIcon name="edge" width="16" height="16" /></button><button title="격자에 맞추기" aria-label="격자에 맞추기" aria-pressed={snap} onClick={() => setSnap(value => !value)}><CanvasIcon name="snap" width="16" height="16" /></button></nav>
      <nav className="bc-tool-dock bc-floating-ui" aria-label="캔버스 도구 모음"><button className="bc-add-button" title="노드 추가" aria-label="노드 추가" aria-expanded={!!nodeMenu} onClick={() => nodeMenu ? setNodeMenu(null) : openNodeMenu()}><CanvasIcon name="add" width="21" height="21" /></button><span className="bc-dock-separator" /><button title="선택 도구" aria-label="선택 도구" aria-pressed={!hand} onClick={() => setHand(false)}><CanvasIcon name="select" /></button><button title="손 도구 · Space" aria-label="손 도구" aria-pressed={hand} onClick={() => setHand(value => !value)}><CanvasIcon name="hand" /></button><span className="bc-dock-separator" /><button title="미디어 기록" aria-label="미디어 기록" aria-expanded={panel === 'history'} onClick={() => togglePanel('history')}><CanvasIcon name="history" /></button><button title="도구" aria-label="캔버스 도구" aria-expanded={panel === 'tools'} onClick={() => togglePanel('tools')}><CanvasIcon name="tools" /></button><button title="단축키" aria-label="단축키" aria-expanded={panel === 'shortcuts'} onClick={() => togglePanel('shortcuts')}><CanvasIcon name="keyboard" /></button><button title="가이드" aria-label="캔버스 가이드" aria-expanded={panel === 'guide'} onClick={() => togglePanel('guide')}><CanvasIcon name="guide" /></button></nav>
      {connecting && !nodeMenu && <div className="bc-connection-hint">왼쪽 ＋에 연결하거나 빈 곳에 놓아주세요 <kbd>Esc</kbd></div>}
      {message && <div className="bc-message bc-floating-ui" role="status"><span>{message}</span><button aria-label="알림 닫기" onClick={() => setMessage('')}><CanvasIcon name="close" width="14" height="14" /></button></div>}
    </div>
  </section>;
}
