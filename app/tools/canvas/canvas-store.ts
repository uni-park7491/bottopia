import type { CanvasAsset, CanvasJob, CanvasProject } from '../../../lib/canvas/types.ts';
import { parseProject } from '../../../lib/canvas/graph.ts';

const DATABASE = 'bottopia-canvas-local';
const DATABASE_VERSION = 2;
const LEGACY_REVISION = 'legacy-v1';
const MAX_ASSET_BYTES = 50 * 1024 * 1024;
type ProjectRow = { memberId: string; projectId: string; project: CanvasProject; revision?: string };
type AssetRow = { memberId: string; projectId: string; assetId: string; asset: CanvasAsset };
export type ProjectSnapshot = { project: CanvasProject; revision: string };

export class CanvasSaveConflictError extends Error {
  constructor() {
    super('다른 탭에서 이 작업을 먼저 저장했습니다. 현재 작업을 파일로 내려받아 보관한 뒤 최신 저장본을 불러와주세요.');
    this.name = 'CanvasSaveConflictError';
  }
}
const revisionOf = (row: ProjectRow): string => row.revision ?? LEGACY_REVISION;

function key(value: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error('계정 또는 프로젝트 ID를 확인해주세요.');
  return value;
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('이 브라우저는 로컬 캔버스 저장을 지원하지 않습니다.')); return; }
    const request = indexedDB.open(DATABASE, DATABASE_VERSION);
    let blocked = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      const projects = db.objectStoreNames.contains('projects') ? request.transaction!.objectStore('projects') : db.createObjectStore('projects', { keyPath: ['memberId', 'projectId'] });
      if (!projects.indexNames.contains('member')) projects.createIndex('member', 'memberId');
      const assets = db.objectStoreNames.contains('assets') ? request.transaction!.objectStore('assets') : db.createObjectStore('assets', { keyPath: ['memberId', 'projectId', 'assetId'] });
      if (!assets.indexNames.contains('project')) assets.createIndex('project', ['memberId', 'projectId']);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      if (blocked) db.close(); else resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('로컬 보관함을 열 수 없습니다.'));
    request.onblocked = () => { blocked = true; reject(new Error('다른 탭을 닫고 다시 저장해주세요.')); };
  });
}

/** Resolve only after commit; quota, cloning, request and abort errors reject. */
async function transaction<T>(names: string[], mode: IDBTransactionMode, work: (tx: IDBTransaction, abort: (reason: unknown) => void) => () => T): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction;
    try { tx = db.transaction(names, mode); } catch (error) { db.close(); reject(error); return; }
    let result: () => T;
    let failure: unknown;
    tx.oncomplete = () => { db.close(); try { resolve(result()); } catch (error) { reject(error); } };
    tx.onabort = () => { db.close(); reject(failure ?? tx.error ?? new Error('저장하지 못했습니다. 내려받기로 현재 작업을 보관해주세요.')); };
    // Request errors abort the transaction by default. Handle the final abort only.
    tx.onerror = () => {};
    const abort = (reason: unknown) => { failure = reason; try { tx.abort(); } catch { db.close(); reject(reason); } };
    try { result = work(tx, abort); } catch (error) { abort(error); }
  });
}

