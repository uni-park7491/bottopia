'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react';
import type { CanvasAsset, CanvasJob, CanvasKind, CanvasNode, CanvasProject, ModelAvailability } from '../../../lib/canvas/types';
import { collectInputs, connectNodes, createNode, createProject, duplicateNodes, fitViewport, groupNodes, MAX_NODES, NODE_HEIGHT, NODE_WIDTH, removeNodes, screenToWorld, ungroupNodes } from '../../../lib/canvas/graph';
import { estimateGenerationCost, MODELS } from '../../../lib/canvas/models';
import { deleteProject, listProjects, loadAssets, loadProject, saveProject } from './canvas-store';
import { makeArchive, readArchive } from './canvas-archive';
import { CanvasClientError, deleteReferences, inspectAsset, pollGeneration, submitGeneration, uploadReferences } from './canvas-generation';
import { downloadFile } from '../download';
import './canvas.css';

const TOOLS: Array<{ kind: CanvasKind; label: string; icon: string }> = [
  { kind: 'text', label: '텍스트', icon: 'T' }, { kind: 'image', label: '이미지', icon: '▧' },
  { kind: 'video', label: '영상', icon: '▶' }, { kind: 'audio', label: '오디오', icon: '♫' }, { kind: 'script', label: '스크립트', icon: '≡' },
];
const JOB_LABELS = { queued: '접수됨', running: '생성 중', succeeded: '완료', failed: '실패', unknown: '확인 필요' };
type SaveState = 'loading' | 'dirty' | 'saving' | 'saved' | 'error';
type ProjectSummary = { id: string; title: string; updatedAt: string };
type Drag = {
  kind: 'pan' | 'nodes' | 'connection'; pointerId: number; startX: number; startY: number;
  viewport: CanvasProject['viewport']; nodes?: Array<{ id: string; x: number; y: number }>; sourceId?: string;
};
const activeJob = (node: CanvasNode) => !!node.job && !['succeeded', 'failed'].includes(node.job.state);
const errorMessage = (error: unknown) => error instanceof Error ? error.message : '작업을 마치지 못했습니다. 다시 확인해주세요.';

function MediaPreview({ asset }: { asset?: CanvasAsset }) {
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
  if (!asset) return <div className="bc-media-empty"><span aria-hidden="true">＋</span><p>미디어를 올리거나<br />노드를 연결해 생성하세요.</p></div>;
  if (failedId === asset.id) return <div className="bc-preview-failed"><p>미리보기를 불러오지 못했습니다.</p>{asset.remoteUrl && <a href={asset.remoteUrl} target="_blank" rel="noopener noreferrer">원본 파일 열기 ↗</a>}</div>;
  if (asset.kind === 'image') return <img className="bc-media" crossOrigin="anonymous" onError={() => setFailedId(asset.id)} ref={value => { element.current = value; }} alt={asset.name} loading="lazy" draggable={false} />; // eslint-disable-line @next/next/no-img-element
  if (asset.kind === 'video') return <video className="bc-media" crossOrigin="anonymous" onError={() => setFailedId(asset.id)} ref={value => { element.current = value; }} controls playsInline preload="metadata" aria-label={asset.name} />;
  return <div className="bc-audio-preview"><span aria-hidden="true">♫</span><audio crossOrigin="anonymous" onError={() => setFailedId(asset.id)} ref={value => { element.current = value; }} controls preload="metadata" aria-label={asset.name} /></div>;
}

