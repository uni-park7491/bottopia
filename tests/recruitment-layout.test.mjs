import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('recruitment tabs stay before the shared filter/keyword row',()=>{
 const source=readFileSync(new URL('../app/components/RecruitmentBoard.tsx',import.meta.url),'utf8');
 assert.ok(source.indexOf('className="guild-tabs"')<source.indexOf('className="guild-tab-toolbar"'));
 assert.ok(source.indexOf('className="guild-tab-toolbar"')<source.indexOf('className="guild-tab-results"'));
 assert.match(source,/inert=\{view!=='posts'\}/);
 assert.match(source,/inert=\{view!=='alerts'\}/);
});
test('inactive toolbar keeps layout space without focus or pointer interaction',()=>{
 const css=readFileSync(new URL('../app/components/recruitment.css',import.meta.url),'utf8');
 assert.match(css,/\.guild-toolbar-slot\{grid-area:1\/1/);
 assert.match(css,/\[aria-hidden="true"\]\{visibility:hidden;pointer-events:none/);
 assert.match(css,/html:has\(\.guild\)\{scrollbar-gutter:stable\}/);
});
