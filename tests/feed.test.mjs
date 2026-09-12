import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterWorks } from '../lib/feed-policy.ts';
const work = { title: 'Robot', summary: 'A film', tool: 'Kling', model: '3', category: 'STORY', copies: 2, createdAt: '2026-09-01', workType: 'ORIGINAL', creator: { displayName: 'BOTTOPIA', handle: 'bot.topia', role: 'FOUNDING_CREATOR' } };
const community = { ...work, title: 'Collaboration', createdAt: '2026-09-02', copies: 10, creator: { displayName: 'Another creator', handle: 'member', role: 'CREATOR' } };
test('feed searches title, tools, and creator, ignoring case and whitespace', () => {
  for (const query of ['robot', ' KLING ', 'BOT.TOPIA']) assert.equal(filterWorks([work], 'ALL', query, false, 'LATEST').length, 1);
  assert.equal(filterWorks([work], 'ALL', 'missing', false, 'LATEST').length, 0);
});
test('original collection separates studio work from member work', () => {
  assert.deepEqual(filterWorks([work, community], 'ALL', '', true, 'LATEST'), [work]);
  assert.equal(filterWorks([work], 'CHARACTER', '', false, 'LATEST').length, 0);
});
test('feed sort and reset preserve the original data', () => {
  const data = [work, community];
  assert.equal(filterWorks(data, 'ALL', '', false, 'LATEST')[0], community);
  assert.equal(filterWorks(data, 'ALL', '', false, 'POPULAR')[0], community);
  assert.equal(data[0], work);
});
