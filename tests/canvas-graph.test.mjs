import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProject, createNode, connectNodes, removeNodes, duplicateNodes, groupNodes, ungroupNodes,
  collectInputs, parseProject, exportProject, screenToWorld, fitViewport, NODE_WIDTH, NODE_HEIGHT,
} from '../lib/canvas/graph.ts';

function fixture(...kinds) {
  return { ...createProject(), nodes: kinds.map((kind, index) => createNode(kind, 100 + index * 350, 100)) };
}

test('connections reject cycles, duplicate paths, missing nodes and incompatible media without mutation', () => {
  let project = fixture('image', 'image', 'video', 'audio', 'text');
  const [a, b, video, audio, text] = project.nodes;
  const original = structuredClone(project);
  project = connectNodes(project, a.id, b.id);
  assert.deepEqual(original.edges, []);
  assert.throws(() => connectNodes(project, b.id, a.id), /순환/);
  assert.throws(() => connectNodes(project, a.id, b.id), /이미/);
  assert.throws(() => connectNodes(project, a.id, a.id), /같은/);
  assert.throws(() => connectNodes(project, 'missing', b.id), /찾을/);
  assert.throws(() => connectNodes(project, audio.id, b.id), /종류/);
  assert.throws(() => connectNodes(project, video.id, b.id), /종류/);
  assert.throws(() => connectNodes(project, a.id, text.id), /종류/);
  assert.equal(connectNodes(project, audio.id, video.id).edges.length, 2);
  assert.equal(connectNodes(project, text.id, video.id).edges.length, 2);
  assert.equal(project.edges.length, 1);
});

test('generation inputs follow connection order, deduplicate ancestor text and keep direct active media references', () => {
  let project = fixture('text', 'script', 'image', 'image', 'video');
  const [text, script, firstImage, secondImage, video] = project.nodes;
  text.text = '공통 인물'; script.text = '두 번째 장면'; video.text = '카메라 이동';
  firstImage.assetIds = ['old-image', 'active-image']; firstImage.selectedAssetId = 'active-image';
  secondImage.assetIds = ['second-image'];
  project = connectNodes(project, text.id, firstImage.id);
  project = connectNodes(project, text.id, secondImage.id);
  project = connectNodes(project, firstImage.id, secondImage.id);
  project = connectNodes(project, script.id, video.id);
  project = connectNodes(project, secondImage.id, video.id);
  project = connectNodes(project, firstImage.id, video.id);
  assert.deepEqual(collectInputs(project, video.id), {
    prompt: '두 번째 장면\n\n공통 인물\n\n카메라 이동', assetIds: ['second-image', 'active-image'],
  });
  assert.deepEqual(collectInputs(project, secondImage.id), { prompt: '공통 인물', assetIds: ['active-image'] });
  // The image behind an intermediate result is not silently added as another video reference.
  const withoutDirectFirst = { ...project, edges: project.edges.filter(edge => !(edge.source === firstImage.id && edge.target === video.id)) };
  assert.deepEqual(collectInputs(withoutDirectFirst, video.id).assetIds, ['second-image']);
  text.text = 'x'.repeat(32_000);
  assert.throws(() => collectInputs(project, video.id), /32000/);
});

test('duplicate copies only selected internal edges, offsets coordinates and drops job ownership', () => {
  let project = fixture('text', 'image', 'video');
  const [text, image, video] = project.nodes;
  image.assetIds = ['result-image']; image.selectedAssetId = 'result-image';
  image.job = { receipt: 'private-receipt', state: 'running', startedAt: new Date().toISOString() };
  project = connectNodes(project, text.id, image.id);
  project = connectNodes(project, image.id, video.id);
  project = groupNodes(project, [text.id, image.id], '장면');
  const duplicate = duplicateNodes(project, [text.id, image.id]);
  const [copyText, copyImage] = duplicate.nodes.slice(3);
  assert.equal(copyImage.job, undefined);
  assert.equal(image.job.receipt, 'private-receipt');
  assert.equal(copyImage.x, image.x + 40); assert.equal(copyImage.y, image.y + 40);
  assert.notEqual(copyImage.id, image.id);
  assert.equal(copyImage.selectedAssetId, 'result-image');
  assert.equal(copyImage.groupId, copyText.groupId);
  assert.notEqual(copyImage.groupId, duplicate.nodes[0].groupId);
  assert.deepEqual(duplicate.edges.slice(2).map(({ source, target }) => [source, target]), [[copyText.id, copyImage.id]]);
  copyImage.assetIds.push('different');
  assert.deepEqual(image.assetIds, ['result-image']);
  const partial = duplicateNodes(project, [image.id]);
  assert.equal(partial.nodes.at(-1).groupId, undefined);
  assert.equal(partial.edges.length, project.edges.length);
});

