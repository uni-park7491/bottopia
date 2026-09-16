export type Scene = { id: string; subject: string; action: string; setting: string; camera: string; light: string; duration: number };
export const sceneFields = [['subject', '인물 / 피사체'], ['action', '행동 / 장면'], ['setting', '배경'], ['camera', '카메라 / 구도'], ['light', '조명 / 분위기']] as const;
export function newScene(id: string): Scene { return { id, subject: '', action: '', setting: '', camera: '', light: '', duration: 5 }; }
export function scenePrompt(scene: Scene, index: number): string {
  return [`SCENE ${String(index + 1).padStart(2, '0')} · ${scene.duration}s`, ...sceneFields.filter(([key]) => scene[key].trim()).map(([key, label]) => `${label}: ${scene[key].trim()}`)].join('\n');
}
export function sceneDocument(title: string, scenes: Scene[]): string { return [title.trim() || '제목 없는 씬 구성', ...scenes.map(scenePrompt)].join('\n\n'); }
export function parseSceneFile(value: unknown): { title: string; scenes: Scene[] } {
  if (!value || typeof value !== 'object') throw new Error('씬 빌더 작업 파일이 아닙니다.');
  const data = value as Record<string, unknown>;
  if (data.format !== 'bottopia-scenes-v1' || typeof data.title !== 'string' || data.title.length > 100 || !Array.isArray(data.scenes) || !data.scenes.length || data.scenes.length > 24) throw new Error('지원하지 않는 작업 파일입니다.');
  const scenes = data.scenes.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error('장면 데이터가 올바르지 않습니다.');
    const row = item as Record<string, unknown>;
    const scene = newScene(`loaded-${index}`);
    for (const [key] of sceneFields) {
      if (typeof row[key] !== 'string' || row[key].length > 800) throw new Error('장면 텍스트는 항목당 800자 이하여야 합니다.');
      scene[key] = row[key];
    }
    if (typeof row.duration !== 'number' || !Number.isInteger(row.duration) || row.duration < 1 || row.duration > 120) throw new Error('장면 길이는 1–120초여야 합니다.');
    scene.duration = row.duration;
    return scene;
  });
  return { title: data.title, scenes };
}
