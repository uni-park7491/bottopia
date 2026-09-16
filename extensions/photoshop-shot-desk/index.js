'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Adobe UXP exposes host modules through CommonJS require, not web imports. */
const { storage } = require('uxp');
const { app, core, action, constants } = require('photoshop');
const { parseProject, shotText } = require('./project.js');
const { boardPages, fitImage, imageSize } = require('./board.js');
let project = null;
let busy = false;
let pages = [], images = new Map(), boardDocument = null;
const open = document.getElementById('open');
const select = document.getElementById('shots');
const create = document.getElementById('create');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const imageButton = document.getElementById('image'), imageName = document.getElementById('imageName'), removeImage = document.getElementById('removeImage');
const pageSelect = document.getElementById('pages'), boardButton = document.getElementById('board');
const savePsd = document.getElementById('savePsd'), savePng = document.getElementById('savePng');
function toggle(value) {
  busy = value; open.disabled = value;
  [select, create, imageButton, pageSelect, boardButton].forEach(button => { button.disabled = value || !project; });
  removeImage.disabled = value || !images.has(Number(select.value));
  savePsd.disabled = savePng.disabled = value || !boardDocument;
}
function show() {
  if (project) preview.value = shotText(project.shots[Number(select.value)]);
  const selected = images.get(Number(select.value));
  // File entries remain session-local and are never serialized or uploaded.
  imageName.textContent = selected ? `연결된 이미지: ${selected.name}` : '이미지 없음 · PNG/JPEG, 10MB·16메가픽셀 이하';
  toggle(busy);
}
select.addEventListener('change', show);
open.addEventListener('click', async () => {
  if (busy) return; toggle(true);
  try {
    const file = await storage.localFileSystem.getFileForOpening({ types: ['json'], allowMultiple: false });
    if (!file) return;
    const metadata = await file.getMetadata();
    if (metadata.size > 500000) throw new Error('500KB 이하 파일만 지원합니다.');
    const next = parseProject(await file.read());
    // Commit only after validation; malformed imports preserve the open project.
    project = next;
    images = new Map(); pages = boardPages(next);
    while (pageSelect.firstChild) pageSelect.removeChild(pageSelect.firstChild);
    pages.forEach((page, index) => { const option = document.createElement('option'); option.value = String(index); option.textContent = `${page.number} / ${pages.length} 페이지 · 샷 ${page.cards.map(card => card.shot.index).join(', ')}`; pageSelect.appendChild(option); });
    pageSelect.value = '0';
    while (select.firstChild) select.removeChild(select.firstChild);
    next.shots.forEach((shot, index) => { const option = document.createElement('option'); option.value = String(index); option.textContent = `샷 ${shot.index} · ${shot.start}–${shot.start + shot.duration}초`; select.appendChild(option); });
    select.value = '0'; show(); status.textContent = `${next.shots.length}개 샷 · 총 ${next.duration}초. 선택한 샷을 확인해주세요.`;
  } catch (error) { status.textContent = error.message || '파일을 읽지 못했습니다.'; }
  finally { toggle(false); }
});
imageButton.addEventListener('click', async () => {
  if (busy || !project) return; const index = Number(select.value); toggle(true);
  try {
    const file = await storage.localFileSystem.getFileForOpening({ types: ['png', 'jpg', 'jpeg'], allowMultiple: false });
    if (!file) return;
    if ((await file.getMetadata()).size > 10 * 1024 * 1024) throw new Error('10MB 이하 이미지를 선택해주세요.');
    imageSize(await file.read({ format: storage.formats.binary }));
    images.set(index, file); status.textContent = `샷 ${index + 1}에 이미지를 연결했습니다. 새 콘티 보드를 만들 때 반영됩니다.`;
  } catch (error) { status.textContent = error.message || '이미지를 읽지 못했습니다. 기존 연결은 유지됩니다.'; }
  finally { toggle(false); show(); }
});
removeImage.addEventListener('click', () => { if (!busy) { images.delete(Number(select.value)); show(); status.textContent = '연결만 해제했습니다. 원본 파일과 이미 만든 문서는 변경하지 않습니다.'; } });
boardButton.addEventListener('click', async () => {
  if (busy || !project) return;
  const page = pages[Number(pageSelect.value)]; if (!page) return;
  toggle(true); let created = null;
  try {
    await core.executeAsModal(async context => {
      created = await app.createDocument({ name: `BOTTOPIA Board ${page.number}`, width: page.width, height: page.height, resolution: 72, mode: constants.NewDocumentMode.RGB, fill: constants.DocumentFill.WHITE });
      if (!created) throw new Error('새 문서를 만들지 못했습니다.');
      await created.createTextLayer({ name: '작업 제목', contents: page.title, fontSize: 28, position: { x: 80, y: 60 } });
      for (const card of page.cards) {
        if (context.isCancelled) throw new Error('제작을 중단했습니다.');
        const layers = [];
        const file = images.get(card.shot.index - 1);
        if (file) {
          if ((await file.getMetadata()).size > 10 * 1024 * 1024) throw new Error('연결한 이미지가 10MB를 초과하도록 변경되었습니다.');
          imageSize(await file.read({ format: storage.formats.binary }));
          const token = storage.localFileSystem.createSessionToken(file);
          const result = await action.batchPlay([{ _obj: 'placeEvent', null: { _path: token, _kind: 'local' }, _options: { dialogOptions: 'dontDisplay' } }], {});
          if (result.some(item => item._obj === 'error')) throw new Error('참고 이미지 배치에 실패했습니다.');
          const layer = created.activeLayers[0]; if (!layer) throw new Error('배치한 이미지 레이어가 없습니다.');
          layer.name = `샷 ${card.shot.index} 참고 이미지`;
          const ratio = fitImage(layer.bounds, { width: 1000, height: 562 });
          await layer.scale(ratio, ratio);
          const b = layer.bounds;
          await layer.translate(card.x + (1000 - (b.right - b.left)) / 2 - b.left, card.y + (562 - (b.bottom - b.top)) / 2 - b.top);
          layers.push(layer);
        } else layers.push(await created.createTextLayer({ name: `샷 ${card.shot.index} 이미지 자리`, contents: `SHOT ${card.shot.index}\r참고 이미지 없음`, fontSize: 32, position: { x: card.x + 40, y: card.y + 180 } }));
        layers.push(await created.createTextLayer({ name: `샷 ${card.shot.index} 편집 가능한 설명`, contents: card.notes, fontSize: 22, position: { x: card.x, y: card.y + 610 } }));
        await created.createLayerGroup({ name: `SHOT ${card.shot.index} · ${card.shot.start}–${card.shot.start + card.shot.duration}초`, fromLayers: layers });
      }
    }, { commandName: 'BOTTOPIA 콘티 보드 만들기' });
    boardDocument = created; status.textContent = `${page.number}페이지 콘티를 만들었습니다. 샷별 이미지·텍스트를 편집하고 PSD 또는 PNG로 저장하세요. 다른 페이지는 위에서 선택해 만듭니다.`;
  } catch (error) { status.textContent = `${error.message || '콘티 제작 실패'}${created ? ' 미완성 새 문서는 검토하도록 열어 두었습니다. 저장 버튼은 이전에 완성한 보드를 대상으로 합니다.' : ''}`; }
  finally { toggle(false); }
});
async function saveBoard(type) {
  if (busy || !boardDocument) return; toggle(true);
  try {
    if (!Array.from(app.documents).some(doc => doc.id === boardDocument.id)) throw new Error('만든 콘티 보드를 닫았습니다. 다시 만든 뒤 저장해주세요.');
    const file = await storage.localFileSystem.getFileForSaving(`bottopia-board.${type}`, { types: [type] });
    if (!file) return;
    await core.executeAsModal(async () => { await boardDocument.saveAs[type](file, {}, type === 'png'); }, { commandName: 'BOTTOPIA 콘티 저장' });
    status.textContent = `${type.toUpperCase()} 저장 완료. 공개 업로드는 하지 않았습니다.`;
  } catch (error) { status.textContent = error.message || '저장하지 못했습니다.'; }
  finally { toggle(false); }
}
savePsd.addEventListener('click', () => saveBoard('psd'));
savePng.addEventListener('click', () => saveBoard('png'));
create.addEventListener('click', async () => {
  if (busy || !project) return;
  const shot = project.shots[Number(select.value)];
  if (!shot) return;
  toggle(true);
  let created = null;
  try {
    await core.executeAsModal(async () => {
      const contents = shotText(shot);
      // Fixed-width wrapping and bounded inputs keep all notes on a new canvas.
      const height = Math.max(900, contents.split('\r').length * 36 + 160);
      created = await app.createDocument({ name: `BOTTOPIA Shot ${shot.index}`, width: 1600, height, resolution: 72, mode: constants.NewDocumentMode.RGB, fill: constants.DocumentFill.WHITE });
      if (!created) throw new Error('새 문서를 만들지 못했습니다.');
      await created.createTextLayer({ name: `Shot ${shot.index} · editable notes`, contents, fontSize: 28, position: { x: 80, y: 80 } });
    }, { commandName: 'BOTTOPIA 제작 노트 만들기' });
    status.textContent = '새 제작 노트를 만들었습니다. Photoshop에서 글꼴·배치를 조정하고 PSD로 저장하세요.';
  } catch (error) { status.textContent = `${error.message || '문서를 만들지 못했습니다.'}${created ? ' 생성된 새 문서는 검토할 수 있도록 열어 두었습니다.' : ''}`; }
  finally { toggle(false); }
});