function localProject(project: CanvasProject): CanvasProject {
  const normalized = parseProject(JSON.stringify(project));
  // Imports/exports intentionally discard jobs; the member's local draft retains polling state.
  const jobs = new Map(project.nodes.filter(node => node.job).map(node => [node.id, node.job!]));
  for (const node of normalized.nodes) {
    const raw = jobs.get(node.id);
    if (!raw) continue;
    const states = ['queued', 'running', 'succeeded', 'failed', 'unknown'];
    if (typeof raw.receipt !== 'string' || raw.receipt.length > 16_384 || !states.includes(raw.state) || typeof raw.startedAt !== 'string' || raw.startedAt.length > 40 || !Number.isFinite(Date.parse(raw.startedAt))) throw new Error('실행 기록이 올바르지 않습니다.');
    const job: CanvasJob = { receipt: raw.receipt, state: raw.state, startedAt: raw.startedAt };
    if (raw.receipts !== undefined) {
      if (!Array.isArray(raw.receipts) || raw.receipts.length > 4 || raw.receipts.some(value => typeof value !== 'string' || value.length > 16_384)) throw new Error('실행 기록을 확인해주세요.');
      job.receipts = [...raw.receipts];
    }
    if (raw.assetKeys !== undefined) {
      if (!Array.isArray(raw.assetKeys) || raw.assetKeys.length > 50 || raw.assetKeys.some(value => typeof value !== 'string' || value.length > 1000)) throw new Error('참조 기록을 확인해주세요.');
      job.assetKeys = [...raw.assetKeys];
    }
    if (raw.expectedCount !== undefined) {
      if (!Number.isInteger(raw.expectedCount) || raw.expectedCount < 1 || raw.expectedCount > 4) throw new Error('실행 개수를 확인해주세요.');
      job.expectedCount = raw.expectedCount;
    }
    if (raw.submissionError !== undefined) {
      if (typeof raw.submissionError !== 'string' || raw.submissionError.length > 1000) throw new Error('실행 메시지가 너무 깁니다.');
      job.submissionError = raw.submissionError;
    }
    if (raw.message !== undefined) {
      if (typeof raw.message !== 'string' || raw.message.length > 1000) throw new Error('실행 메시지가 너무 깁니다.');
      job.message = raw.message;
    }
    if (raw.pollAfterSeconds !== undefined) {
      if (!Number.isFinite(raw.pollAfterSeconds) || raw.pollAfterSeconds < 0 || raw.pollAfterSeconds > 3600) throw new Error('실행 확인 간격이 올바르지 않습니다.');
      job.pollAfterSeconds = raw.pollAfterSeconds;
    }
    node.job = job;
  }
  return normalized;
}

function normalizedAsset(value: CanvasAsset): CanvasAsset {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value.id) || !['image', 'video', 'audio'].includes(value.kind)) throw new Error('미디어 정보를 확인해주세요.');
  if (typeof value.name !== 'string' || value.name.length > 255 || typeof value.mime !== 'string' || value.mime.length > 120 || !value.mime.startsWith(`${value.kind}/`)) throw new Error('미디어 형식을 확인해주세요.');
  if (!Number.isSafeInteger(value.bytes) || value.bytes < 0 || value.bytes > MAX_ASSET_BYTES) throw new Error('미디어 한 개는 50MB 이하여야 합니다.');
  const asset: CanvasAsset = { id: value.id, kind: value.kind, name: value.name, mime: value.mime, bytes: value.bytes };
  if (value.blob !== undefined) {
    if (!(value.blob instanceof Blob) || value.blob.size !== value.bytes) throw new Error('미디어 파일 크기가 올바르지 않습니다.');
    asset.blob = value.blob;
  }
  if (value.remoteUrl !== undefined) {
    if (typeof value.remoteUrl !== 'string') throw new Error('미디어 주소를 확인해주세요.');
    let url: URL;
    try { url = new URL(value.remoteUrl); } catch { throw new Error('미디어 주소를 확인해주세요.'); }
    if (url.protocol !== 'https:' || url.username || url.password || value.remoteUrl.length > 16_384) throw new Error('안전한 미디어 주소를 사용해주세요.');
    asset.remoteUrl = value.remoteUrl;
  }
  if (!asset.blob && !asset.remoteUrl) throw new Error('미디어 파일 또는 결과 주소가 필요합니다.');
  for (const field of ['width', 'height', 'durationSeconds'] as const) {
    if (value[field] === undefined) continue;
    if (typeof value[field] !== 'number' || !Number.isFinite(value[field]) || value[field]! <= 0 || value[field]! > 1_000_000) throw new Error('미디어 크기 또는 재생 시간을 확인해주세요.');
    asset[field] = value[field];
  }
  if (value.jobReceipt !== undefined) {
    if (typeof value.jobReceipt !== 'string' || value.jobReceipt.length > 16_384) throw new Error('미디어 실행 기록이 올바르지 않습니다.');
    asset.jobReceipt = value.jobReceipt;
  }
  if (value.outputIndex !== undefined) {
    if (!Number.isInteger(value.outputIndex) || value.outputIndex < 0 || value.outputIndex > 100) throw new Error('미디어 결과 번호를 확인해주세요.');
    asset.outputIndex = value.outputIndex;
  }
  return asset;
}

