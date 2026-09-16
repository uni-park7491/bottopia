import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFacts, parseDirectedStory, renderDirectedStory, parseReview } from '../lib/story-director.ts';
const topic = '지우가 민수에게 우산을 빌려준다. 다음 날 민수가 우산을 돌려준다.';
const events = [
  { source:'지우가 민수에게 우산을 빌려준다.', actor:'지우', action:'우산을 빌려준다', recipient:'민수' },
  { source:'다음 날 민수가 우산을 돌려준다.', actor:'민수', action:'우산을 돌려준다', recipient:'지우' },
];
const facts = parseFacts(JSON.stringify({ events }), topic);
const value = { title:'우산',logline:'우산을 빌리고 돌려주는 이야기',beats:[{text:'비가 내린다.',facts:[]},{text:'지우가 민수에게 우산을 빌려준다.',facts:[1]},{text:'다음 날 민수가 우산을 돌려준다.',facts:[2]},{text:'두 사람이 웃는다.',facts:[]}] };
test('structured extraction retains literal source provenance and assigns its own IDs', () => {
  assert.deepEqual(facts.map(item=>item.id), [1,2]);
  assert.throws(()=>parseFacts(JSON.stringify({events:[{...events[0],source:'로봇이 달린다.'}]}),topic), /원문에 없는/);
  assert.throws(()=>parseFacts('{"events":[]}',topic));
  assert.throws(()=>parseFacts('null',topic));
});
test('directed story requires chronological exact-once fact coverage and four beats', () => {
  const valid = parseDirectedStory(JSON.stringify(value),facts);
  assert.match(renderDirectedStory(valid), /\[기\]\n비가 내린다/);
  for (const mutate of [v=>v.beats.pop(),v=>v.beats[2].facts=[],v=>v.beats[2].facts=[1,2],v=>{v.beats[1].facts=[2];v.beats[2].facts=[1];},v=>v.beats[0].text='',v=>v.beats[0].facts=[99]]) {
    const input = structuredClone(value); mutate(input); assert.throws(()=>parseDirectedStory(JSON.stringify(input),facts));
  }
});
test('coverage checks are not represented as a semantic truth verifier', () => {
  // Linked ID can accompany wrong prose: this MUST still need semantic review.
  const contradicted = structuredClone(value); contradicted.beats[1].text='민수가 지우에게 우산을 빌려준다.';
  assert.equal(parseDirectedStory(JSON.stringify(contradicted),facts).beats[1].text,contradicted.beats[1].text);
});
test('review issues require real source and candidate quotes, not invented evidence', () => {
  const draft='민수가 지우에게 우산을 빌려준다.';
  const issue={source:events[0].source,candidate:draft,correction:'빌려주는 사람은 지우이다.'};
  assert.equal(parseReview(JSON.stringify({issues:[issue]}),topic,draft).length,1);
  assert.throws(()=>parseReview(JSON.stringify({issues:[{...issue,candidate:'없는 문장'}]}),topic,draft));
  assert.throws(()=>parseReview(JSON.stringify({issues:[{...issue,source:'없는 원문'}]}),topic,draft));
  assert.deepEqual(parseReview('{"issues":[]}',topic,draft),[]);
});
