import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { safeResourceUrl, githubRepository, normalizeResourceFeed, filterResources, resourceCategories } from '../lib/resource-library.ts';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const feed = JSON.parse(read('data/resources.json'));
const sourceItem = { id:'example-1', title:'테스트 스킬', cat:'에이전트·코딩', sub:'스킬·플러그인', url:'https://x.com/example/status/1', date:{d:'2026-10-20'}, html:'<script>doNotExecute()</script><a href="https://github.com/owner/repo/blob/main/README.md">source</a>' };

test('public snapshot contains every collected reference, dated and credited', () => {
  assert.equal(feed.items.length, 59);
  assert.equal(new Set(feed.items.map(item => item.id)).size, feed.items.length);
  assert.equal(feed.source, 'https://link-notes-nine.vercel.app/');
  assert.match(feed.importedAt, /^2026-10-20T/);
  for (const item of feed.items) {
    assert.ok(resourceCategories.includes(item.category));
    assert.ok(item.title && item.description && item.formats.length);
    assert.ok(safeResourceUrl(item.sourceUrl));
    assert.equal(new URL(item.noteUrl).origin, 'https://link-notes-nine.vercel.app');
    assert.equal(new URL(item.noteUrl).hash, '#' + item.id);
    assert.ok(!('html' in item) && !('post' in item) && !('snippets' in item));
  }
  assert.deepEqual(feed.items.map(item => item.publishedAt), [...feed.items].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).map(item=>item.publishedAt));
});

test('unsafe schemes, credentials and local destinations are not imported', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'https://user:secret@github.com/owner/repo', 'http://127.0.0.1/a', 'http://localhost', 'http://10.1.2.3/', 'http://169.254.169.254/']) assert.equal(safeResourceUrl(url), null, url);
  assert.equal(safeResourceUrl('https://github.com/owner/repo'), 'https://github.com/owner/repo');
});

test('GitHub references point to the actual observed repository, not documentation or lookalikes', () => {
  assert.equal(githubRepository('https://github.com/owner/repo/blob/main/README.md'), 'https://github.com/owner/repo');
  assert.equal(githubRepository('http://github.com/owner/repo.git'), 'https://github.com/owner/repo');
  assert.equal(githubRepository('https://github.com.evil.example/owner/repo'), null);
  assert.equal(githubRepository('https://github.com/owner/repo로'), null);
  assert.ok(feed.items.filter(item=>item.formats.includes('github')).length >= 4);
  assert.ok(feed.items.some(item=>item.repositories.includes('https://github.com/addyosmani/agent-skills')));
});

test('normalizer treats imported HTML as data and rejects duplicate or malformed records', () => {
  const normalized=normalizeResourceFeed({items:[sourceItem]}, '2026-10-20T00:00:00Z');
  assert.deepEqual(normalized.items[0].repositories, ['https://github.com/owner/repo']);
  assert.ok(!JSON.stringify(normalized).includes('<script>'));
  assert.ok(normalized.items[0].formats.includes('skill'));
  for(const raw of [null, {}, {items:[sourceItem,sourceItem]}, {items:[{...sourceItem,url:'javascript:bad()'}]}, {items:[{...sourceItem,id:'<script>'}]}]) assert.throws(()=>normalizeResourceFeed(raw));
});

test('topic, format and normalized text filters compose; empty input restores all', () => {
  assert.equal(filterResources(feed.items,'all','all','').length,59);
  for(const category of resourceCategories) assert.ok(filterResources(feed.items,category,'all','').every(item=>item.category===category));
  const github=filterResources(feed.items,'all','github','');
  assert.ok(github.length && github.every(item=>item.repositories.length));
  assert.ok(filterResources(feed.items,'agents','github','AGENT').length > 0);
  assert.equal(filterResources(feed.items,'all','all','no-such-resource-89234').length,0);
  assert.ok(filterResources(feed.items,'all','all','  ＧｉｔＨｕｂ  ').length > 0);
});

test('new sections are reachable on desktop and mobile, without shifting upload labels', () => {
  for(const file of ['app/components/SiteHeader.tsx','app/components/MobileApp.tsx']) {
    const ui=read(file); assert.match(ui,/href="\/resources"|'\/resources'/); assert.match(ui,/href="\/fun"|'\/fun'/);
  }
  const header=read('app/components/SiteHeader.tsx');
  assert.match(header,/labels\[locale\]\[7\]/);
  assert.match(read('app/mobile-app.css'),/min-width:761px\) and \(max-width:1279px/);
  for(const path of ['resources','fun','fun/saju']) assert.match(read(`app/${path}/page.tsx`),/metadata/);
  const ui=read('app/resources/ResourceLibrary.tsx');
  assert.match(ui,/aria-pressed=/); assert.match(ui,/role="status"/); assert.match(ui,/noopener noreferrer/);
  assert.match(ui,/select aria-label=\{t.format\}/);
  assert.doesNotMatch(ui,/dangerouslySetInnerHTML|useEffect|fetch\(/);
});

test('saju is an explicit external integration, loaded on demand with isolation and fallback', () => {
  const ui=read('app/fun/saju/SajuExperience.tsx');
  assert.match(ui,/https:\/\/saju-app-blush-three\.vercel\.app\//);
  assert.match(ui,/!started \?/); assert.match(ui,/setStarted\(true\)/);
  assert.match(ui,/sandbox="allow-scripts allow-same-origin/);
  assert.doesNotMatch(ui,/allow-top-navigation|allow-camera|allow-microphone|fetch\(|localStorage|sessionStorage/);
  assert.match(ui,/referrerPolicy="no-referrer"/); assert.match(ui,/title=\{t.heading\}/);
  assert.match(ui,/window.clearTimeout/); assert.match(ui,/target="_blank" rel="noopener noreferrer"/);
  assert.match(ui,/생년월일을 봇토피아 서버로 전송하거나 저장하지 않습니다/);
  assert.match(ui,/의료·투자·법률 판단을 대신하지 않습니다/);
});
