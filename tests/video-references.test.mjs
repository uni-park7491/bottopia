import test from 'node:test';
import assert from 'node:assert/strict';
import {workGenres,matchesVideoFilters,genreLabel} from '../lib/work-genres.ts';
import {videoReferences,latestReferences} from '../lib/video-references.ts';
import {filterWorks} from '../lib/feed-policy.ts';
test('reference records retain source attribution, version and evidence',()=>{
  assert.equal(new Set(videoReferences.map(v=>v.id)).size,videoReferences.length);
  for(const v of videoReferences){assert.equal(new URL(v.sourceUrl).protocol,'https:');assert.ok(v.author&&v.model&&v.evidence&&v.prompt);assert.ok([15,30].includes(v.durationSeconds));assert.ok(workGenres.some(g=>g[0]===v.category));}
  assert.ok(videoReferences.some(v=>v.region==='국내'));assert.ok(videoReferences.some(v=>v.region==='해외'));
});
test('reference dates are newest first; unknown dates last, without mutating inputs',()=>{
  const before=[...videoReferences];const sorted=latestReferences(videoReferences);
  assert.equal(sorted[0].publishedAt,'2026-10-08');assert.equal(sorted.at(-1).publishedAt,null);assert.deepEqual(videoReferences,before);
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