test('deletion removes dangling connections and empty groups; ungrouping preserves nodes and edges', () => {
  let project = fixture('text', 'image', 'video');
  const [text, image, video] = project.nodes;
  project = connectNodes(project, text.id, image.id);
  project = connectNodes(project, image.id, video.id);
  project = groupNodes(project, [text.id, image.id]);
  const ungrouped = ungroupNodes(project, [image.id]);
  assert.equal(ungrouped.groups.length, 0);
  assert.ok(ungrouped.nodes.every(node => !node.groupId));
  assert.deepEqual(ungrouped.edges, project.edges);
  const removed = removeNodes(project, [text.id, image.id]);
  assert.deepEqual(removed.nodes.map(node => node.id), [video.id]);
  assert.deepEqual(removed.edges, []); assert.deepEqual(removed.groups, []);
  assert.equal(project.nodes.length, 3);
});

test('portable imports cannot restore jobs or unknown secret fields and preserve valid graph order', () => {
  let project = fixture('text', 'image');
  project = connectNodes(project, project.nodes[0].id, project.nodes[1].id);
  project.nodes[0].text = '그림을 그려주세요';
  project.nodes[1].count = 3;
  project.nodes[1].job = { receipt: 'signed-token', state: 'succeeded', startedAt: new Date().toISOString() };
  const malicious = { ...project, apiKey: 'secret-key', assets: [{ jobReceipt: 'asset-secret' }] };
  malicious.nodes[1].providerApiKey = 'provider-secret';
  const restored = parseProject(JSON.stringify(malicious));
  assert.equal(restored.nodes[1].job, undefined);
  assert.equal(restored.nodes[1].providerApiKey, undefined);
  assert.equal(restored.apiKey, undefined); assert.equal(restored.assets, undefined);
  const exported = exportProject(malicious);
  for (const secret of ['signed-token', 'secret-key', 'asset-secret', 'provider-secret']) assert.ok(!exported.includes(secret));
  assert.deepEqual(parseProject(exported), restored);
  assert.deepEqual(restored.edges, project.edges);
  assert.equal(restored.nodes[1].count, 3);
});

test('untrusted graph validates counts, coordinates, assets, kinds and edge integrity', () => {
  const project = fixture('image', 'image');
  for (const raw of ['bad', 'null', '{}', 'x'.repeat(4 * 1024 * 1024 + 1)]) assert.throws(() => parseProject(raw));
  const changes = [
    { nodes: Array.from({ length: 101 }, () => createNode('text', 0, 0)) },
    { nodes: [{ ...project.nodes[0], x: Infinity }] },
    { nodes: [{ ...project.nodes[0], kind: 'unknown' }] },
    { nodes: [{ ...project.nodes[0], text: 'x'.repeat(32_001) }] },
    { nodes: [{ ...project.nodes[0], selectedAssetId: 'missing' }] },
    { nodes: [project.nodes[0], project.nodes[0]] },
    { viewport: { x: 0, y: 0, zoom: 0 } },
    { edges: [{ id: 'edge-a', source: project.nodes[0].id, target: 'missing' }] },
    { edges: [
      { id: 'edge-a', source: project.nodes[0].id, target: project.nodes[1].id },
      { id: 'edge-b', source: project.nodes[1].id, target: project.nodes[0].id },
    ] },
  ];
  for (const change of changes) assert.throws(() => parseProject(JSON.stringify({ ...project, ...change })));
});

test('zoomed screen coordinates roundtrip and fitted node bounds remain visible', () => {
  const viewport = { x: 120, y: -45, zoom: 0.5 };
  const world = { x: -220, y: 430 };
  assert.deepEqual(screenToWorld({ x: world.x * viewport.zoom + viewport.x, y: world.y * viewport.zoom + viewport.y }, viewport), world);
  const project = fixture('text', 'image', 'video');
  project.nodes[0].x = -300; project.nodes[2].y = 500;
  const width = 1400, height = 900, fit = fitViewport(project, width, height);
  for (const node of project.nodes) {
    assert.ok(node.x * fit.zoom + fit.x >= 63.9);
    assert.ok(node.y * fit.zoom + fit.y >= 63.9);
    assert.ok((node.x + NODE_WIDTH) * fit.zoom + fit.x <= width - 63.9);
    assert.ok((node.y + NODE_HEIGHT) * fit.zoom + fit.y <= height - 63.9);
  }
  assert.ok(Number.isFinite(fitViewport(createProject(), 320, 400).zoom));
});
