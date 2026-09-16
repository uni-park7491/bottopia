'use strict';
function parseProject(text) {
  if (typeof text !== 'string' || text.length > 500000) throw new Error('500KB 이하 작업 파일만 지원합니다.');
  const archive = JSON.parse(text);
  const project = archive && archive.current;
  if (!archive || archive.format !== 'bottopia-story-v1' || !project || !Array.isArray(project.shots) || project.shots.length < 1 || project.shots.length > 32) throw new Error('샷리스트가 포함된 봇토피아 작업 파일을 선택해주세요.');
  let end = 0;
  const shots = project.shots.map((shot, index) => {
    if (!shot || !Number.isInteger(shot.start) || shot.start !== end || !Number.isInteger(shot.duration) || shot.duration < 1 || shot.duration > 30) throw new Error('샷 시간 정보가 올바르지 않습니다.');
    end += shot.duration;
    if (end > 120) throw new Error('최대 120초까지 지원합니다.');
    for (const key of ['visual','camera','audio']) if (typeof shot[key] !== 'string' || !shot[key].trim() || shot[key].length > 500) throw new Error('샷 설명이 없거나 너무 깁니다.');
    return { index: index + 1, start: shot.start, duration: shot.duration, visual: shot.visual, camera: shot.camera, audio: shot.audio };
  });
  if (typeof project.topic !== 'string' || project.topic.length > 1200) throw new Error('작업 제목을 확인해주세요.');
  return { title: project.topic || '제목 없는 작업', shots, duration: end };
}
function wrap(text, columns = 44) {
  if (!Number.isInteger(columns) || columns < 1) throw new Error('Invalid line width');
  return text.split(/\r?\n/).map(line => {
    const points = Array.from(line); const lines = [];
    for (let i = 0; i < points.length; i += columns) lines.push(points.slice(i, i + columns).join(''));
    return lines.join('\r');
  }).join('\r');
}
function shotText(shot, columns = 44) {
  return [`SHOT ${shot.index}  |  ${shot.start}–${shot.start + shot.duration} SEC`, '', '화면', wrap(shot.visual, columns), '', '카메라', wrap(shot.camera, columns), '', '소리', wrap(shot.audio, columns)].join('\r');
}
module.exports = { parseProject, wrap, shotText };
