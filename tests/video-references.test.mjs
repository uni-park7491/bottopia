import test from 'node:test';
import assert from 'node:assert/strict';
import {workGenres,matchesVideoFilters,genreLabel} from '../lib/work-genres.ts';
import {videoReferences,latestReferences} from '../lib/video-references.ts';
import {filterWorks} from '../lib/feed-policy.ts';
import {readFileSync} from 'node:fs';
test('withdrawn reference examples are absent from both public data and homepage',()=>{
  assert.deepEqual(videoReferences,[]);
  const source=readFileSync(new URL('../app/components/CreatorArchive.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/VideoReferences|국내외 레퍼런스|Global references/);
});
test('reference dates are newest first; unknown dates last, without mutating inputs',()=>{
  const fixtures=[{publishedAt:null},{publishedAt:'2026-10-08'},{publishedAt:'2026-10-01'}];
  const before=[...fixtures];const sorted=latestReferences(fixtures);
  assert.equal(sorted[0].publishedAt,'2026-10-08');assert.equal(sorted.at(-1).publishedAt,null);assert.deepEqual(fixtures,before);
});
test('version-specific models and measured duration are filtered independently',()=>{
  const v={model:'Seedance 2.5',tool:'Seedance',durationSeconds:29.708};
  assert.ok(matchesVideoFilters(v,{model:'Seedance 2.5',duration:'30'}));
  assert.ok(!matchesVideoFilters(v,{model:'Seedance 2.0'}));assert.ok(!matchesVideoFilters(v,{duration:'15'}));
  assert.ok(!matchesVideoFilters({...v,durationSeconds:null},{duration:'30'}));
});
test('genre, model and length combine without changing legacy category metadata',()=>{
  const a={title:'Drama',summary:'',tool:'Kling',model:'Kling 3.0',category:'DRAMA',copies:0,createdAt:'2026-10-08',durationSeconds:15};
  const b={...a,category:'BL',model:'Seedance 2.5',durationSeconds:30};
  assert.deepEqual(filterWorks([b,a],'DRAMA','',false,'LATEST',{model:'Kling 3.0',duration:'15'}),[a]);
  assert.equal(genreLabel('BL'),'BL');assert.equal(genreLabel('ACTION'),'액션');
});
