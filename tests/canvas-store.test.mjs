import { test } from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { IDBObjectStore } from 'fake-indexeddb';
import { createProject, createNode, connectNodes, exportProject } from '../lib/canvas/graph.ts';
import { CanvasSaveConflictError, listProjects, loadProject, loadProjectSnapshot, saveProject, deleteProject, saveAsset, loadAssets } from '../app/tools/canvas/canvas-store.ts';

function media(id, contents) {
  const blob = new Blob([contents], { type: 'image/png' });
  return { id, kind: 'image', name: `${id}.png`, mime: 'image/png', bytes: blob.size, blob };
}

test('v1 graph and blobs migrate without deletion; legacy CAS upgrades once and v1 writers can no longer open', async () => {
  const project = createProject('legacy draft');
  const asset = media('legacy-image', 'original legacy bytes');
  await new Promise((resolve, reject) => {
    const request = indexedDB.open('bottopia-canvas-local', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('projects', { keyPath: ['memberId', 'projectId'] }).createIndex('member', 'memberId');
      request.result.createObjectStore('assets', { keyPath: ['memberId', 'projectId', 'assetId'] }).createIndex('project', ['memberId', 'projectId']);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction(['projects', 'assets'], 'readwrite');
      tx.objectStore('projects').put({ memberId: 'legacy-owner', projectId: project.id, project });
      tx.objectStore('assets').put({ memberId: 'legacy-owner', projectId: project.id, assetId: asset.id, asset });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  });
  const legacy = await loadProjectSnapshot('legacy-owner', project.id);
  assert.equal(legacy.project.title, 'legacy draft');
  assert.equal(legacy.revision, 'legacy-v1');
  assert.equal(await (await loadAssets('legacy-owner', project.id))[0].blob.text(), 'original legacy bytes');
  await assert.rejects(new Promise((resolve, reject) => {
    const request = indexedDB.open('bottopia-canvas-local', 1);
    request.onsuccess = () => { request.result.close(); resolve(); };
    request.onerror = () => reject(request.error);
  }), { name: 'VersionError' });
  const revision = await saveProject('legacy-owner', { ...legacy.project, title: 'upgraded draft' }, [], legacy.revision);
  assert.match(revision, /^[0-9a-f-]{36}$/);
  await assert.rejects(saveProject('legacy-owner', project, [], legacy.revision), CanvasSaveConflictError);
  assert.equal((await loadProjectSnapshot('legacy-owner', project.id)).revision, revision);
  assert.equal(await (await loadAssets('legacy-owner', project.id))[0].blob.text(), 'original legacy bytes');
});

test('same-timestamp stale tab cannot lose newer 7/3 graph or overwrite its blobs, delete it, or use another member revision', async () => {
  let project = createProject('two tabs');
  project.nodes = ['text', 'image', 'video', 'audio', 'script', 'image'].map((kind, index) => createNode(kind, index * 400, 0));
  project = connectNodes(connectNodes(project, project.nodes[0].id, project.nodes[1].id), project.nodes[1].id, project.nodes[2].id);
  const timestamp = project.updatedAt;
  const first = await saveProject('cas-owner', project);
  const [tabA, tabB] = await Promise.all([loadProjectSnapshot('cas-owner', project.id), loadProjectSnapshot('cas-owner', project.id)]);
  const asset = media('new-ref', 'original winner bytes');
  const ref = { ...createNode('image', -400, 0), assetIds: [asset.id], selectedAssetId: asset.id };
  const winner = { ...connectNodes({ ...tabA.project, nodes: [...tabA.project.nodes, ref] }, ref.id, project.nodes[1].id), updatedAt: timestamp };
  const nextRevision = await saveProject('cas-owner', winner, [asset], tabA.revision);
  assert.notEqual(first, nextRevision);
  const stale = { ...tabB.project, viewport: { ...tabB.project.viewport, x: 100 }, updatedAt: timestamp };
  await assert.rejects(saveProject('cas-owner', stale, [media(asset.id, 'attempted replacement'), media('loser-only', 'must roll back')], tabB.revision), CanvasSaveConflictError);
  for (const title of ['stale queued one', 'stale queued two', 'stale queued three']) {
    await assert.rejects(saveProject('cas-owner', { ...stale, title }, [media('queued-loser', title)], tabB.revision), CanvasSaveConflictError);
  }
  await assert.rejects(saveProject('cas-owner', stale, [], null), CanvasSaveConflictError);
  await assert.rejects(deleteProject('cas-owner', project.id, tabB.revision), CanvasSaveConflictError);
  const otherRevision = await saveProject('other-cas-owner', { ...project, title: 'other member' });
  await assert.rejects(saveProject('other-cas-owner', winner, [asset], nextRevision), CanvasSaveConflictError);
  assert.equal((await loadProjectSnapshot('other-cas-owner', project.id)).revision, otherRevision);
  const restored = await loadProjectSnapshot('cas-owner', project.id);
  assert.equal(restored.revision, nextRevision);
  assert.equal(restored.project.updatedAt, timestamp);
  assert.equal(restored.project.nodes.length, 7); assert.equal(restored.project.edges.length, 3);
  const [savedAsset] = await loadAssets('cas-owner', project.id);
  assert.equal(savedAsset.id, asset.id); assert.equal(await savedAsset.blob.text(), 'original winner bytes');
  await deleteProject('cas-owner', project.id, nextRevision);
  assert.equal(await loadProjectSnapshot('cas-owner', project.id), null);
  assert.deepEqual(await loadAssets('cas-owner', project.id), []);
});

test('concurrent writers have one winner and queued normal writes advance only committed revisions', async () => {
  const project = createProject('queued writes');
  let revision = await saveProject('queue-owner', project);
  const writes = await Promise.allSettled([
    saveProject('queue-owner', { ...project, title: 'A' }, [], revision),
    saveProject('queue-owner', { ...project, title: 'B' }, [], revision),
  ]);
  assert.equal(writes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(writes.filter(result => result.status === 'rejected' && result.reason instanceof CanvasSaveConflictError).length, 1);
  revision = (await loadProjectSnapshot('queue-owner', project.id)).revision;
  let queue = Promise.resolve();
  const revisions = new Set([revision]);
  for (const title of ['queued one', 'queued two', 'queued three']) queue = queue.then(async () => {
    const committed = await saveProject('queue-owner', { ...project, title }, [], revision);
    assert.ok(!revisions.has(committed)); revisions.add(committed); revision = committed;
  });
  await queue;
  assert.equal((await loadProjectSnapshot('queue-owner', project.id)).revision, revision);
  assert.equal((await loadProject('queue-owner', project.id)).title, 'queued three');
  await assert.rejects(saveProject('queue-owner', project), CanvasSaveConflictError);
});

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
  await deleteProject('owner-a', sharedId, (await loadProjectSnapshot('owner-a', sharedId)).revision);
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
  const revision = await saveProject('quota-owner', project);
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) {
    if (this.name === 'assets' && args[0].assetId === 'too-large') throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    return put.apply(this, args);
  };
  try {
    await assert.rejects(saveProject('quota-owner', { ...project, title: '저장 실패본' }, [media('first-asset', 'first'), media('too-large', 'second')], revision), { name: 'QuotaExceededError' });
  } finally { IDBObjectStore.prototype.put = put; }
  assert.equal((await loadProject('quota-owner', project.id)).title, '이전 저장본');
  assert.equal((await loadProjectSnapshot('quota-owner', project.id)).revision, revision);
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