export async function listProjects(memberId: string): Promise<Array<{ id: string; title: string; updatedAt: string }>> {
  key(memberId);
  const rows = await transaction<ProjectRow[]>(['projects'], 'readonly', tx => {
    let rows: ProjectRow[] = [];
    const request = tx.objectStore('projects').index('member').getAll(IDBKeyRange.only(memberId));
    request.onsuccess = () => { rows = request.result as ProjectRow[]; };
    return () => rows;
  });
  return rows.map(row => {
    const project = localProject(row.project);
    return { id: project.id, title: project.title, updatedAt: project.updatedAt };
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadProjectSnapshot(memberId: string, projectId: string): Promise<ProjectSnapshot | null> {
  key(memberId); key(projectId);
  const row = await transaction<ProjectRow | undefined>(['projects'], 'readonly', tx => {
    let row: ProjectRow | undefined;
    const request = tx.objectStore('projects').get([memberId, projectId]);
    request.onsuccess = () => { row = request.result as ProjectRow | undefined; };
    return () => row;
  });
  return row ? { project: localProject(row.project), revision: revisionOf(row) } : null;
}

export async function loadProject(memberId: string, projectId: string): Promise<CanvasProject | null> {
  return (await loadProjectSnapshot(memberId, projectId))?.project ?? null;
}

/** Compare and write in one transaction; null means this must be a new row. */
export async function saveProject(memberId: string, project: CanvasProject, assets: CanvasAsset[] = [], expectedRevision: string | null = null): Promise<string> {
  key(memberId);
  const clean = localProject(project);
  if (assets.length > 500) throw new Error('한 번에 저장할 미디어가 너무 많습니다.');
  const cleanAssets = assets.map(normalizedAsset);
  const revision = crypto.randomUUID();
  return transaction<string>(['projects', 'assets'], 'readwrite', (tx, abort) => {
    const projects = tx.objectStore('projects');
    const request = projects.get([memberId, clean.id]);
    request.onsuccess = () => {
      const existing = request.result as ProjectRow | undefined;
      if ((existing ? revisionOf(existing) : null) !== expectedRevision) { abort(new CanvasSaveConflictError()); return; }
      try {
        projects.put({ memberId, projectId: clean.id, project: clean, revision } satisfies ProjectRow);
        for (const asset of cleanAssets) tx.objectStore('assets').put({ memberId, projectId: clean.id, assetId: asset.id, asset } satisfies AssetRow);
      } catch (error) { abort(error); }
    };
    return () => revision;
  });
}

export async function saveAsset(memberId: string, projectId: string, asset: CanvasAsset): Promise<void> {
  key(memberId); key(projectId);
  const clean = normalizedAsset(asset);
  await transaction<void>(['assets'], 'readwrite', tx => {
    tx.objectStore('assets').put({ memberId, projectId, assetId: clean.id, asset: clean } satisfies AssetRow);
    return () => undefined;
  });
}

export async function loadAssets(memberId: string, projectId: string): Promise<CanvasAsset[]> {
  key(memberId); key(projectId);
  const rows = await transaction<AssetRow[]>(['assets'], 'readonly', tx => {
    let rows: AssetRow[] = [];
    const request = tx.objectStore('assets').index('project').getAll(IDBKeyRange.only([memberId, projectId]));
    request.onsuccess = () => { rows = request.result as AssetRow[]; };
    return () => rows;
  });
  return rows.map(row => normalizedAsset(row.asset));
}

export async function deleteProject(memberId: string, projectId: string, expectedRevision: string | null = null): Promise<void> {
  key(memberId); key(projectId);
  await transaction<void>(['projects', 'assets'], 'readwrite', (tx, abort) => {
    const projects = tx.objectStore('projects');
    const request = projects.get([memberId, projectId]);
    request.onsuccess = () => {
      const existing = request.result as ProjectRow | undefined;
      if ((existing ? revisionOf(existing) : null) !== expectedRevision) { abort(new CanvasSaveConflictError()); return; }
      try {
        projects.delete([memberId, projectId]);
        const cursorRequest = tx.objectStore('assets').index('project').openKeyCursor(IDBKeyRange.only([memberId, projectId]));
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;
          tx.objectStore('assets').delete(cursor.primaryKey); cursor.continue();
        };
      } catch (error) { abort(error); }
    };
    return () => undefined;
  });
}

export const deleteMemberProject = deleteProject;
