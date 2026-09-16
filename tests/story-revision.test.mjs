import {test} from 'node:test';
import assert from 'node:assert/strict';
import {revisionDiff} from '../lib/story-revision.ts';
test('revision diff reconstructs both drafts including repeated lines',()=>{
  for(const [before,after] of [['기\n승\n전\n결','기\n승\n선택\n결'],['같은 말\n같은 말','같은 말'],['','새 문장'],['<script>','<img>']]) {
    const diff=revisionDiff(before,after);
    assert.equal(diff.filter(l=>l.kind!=='added').map(l=>l.text).join('\n'),before);
    assert.equal(diff.filter(l=>l.kind!=='removed').map(l=>l.text).join('\n'),after);
  }
});
test('revision diff bounds pathological input',()=>{
  assert.throws(()=>revisionDiff('x'.repeat(2401),''));
  assert.equal(revisionDiff('\n'.repeat(201),'x').length,2);
});
