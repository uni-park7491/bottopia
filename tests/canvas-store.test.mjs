import { test } from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { IDBObjectStore } from 'fake-indexeddb';
import { createProject, createNode, exportProject } from '../lib/canvas/graph.ts';
import { listProjects, loadProject, saveProject, deleteProject, saveAsset, loadAssets } from '../app/tools/canvas/canvas-store.ts';

function media(id, contents) {
  const blob = new Blob([contents], { type: 'image/png' });
  return { id, kind: 'image', name: `${id}.png`, mime: 'image/png', bytes: blob.size, blob };
}

test('same project and asset IDs stay isolated by member and deletion only removes that member project', async () => {
  const project = createProject('A의 작업');
  const sharedId = project.id;
  const other = { ...project, title: 'B의 작업' };
  const another = { ...createProject('A의 다른 작업') };
  await saveProject('owner-a', project, [media('same-asset', 'owner-a-data')]);
  await saveProject('owner-b', other, [media('same-asset', 'owner-b-data')]);
  await saveProject('owner-a', another, [media('same-asset', 'another-project-data')]);
  assert.equal((await loadProject('owner-a', sharedId)).title, 'A의 작업');
  assert.equal((await loadProject('owner-b', sharedId)).title, 'B의 작업');
  assert.equal(await loadProject('unrelated-member', sharedId), null);
  assert.deepEqual(await loadAssets('unrelated-member', sharedId), []);
  assert.equal(await (await loadAssets('owner-a', sharedId))[0].blob.text(), 'owner-a-data');
  assert.equal(await (await loadAssets('owner-b', sharedId))[0].blob.text(), 'owner-b-data');
  await deleteProject('owner-a', sharedId);
  assert.equal(await loadProject('owner-a', sharedId), null);
  assert.deepEqual(await loadAssets('owner-a', sharedId), []);
  assert.equal((await loadProject('owner-b', sharedId)).title, 'B의 작업');
  assert.equal((await loadAssets('owner-b', sharedId)).length, 1);
  assert.equal(await (await loadAssets('owner-a', another.id))[0].blob.text(), 'another-project-data');
  assert.deepEqual((await listProjects('owner-a')).map(row => row.id), [another.id]);
});

test('committed project and Blob data reload independently of mutated caller objects', async () => {
  const project = createProject('저장된 버전');
  const node = createNode('image', 25, 30);
  node.assetIds = ['local-image']; node.selectedAssetId = 'local-image';
  node.job = { receipt: 'local-polling-receipt', receipts: ['local-polling-receipt'], expectedCount: 1, assetKeys: ['canvas/member/reference'], submissionError: 'partial status', state: 'running', startedAt: new Date().toISOString() };
  project.nodes.push(node);
  const asset = media('local-image', 'actual-file-bytes');
  await saveProject('blob-owner', project, [asset]);
  project.title = '저장 후 수정'; node.text = '저장되지 않은 텍스트'; asset.name = 'changed.png';
  const restored = await loadProject('blob-owner', project.id);
  assert.equal(restored.title, '저장된 버전'); assert.equal(restored.nodes[0].text, '');
  assert.equal(restored.nodes[0].job.receipt, 'local-polling-receipt');
  assert.deepEqual(restored.nodes[0].job.receipts, ['local-polling-receipt']);
  assert.deepEqual(restored.nodes[0].job.assetKeys, ['canvas/member/reference']);
  assert.equal(restored.nodes[0].job.expectedCount, 1);
  assert.ok(!exportProject(restored).includes('local-polling-receipt'));
  const [savedAsset] = await loadAssets('blob-owner', project.id);
  assert.equal(savedAsset.name, 'local-image.png');
  assert.equal(savedAsset.blob.type, 'image/png');
  assert.equal(await savedAsset.blob.text(), 'actual-file-bytes');
  restored.nodes[0].text = 'still not saved';
  assert.equal((await loadProject('blob-owner', project.id)).nodes[0].text, '');
});

test('a quota failure rejects and rolls back both the graph update and all assets', async () => {
  const project = createProject('이전 저장본');
  await saveProject('quota-owner', project);
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) {
    if (this.name === 'assets' && args[0].assetId === 'too-large') throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    return put.apply(this, args);
  };
  try {
    await assert.rejects(saveProject('quota-owner', { ...project, title: '저장 실패본' }, [media('first-asset', 'first'), media('too-large', 'second')]), { name: 'QuotaExceededError' });
  } finally { IDBObjectStore.prototype.put = put; }
  assert.equal((await loadProject('quota-owner', project.id)).title, '이전 저장본');
  assert.deepEqual(await loadAssets('quota-owner', project.id), []);
});

test('asset records retain remote result metadata while rejecting executable URLs, invalid types and oversized files', async () => {
  const project = createProject();
  await saveProject('remote-owner', project);
  const remote = { id: 'remote-video', kind: 'video', name: 'result.mp4', mime: 'video/mp4', bytes: 100, remoteUrl: 'https://media.example/result.mp4', jobReceipt: 'local-result-reference', outputIndex: 0, width: 1280, height: 720, durationSeconds: 5 };
  await saveAsset('remote-owner', project.id, remote);
  assert.deepEqual(await loadAssets('remote-owner', project.id), [remote]);
  for (const change of [
    { remoteUrl: 'javascript:alert(1)' }, { remoteUrl: 'data:video/mp4;base64,AA' },
    { bytes: 50 * 1024 * 1024 + 1 }, { mime: 'text/html' }, { durationSeconds: -1 },
    { blob: new Blob(['incorrect bytes'], { type: 'video/mp4' }) }, { id: undefined },
  ]) await assert.rejects(saveAsset('remote-owner', project.id, { ...remote, ...change }));
  assert.equal((await loadAssets('remote-owner', project.id)).length, 1);
});

test('unavailable IndexedDB rejects instead of reporting a successful save', async () => {
  const db = globalThis.indexedDB;
  Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true });
  try { await assert.rejects(saveProject('unsupported-owner', createProject()), /지원하지/); }
  finally { Object.defineProperty(globalThis, 'indexedDB', { value: db, configurable: true }); }
});
