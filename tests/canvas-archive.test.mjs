import test from 'node:test';
import assert from 'node:assert/strict';
import { makeArchive, readArchive } from '../app/tools/canvas/canvas-archive.ts';
import { createProject, createNode } from '../lib/canvas/graph.ts';

function fixture() {
  const project = createProject();
  const node = createNode('image', 0, 0);
  node.assetIds = ['asset']; node.selectedAssetId = 'asset';
  node.job = { receipt: 'secret-job-receipt', receipts: ['secret-job-receipt'], state: 'queued', startedAt: new Date().toISOString() };
  project.nodes = [node];
  return { project, assets: [{ id: 'asset', kind: 'image', name: 'a.png', mime: 'image/png', bytes: 4, blob: new Blob(['test'], { type: 'image/png' }), jobReceipt: 'secret-job-receipt', outputIndex: 0 }] };
}
test('archive roundtrip preserves actual media bytes and graph, strips job tokens and unused files', async () => {
  const { project, assets } = fixture();
  const archive = await makeArchive(project, [...assets, { ...assets[0], id: 'unused' }]);
  const text = await archive.text();
  assert.ok(!text.includes('secret-job-receipt'));
  assert.ok(!text.includes('unused'));
  const restored = await readArchive(new File([archive], 'project.json'));
  assert.equal(restored.project.nodes[0].job, undefined);
  assert.equal(restored.assets.length, 1);
  assert.equal(await restored.assets[0].blob.text(), 'test');
});
test('archive import rejects disguised media, duplicate ids and unsafe external addresses', async () => {
  const { project } = fixture();
  const base = { format: 'bottopia-canvas-archive-v1', project, assets: [] };
  const asset = { id: 'asset', kind: 'image', name: 'a', mime: 'image/png', data: btoa('x') };
  for (const assets of [[{ ...asset, mime: 'video/mp4' }], [asset, asset], ...['javascript:alert(1)','https://localhost/a','https://localhost./a','https://172.16.0.1/a','https://camera.local/a'].map(remoteUrl=>[{...asset,remoteUrl}])]) {
    await assert.rejects(readArchive(new File([JSON.stringify({ ...base, assets })], 'project.json')));
  }
});