export default function CanvasWorkspace({ memberId }: { memberId: string }) {
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
  const [help, setHelp] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string | null>(null);
  const projectRef = useRef<CanvasProject | null>(null);
  const assetsRef = useRef<CanvasAsset[]>([]);
  const ownerRef = useRef('');
  const busyRef = useRef<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const undoStack = useRef<CanvasProject[]>([]);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const persistedAssets = useRef(new Map<string, Map<string, CanvasAsset>>());

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
    setProject(next); setAssets(media); setOwner(memberId); setSelected([]); setSelectedEdge(null); setConnecting(null);
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
  function addNode(kind: CanvasKind, position?: { x: number; y: number }) {
    const current = projectRef.current;
    if (!current || !stage.current) return;
    if (current.nodes.length >= MAX_NODES) { setMessage(`한 캔버스에는 노드를 ${MAX_NODES}개까지 추가할 수 있습니다.`); return; }
    const anchor = current.nodes.find(node => node.id === selected[0]) ?? current.nodes.at(-1);
    const center = position ?? (anchor ? { x: anchor.x + NODE_WIDTH + 64, y: anchor.y } : screenToWorld({ x: stage.current.clientWidth / 2, y: stage.current.clientHeight / 2 }, current.viewport));
    if (!position && !anchor) { center.x -= NODE_WIDTH / 2; center.y -= NODE_HEIGHT / 2; }
    if (!position) while (current.nodes.some(node => Math.abs(node.x - center.x) < NODE_WIDTH + 20 && Math.abs(node.y - center.y) < NODE_HEIGHT + 20)) center.y += NODE_HEIGHT + 40;
    const node = createNode(kind, center.x, center.y);
    commit(value => {
      const next = { ...value, nodes: [...value.nodes, node] };
      if (!position && stage.current) next.viewport = fitViewport(next, stage.current.clientWidth, stage.current.clientHeight);
      return next;
    }); setSelected([node.id]); setMessage('');
  }
  function starter() {
    const current = projectRef.current;
    if (!current || current.nodes.length) return;
    const text = createNode('text', 0, 80), image = createNode('image', 360, 80), video = createNode('video', 720, 80);
    text.title = '장면의 시작';
    let next = { ...current, nodes: [text, image, video] };
    next = connectNodes(connectNodes(next, text.id, image.id), image.id, video.id);
    if (stage.current) next.viewport = fitViewport(next, stage.current.clientWidth, stage.current.clientHeight);
    commit(() => next); setSelected([text.id]);
  }
  function connect(source: string, target: string) {
    try { commit(value => connectNodes(value, source, target)); setConnecting(null); setConnectionPoint(null); setMessage(''); }
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
  function wheel(event: WheelEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('textarea,input,select,video,audio')) return;
    event.preventDefault();
    const rect = stage.current!.getBoundingClientRect();
    if (event.ctrlKey || event.metaKey) zoomAt(Math.exp(-event.deltaY * 0.008), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    else commit(value => ({ ...value, viewport: { ...value.viewport, x: value.viewport.x - event.deltaX, y: value.viewport.y - event.deltaY } }), false);
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('.bc-node,.bc-group,.bc-stage-controls,button')) return;
    if (event.button !== 0 && event.button !== 1) return;
    if (hand || spaceHand || event.button === 1) {
      drag.current = { kind: 'pan', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, viewport: projectRef.current!.viewport };
      event.currentTarget.setPointerCapture(event.pointerId);
    } else { setSelected([]); setSelectedEdge(null); setConnecting(null); }
    stage.current?.focus();
  }
  function nodePointerDown(event: PointerEvent<HTMLElement>, node: CanvasNode) {
    if (event.button !== 0) return;
    event.stopPropagation(); event.preventDefault();
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
      return original ? { ...node, x: Math.max(-999_000, Math.min(999_000, original.x + dx / state.viewport.zoom)), y: Math.max(-999_000, Math.min(999_000, original.y + dy / state.viewport.zoom)) } : node;
    }) }), false);
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (state?.kind === 'connection') {
      const input = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-canvas-input]');
      if (input?.dataset.canvasInput && state.sourceId) connect(state.sourceId, input.dataset.canvasInput);
    }
    drag.current = null; setConnectionPoint(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    const editing = (event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (projectRef.current) void persist(projectRef.current, assetsRef.current).catch(() => {}); return; }
    if (editing) return;
    if (event.key === 'Escape') { setConnecting(null); setSelectedEdge(null); drag.current = null; }
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
    const targetId = uploadTarget.current; uploadTarget.current = null;
    if (files.length + current.nodes.length > MAX_NODES) { setMessage('노드 개수 제한을 초과합니다. 파일을 나눠 추가해주세요.'); return; }
    busyRef.current = 'upload'; setBusy('upload');
    try {
      const media: CanvasAsset[] = [];
      for (const file of files) media.push(await inspectAsset(file));
      if (ownerRef.current !== memberId || projectRef.current?.id !== current.id) throw new Error('작업이 바뀌었습니다. 현재 캔버스에서 파일을 다시 추가해주세요.');
      const base = point ?? screenToWorld({ x: 80, y: 100 }, current.viewport);
      const target = current.nodes.find(node => node.id === targetId);
      putAssets([...assetsRef.current, ...media]);
      if (target && media.every(asset => asset.kind === target.kind)) {
        commit(value => ({ ...value, nodes: value.nodes.map(node => node.id === target.id ? { ...node, assetIds: [...node.assetIds, ...media.map(asset => asset.id)], selectedAssetId: media[0].id } : node) })); setSelected([target.id]);
      } else {
        const nodes = media.map((asset, index) => ({ ...createNode(asset.kind, base.x + (index % 3) * (NODE_WIDTH + 32), base.y + Math.floor(index / 3) * (NODE_HEIGHT + 32)), title: asset.name.slice(0, 100), assetIds: [asset.id], selectedAssetId: asset.id }));
        commit(value => ({ ...value, nodes: [...value.nodes, ...nodes] })); setSelected(nodes.map(node => node.id));
      }
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
        const prompt = { ...createNode('text', node.x + 360, node.y + index * 310), title: `장면 ${index + 1}`, text };
        const image = { ...createNode('image', node.x + 720, node.y + index * 310), title: `장면 ${index + 1} 이미지` };
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
  const saveLabel = { loading: '불러오는 중', dirty: '저장 대기', saving: '저장 중…', saved: '이 기기에 저장됨', error: '저장 실패' }[saveState];

  return <section className={`bottopia-canvas${busy === 'project' || busy === 'import' ? ' bc-project-loading' : ''}`} aria-busy={busy === 'project' || busy === 'import'} onPaste={event => { const files = Array.from(event.clipboardData.files); if (files.length) { event.preventDefault(); uploadTarget.current = null; void addFiles(files); } }} onKeyDown={keyboard} onKeyUp={event => { if (event.code === 'Space') setSpaceHand(false); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSpaceHand(false); }}>
    <header className="bc-heading"><div><p>BOTTOPIA CANVAS</p><h2>생각을 연결하면, 장면이 됩니다.</h2></div><button className="bc-help-button" onClick={() => setHelp(!help)} aria-expanded={help}>사용 안내 <span aria-hidden="true">?</span></button></header>
    {help && <div className="bc-help"><strong>추가 → 연결 → 생성</strong><p>텍스트와 미디어 노드를 추가하고 오른쪽 점을 다음 노드의 왼쪽 점에 연결하세요. 점을 차례로 눌러도 연결됩니다. 선택한 이미지·영상 노드에서 설정을 정하고 생성 버튼을 누르세요.</p><p>Shift + 클릭: 여러 노드 선택 · Space + 드래그: 이동 · Ctrl/⌘ + 휠: 확대 · Ctrl/⌘ + G: 그룹 · Ctrl/⌘ + D: 복제 · Delete: 삭제 · Ctrl/⌘ + S: 저장</p><p>작업은 현재 브라우저와 계정에 보관됩니다. 중요한 미디어는 원본과 작업 파일을 따로 내려받으세요. 생성 결과 주소는 만료될 수 있습니다.</p></div>}
    <div className="bc-project-bar"><label className="bc-title-field"><span className="bc-sr-only">캔버스 이름</span><input value={project.title} maxLength={160} onChange={event => commit(value => ({ ...value, title: event.target.value }))} placeholder="캔버스 이름" /></label><span className={`bc-save-state ${saveState}`} role="status">{saveLabel}</span><div className="bc-project-actions"><label><span className="bc-sr-only">저장된 캔버스</span><select value={project.id} disabled={!!busy} onChange={event => void switchProject(event.target.value)}><option value={project.id}>{project.title || '이름 없는 캔버스'}</option>{projects.filter(row => row.id !== project.id).map(row => <option key={row.id} value={row.id}>{row.title || '이름 없는 캔버스'}</option>)}</select></label><button disabled={!!busy} onClick={() => void newProject()}>새 작업</button><details className="bc-project-menu"><summary>작업 ⋯</summary><div><button onClick={() => void persist(project, assets).catch(() => {})}>지금 저장</button><button onClick={() => void exportFile()}>작업 내려받기</button><button disabled={!!busy} onClick={() => importInput.current?.click()}>작업 가져오기</button><button aria-label="현재 기기 저장본 삭제" disabled={!!busy} onClick={() => void removeProject()}>기기 저장본 삭제</button></div></details></div></div>
    <input className="bc-file-input" ref={importInput} type="file" accept=".json,application/json" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }} />
    <input className="bc-file-input" ref={mediaInput} type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,audio/mpeg,audio/wav,audio/mp4,audio/aac" multiple onChange={event => { void addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
    <div className="bc-toolbar" aria-label="캔버스 도구"><div className="bc-node-tools">{TOOLS.map(tool => <button key={tool.kind} onClick={() => addNode(tool.kind)}><span aria-hidden="true">{tool.icon}</span>{tool.label}</button>)}<button onClick={() => { uploadTarget.current = null; mediaInput.current?.click(); }}><span aria-hidden="true">↑</span>업로드</button></div><div className="bc-edit-tools"><button aria-pressed={hand} onClick={() => setHand(!hand)}>{hand ? '손 도구' : '선택 도구'}</button>{selected.length > 0 && <><button onClick={duplicateSelection}>복제</button>{selected.length > 1 && <button onClick={() => { try { commit(value => groupNodes(value, selected)); } catch (error) { setMessage(errorMessage(error)); } }}>그룹</button>}{selectedNode?.groupId && <button onClick={() => commit(value => ungroupNodes(value, selected))}>그룹 해제</button>}</>}{(selected.length > 0 || selectedEdge) && <button onClick={removeSelection}>삭제</button>}<button onClick={undo}>되돌리기</button></div></div>
    {message && <div className="bc-message" role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="알림 닫기">×</button></div>}
    <div className="bc-layout"><div ref={stage} className={`bc-stage ${hand || spaceHand ? 'is-hand' : ''} ${connecting ? 'is-connecting' : ''}`} tabIndex={0} role="region" aria-label="노드 캔버스. 빈 곳을 두 번 누르면 텍스트 노드를 추가합니다." onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={event => { drag.current = null; setConnectionPoint(null); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onWheel={wheel} onDoubleClick={event => { if (!(event.target as HTMLElement).closest('.bc-node,button,.bc-group')) addNode('text', worldPoint(event.clientX, event.clientY)); }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }} onDrop={event => { event.preventDefault(); uploadTarget.current = null; void addFiles(Array.from(event.dataTransfer.files), worldPoint(event.clientX, event.clientY)); }}>
      {!project.nodes.length && <div className="bc-empty"><div className="bc-empty-mark" aria-hidden="true">✦</div><h3>첫 아이디어를 놓아보세요.</h3><p>텍스트를 적고, 이미지를 연결하고,<br />다음 장면으로 이어보세요.</p><button className="bc-primary" onClick={starter}>✦ 텍스트 → 이미지 → 영상</button><button className="bc-empty-simple" onClick={() => addNode('text')}>텍스트 하나로 시작</button><small>파일을 여기로 끌어와도 됩니다.</small></div>}
      <div className="bc-world" style={{ transform: `translate(${project.viewport.x}px, ${project.viewport.y}px) scale(${project.viewport.zoom})` }}>
        <svg className="bc-edges" width="1" height="1" aria-label="노드 연결선">{project.edges.map(edge => {
          const source = nodeMap.get(edge.source), target = nodeMap.get(edge.target); if (!source || !target) return null;
          const sx = source.x + NODE_WIDTH, sy = source.y + 130, tx = target.x, ty = target.y + 130, bend = Math.max(70, Math.abs(tx - sx) / 2);
          const path = `M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty}`;
          return <g key={edge.id} className={selectedEdge === edge.id ? 'is-selected' : ''}><path className="bc-edge-hit" d={path} role="button" tabIndex={0} aria-label={`연결: ${source.title} → ${target.title}`} onClick={event => { event.stopPropagation(); setSelectedEdge(edge.id); setSelected([]); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setSelectedEdge(edge.id); setSelected([]); } }} /><path className="bc-edge-line" d={path} /></g>;
        })}{connecting && connectionPoint && nodeMap.has(connecting) && <path className="bc-edge-draft" d={`M ${nodeMap.get(connecting)!.x + NODE_WIDTH} ${nodeMap.get(connecting)!.y + 130} L ${connectionPoint.x} ${connectionPoint.y}`} />}</svg>
        {project.groups.map(group => {
          const members = project.nodes.filter(node => node.groupId === group.id); if (!members.length) return null;
          const left = Math.min(...members.map(node => node.x)) - 20, top = Math.min(...members.map(node => node.y)) - 42;
          return <div key={group.id} className="bc-group" style={{ left, top, width: Math.max(...members.map(node => node.x + NODE_WIDTH)) - left + 20, height: Math.max(...members.map(node => node.y + NODE_HEIGHT)) - top + 20 }}><button onClick={() => setSelected(members.map(node => node.id))}>{group.title} <small>{members.length}</small></button></div>;
        })}
        {project.nodes.map(node => {
          const tool = TOOLS.find(item => item.kind === node.kind)!;
          const asset = assetMap.get(node.selectedAssetId ?? node.assetIds.at(-1) ?? '');
          return <article key={node.id} data-node-id={node.id} data-kind={node.kind} className={`bc-node ${selected.includes(node.id) ? 'is-selected' : ''} ${connecting === node.id ? 'is-source' : ''}`} style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }} onClick={event => { event.stopPropagation(); if (!(event.target as HTMLElement).closest('button,input,textarea,audio,video,.bc-node-header')) { setSelected(event.shiftKey ? selected.includes(node.id) ? selected.filter(id => id !== node.id) : [...selected, node.id] : [node.id]); setSelectedEdge(null); } }}>
            <header className="bc-node-header" onPointerDown={event => nodePointerDown(event, node)}><span className="bc-node-icon" aria-hidden="true">{tool.icon}</span><strong>{node.title || tool.label}</strong><span className="bc-node-kind">{tool.label}</span></header>
            {node.kind === 'image' || node.kind === 'video' ? <button className="bc-port bc-input" data-canvas-input={node.id} aria-label={`${node.title} 입력 연결`} onPointerDown={event => event.stopPropagation()} onClick={() => { if (connecting) connect(connecting, node.id); else { setSelected([node.id]); setMessage('참조 노드의 오른쪽 점을 누른 뒤 이 점을 누르세요.'); } }} /> : null}
            <button className="bc-port bc-output" aria-label={`${node.title} 출력 연결`} aria-pressed={connecting === node.id} onPointerDown={event => { event.stopPropagation(); event.preventDefault(); setConnecting(node.id); setConnectionPoint(worldPoint(event.clientX, event.clientY)); drag.current = { kind: 'connection', sourceId: node.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, viewport: project.viewport }; stage.current?.setPointerCapture(event.pointerId); }} onClick={event => { if (event.detail === 0) { setConnecting(node.id); setSelected([node.id]); } }} />
            <div className="bc-node-body">{node.kind === 'text' || node.kind === 'script' ? <textarea aria-label={`${node.title} 내용`} placeholder={node.kind === 'script' ? '장면과 대사, 흐름을 적어보세요…' : '어떤 장면을 만들까요?'} maxLength={32000} value={node.text} onFocus={() => setSelected([node.id])} onChange={event => updateNode(node.id, { text: event.target.value })} onPointerDown={event => event.stopPropagation()} /> : <MediaPreview asset={asset} />}</div>
            <footer className="bc-node-footer"><span>{busy === node.id ? '접수 중…' : node.job ? JOB_LABELS[node.job.state] : node.assetIds.length ? `${node.assetIds.length}개 미디어` : node.kind === 'text' || node.kind === 'script' ? `${node.text.length.toLocaleString()}자` : '준비'}</span><button onClick={() => setSelected([node.id])}>설정 <span aria-hidden="true">↗</span></button></footer>
          </article>;
        })}
      </div>
      <div className="bc-stage-controls"><button onClick={() => zoomAt(1 / 1.2)} aria-label="축소">−</button><span>{Math.round(project.viewport.zoom * 100)}%</span><button onClick={() => zoomAt(1.2)} aria-label="확대">＋</button><button onClick={() => { if (stage.current) commit(value => ({ ...value, viewport: fitViewport(value, stage.current!.clientWidth, stage.current!.clientHeight) }), false); }}>전체 보기</button></div>
      <span className="bc-stage-caption">{project.nodes.length} 노드 · {project.edges.length} 연결{connecting ? ' · 연결할 노드의 왼쪽 점을 누르세요 · Esc 취소' : ''}</span>
    </div>
    <aside className="bc-composer" aria-label="선택한 노드 설정">{selectedNode ? <>
      <div className="bc-composer-title"><span>{TOOLS.find(tool => tool.kind === selectedNode.kind)?.label}</span><h3>선택한 노드</h3>{selected.length > 1 && <small>{selected.length}개 선택됨 · 첫 노드 설정</small>}</div>
      <label className="bc-field">이름<input value={selectedNode.title} maxLength={160} onChange={event => updateNode(selectedNode.id, { title: event.target.value })} /></label>
      <label className="bc-field">{selectedNode.kind === 'text' || selectedNode.kind === 'script' ? '내용' : '프롬프트'}<textarea rows={5} maxLength={32000} value={selectedNode.text} placeholder="장면의 주인공, 움직임, 분위기를 적어보세요." onChange={event => updateNode(selectedNode.id, { text: event.target.value })} /></label>
      {selectedNode.kind === 'script' && <button onClick={() => splitScript(selectedNode)}>빈 줄로 나눈 장면 만들기</button>}{selectedNode.kind !== 'text' && selectedNode.kind !== 'script' && <button className="bc-upload-node" onClick={() => { uploadTarget.current = selectedNode.id; mediaInput.current?.click(); }}>↑ 이 노드에 미디어 추가</button>}
      {(selectedNode.kind === 'image' || selectedNode.kind === 'video') && <>
        <section className="bc-references"><h4>연결한 참조 <span>{references.length}</span></h4>{references.length ? <ol>{references.map((asset, index) => <li key={asset.id}><span>{index + 1}</span><strong>{asset.name}</strong><small>{asset.kind === 'image' ? '이미지' : asset.kind === 'video' ? '영상' : '오디오'}</small></li>)}</ol> : <p>텍스트나 미디어 노드를 연결하세요.</p>}{project.edges.some(edge => edge.target === selectedNode.id) && <div className="bc-connected-nodes">{project.edges.filter(edge => edge.target === selectedNode.id).map(edge => <button key={edge.id} onClick={() => commit(value => ({ ...value, edges: value.edges.filter(item => item.id !== edge.id) }))} title="연결 해제">{nodeMap.get(edge.source)?.title} <span aria-hidden="true">×</span></button>)}</div>}</section>
        <label className="bc-field">모델<select disabled={!!busy || activeJob(selectedNode)} value={selectedNode.modelId} onChange={event => { const model = models.find(item => item.id === event.target.value); if (model) updateNode(selectedNode.id, { modelId: model.id, resolution: model.resolutions.includes(selectedNode.resolution) ? selectedNode.resolution : model.resolutions[0], aspectRatio: model.aspectRatios.includes(selectedNode.aspectRatio) ? selectedNode.aspectRatio : model.aspectRatios[0] }); }}>{models.filter(model => model.kind === selectedNode.kind).map(model => <option key={model.id} value={model.id}>{model.label}</option>)}</select></label>
        <div className="bc-field-grid"><label className="bc-field">비율<select value={selectedNode.aspectRatio} disabled={!!busy || activeJob(selectedNode)} onChange={event => updateNode(selectedNode.id, { aspectRatio: event.target.value })}>{selectedModel?.aspectRatios.map(ratio => <option key={ratio} value={ratio}>{ratio === 'auto' || ratio === 'adaptive' ? '자동' : ratio}</option>)}</select></label><label className="bc-field">해상도<select value={selectedNode.resolution} disabled={!!busy || activeJob(selectedNode)} onChange={event => updateNode(selectedNode.id, { resolution: event.target.value })}>{selectedModel?.resolutions.map(resolution => <option key={resolution}>{resolution}</option>)}</select></label></div>
        {selectedNode.kind === 'video' && <><label className="bc-field">길이 (초)<input type="number" min={selectedModel?.minDuration ?? 4} max={selectedModel?.maxDuration ?? 30} step="1" disabled={!!busy || activeJob(selectedNode)} value={selectedNode.durationSeconds} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 1 && value <= 120) updateNode(selectedNode.id, { durationSeconds: value }); }} /></label><label className="bc-check"><input type="checkbox" checked={selectedNode.generateAudio} disabled={!!busy || activeJob(selectedNode)} onChange={event => updateNode(selectedNode.id, { generateAudio: event.target.checked })} />영상에 오디오 생성</label></>}
        <div className="bc-cost"><span>이번 생성 예상 비용</span><strong>{estimate?.amount != null ? `$${estimate.amount.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}` : '견적 확인 필요'}</strong><small>1개 생성 · {estimate?.approximate ? '잠정 예상' : '표준 요금 기준'} · 실제 청구는 달라질 수 있습니다.</small>{estimateError && <p>{estimateError}</p>}</div>
        {!selectedModel?.canGenerate && <p className="bc-model-note">{selectedModel?.configurationNote ?? (selectedModel?.connected ? '현재 계정의 생성 권한을 확인해주세요.' : '이 모델의 생성 API 연결이 필요합니다.')}</p>}
        <button className="bc-primary bc-run" disabled={!!busy || activeJob(selectedNode) || !selectedModel?.canGenerate || !!estimateError || !inputs.prompt.trim()} onClick={() => void run()}>{busy === selectedNode.id ? '접수 중…' : activeJob(selectedNode) ? JOB_LABELS[selectedNode.job!.state] : '✦ 1개 생성하기'}</button>
        <p className="bc-run-note">버튼을 누를 때만 유료 생성 요청을 보냅니다.</p><details className="bc-price-info"><summary>요금 안내 · {selectedModel?.providerLabel}</summary><p>{estimate?.note ?? selectedModel?.priceNote}</p>{selectedModel && <a href={selectedModel.pricingSource} target="_blank" rel="noreferrer">제공자 가격표 ↗</a>}<small>{selectedModel?.checkedAt} 확인</small></details>
        {selectedNode.job && <div className={`bc-job ${selectedNode.job.state}`} role="status"><strong>{JOB_LABELS[selectedNode.job.state]}</strong>{selectedNode.job.message && <p>{selectedNode.job.message}</p>}{selectedNode.job.state === 'unknown' && !selectedNode.job.receipt && <><p>중복 결제를 막기 위해 다시 보내지 않았습니다. 제공자의 생성 기록에서 접수 여부를 확인해주세요.</p><button onClick={() => unlockUnknown(selectedNode)}>기록 확인 후 잠금 해제</button></>}</div>}
      </>}
      {selectedNode.job?.assetKeys?.length && !activeJob(selectedNode) ? <button disabled={!!busy} onClick={() => void cleanupReferences(selectedNode)}>임시 참조 파일 정리</button> : null}
      {selectedNode.assetIds.length > 0 && <section className="bc-results"><h4>미디어 · 결과 <span>{selectedNode.assetIds.length}</span></h4><MediaPreview asset={selectedAsset} /><div className="bc-result-list">{selectedNode.assetIds.map((id, index) => <button key={id} aria-pressed={selectedAsset?.id === id} onClick={() => updateNode(selectedNode.id, { selectedAssetId: id })}>{index + 1}</button>)}</div>{selectedAsset ? <><p>{selectedAsset.name}</p><button onClick={() => void downloadAsset(selectedAsset)}>↓ 원본 내려받기</button>{selectedAsset.remoteUrl && !selectedAsset.blob && <small>결과 주소가 만료되기 전에 원본을 보관하세요. <a href={selectedAsset.remoteUrl} target="_blank" rel="noreferrer">원본 열기 ↗</a></small>}</> : <p>미디어 파일을 찾을 수 없습니다. 파일을 다시 추가해주세요.</p>}</section>}
    </> : <div className="bc-inspector-empty"><span aria-hidden="true">↖</span><h3>어느 장면을 만들까요?</h3><p>노드를 선택하면 프롬프트와 참조,<br />모델 설정을 여기에서 다듬을 수 있어요.</p><div><span>01</span><p>노드 추가</p><span>02</span><p>점과 점 연결</p><span>03</span><p>설정하고 생성</p></div>{selectedEdge && <button onClick={removeSelection}>선택한 연결 삭제</button>}</div>}</aside></div>
    <footer className="bc-bottom-note"><span>내 기기에 보관 · 포트폴리오에 자동 게시되지 않습니다.</span><span>텍스트·스크립트는 직접 작성 · 이미지·영상은 연결된 모델로 생성</span></footer>
  </section>;
}
