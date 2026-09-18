import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKeywords,parseRecruitment} from '../lib/recruitment.ts';
const valid={title:'단편 영화를 함께 만들어요',body:'단편 영상에 어울리는 음악을 함께 제작할 동료를 구하고 있습니다.',schedule:'10월 중',contact:'https://example.com/contact',tags:['음악'],compensation:'무보수 협업'};
test('recruitment requires complete bounded fields',()=>{assert.ok(parseRecruitment(valid));for(const patch of [{title:'a'},{body:'짧음'},{tags:[]},{schedule:''},{title:'a'.repeat(81)},{body:'a'.repeat(2001)},{compensation:'unknown'}])assert.equal(parseRecruitment({...valid,...patch}),null);});
test('contact links must be HTTPS without embedded credentials',()=>{for(const contact of ['javascript:alert(1)','http://example.com','https://user:pass@example.com','not a URL'])assert.equal(parseRecruitment({...valid,contact}),null);});
test('keywords normalize and deduplicate, empty list disables new alerts',()=>{assert.deepEqual(parseKeywords([' 음악 ','AI','ai']),['음악','ai']);assert.deepEqual(parseKeywords([]),[]);assert.equal(parseKeywords(['']),null);assert.equal(parseKeywords(['x'.repeat(25)]),null);assert.equal(parseKeywords(Array(9).fill('a')),null);assert.equal(parseKeywords('음악'),null);});
