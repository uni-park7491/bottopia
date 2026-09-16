// Synthetic local test media only; no personal assets or external downloads.
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const folder=new URL('../artifacts/animatic-test/',import.meta.url);await mkdir(folder,{recursive:true});
await sharp({create:{width:1280,height:720,channels:3,background:'#684bdb'}}).png().toFile(new URL('purple.png',folder).pathname);
const rate=16000,seconds=2,frames=rate*seconds,data=Buffer.alloc(44+frames*2);
data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(frames*2,40);
for(let i=0;i<frames;i++)data.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*1200),44+i*2);
await writeFile(new URL('quiet-tone.wav',folder),data);
const story='[기]\n작은 로봇이 문 앞에서 기다린다. 퇴근 시간을 알리는 시계를 바라본다.\n[승]\n문을 열려던 로봇이 옆에 놓인 화분을 발견한다. 마른 흙을 확인하고 잠시 멈춘다.\n[전]\n로봇은 물 한 컵을 가져와 화분에 붓는다.\n[결]\n화분을 창가에 놓고 조용히 문을 닫는다.';
const current={topic:'콘티 검증용 로봇 이야기',tone:'따뜻한 코미디',runtimeInput:'15',clipInput:'15',story,feedback:'',shots:[{index:1,clip:1,start:0,duration:8,visual:'로봇이 시계를 보고 화분을 발견한다.',camera:'고정 와이드 샷',audio:'시계 소리'},{index:2,clip:1,start:8,duration:7,visual:'로봇이 화분에 물을 준 뒤 문을 닫는다.',camera:'손과 화분 클로즈업',audio:'물소리와 문 닫는 소리'}]};
await writeFile(new URL('project.json',folder),JSON.stringify({format:'bottopia-story-v1',current,versions:[]},null,2));
console.log(folder.pathname);
