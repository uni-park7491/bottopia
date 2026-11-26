import type { CanvasModel, MediaKind } from './types.ts';

const CHECKED_AT = '2026-11-26';
const SEEDREAM_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'];

// Public catalog only. Provider credentials belong to the authenticated server routes.
export const MODELS: CanvasModel[] = [
  {
    id: 'seedream-5-pro', label: '씨드림 프로 5.0', kind: 'image', providerId: 'kie', providerLabel: 'Kie',
    resolutions: ['1K', '2K'], aspectRatios: [...SEEDREAM_RATIOS], maxImages: 10, maxVideos: 0, maxAudios: 0,
    priceNote: '1K $0.035 · 2K $0.07. 첫 참조 무료, 추가 참조당 $0.0025. Kie 표준 크레딧 요금.',
    pricingSource: 'https://kie.ai/seedream-5-0-pro', checkedAt: CHECKED_AT,
  },
  {
    id: 'seedream-5-5', label: '씨드림 5.5', kind: 'image', providerId: 'kie', providerLabel: 'Kie',
    resolutions: ['1K', '1.5K', '2K'], aspectRatios: [...SEEDREAM_RATIOS, 'auto'], maxImages: 10, maxVideos: 0, maxAudios: 0,
    priceNote: '1K·1.5K $0.018 · 2K $0.0315. 첫 참조부터 이미지당 $0.0072.',
    pricingSource: 'https://kie.ai/seedream-5-5?model=seedream%2F5-5-image-to-image', checkedAt: CHECKED_AT,
  },
  {
    id: 'nano-banana-2-1', label: '나노바나나 2.1', kind: 'image', providerId: 'kie', providerLabel: 'Kie',
    resolutions: ['1K', '2K', '4K'],
    aspectRatios: ['auto', '1:1', '2:3', '3:2', '1:4', '4:1', '3:4', '4:3', '4:5', '5:4', '1:8', '8:1', '9:16', '16:9', '21:9'],
    maxImages: 10, maxVideos: 0, maxAudios: 0,
    priceNote: '1K $0.02 · 2K $0.03 · 4K $0.045. Kie 가격표에 별도 참조 요금은 표시되지 않음.',
    pricingSource: 'https://kie.ai/nano-banana-2-1', checkedAt: CHECKED_AT,
  },
  {
    id: 'seedance-2-5', label: '시댄스 2.5', kind: 'video', providerId: 'opensand', providerLabel: 'OpenSand Standard',
    // 480p exists upstream but its rate is unverified, so it is not offered here.
    resolutions: ['720p', '1080p'], aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', 'adaptive'],
    minDuration: 4, maxDuration: 30, maxImages: 2, maxVideos: 0, maxAudios: 0,
    priceNote: '16:9·24fps 예상: 720p 약 $0.1872/초 · 1080p 약 $0.4606/초. 정확한 2.5 요청 규격·계정·지역 이용 가능 여부 확인 중.',
    pricingSource: 'https://opensand.ai/pricing', checkedAt: CHECKED_AT,
    configurationNote: 'OpenSand 씨댄스2.5 요청 규격 확인을 기다리고 있습니다. 자동 대체 없이 유료 생성을 막아 두었습니다. 참조 제한은 임시 화면 설정이며 확인된 2.5 API 기능을 뜻하지 않습니다.',
  },
];

export function getCanvasModel(id: string, providerId?: string): CanvasModel | undefined {
  const model = MODELS.find(model => model.id === id);
  if (!model || !providerId || model.providerId === providerId) return model;
  if (id !== 'seedance-2-5' || providerId !== 'beat') return undefined;
  return {
    ...model, providerId: 'beat', providerLabel: 'Beat Standard', maxImages: 30, maxVideos: 10, maxAudios: 10,
    configurationNote: undefined,
    priceNote: '잠정 예상: 영상 참조 없음 720p $0.194/초·1080p $0.481/초. 영상 참조 시 입력+출력 길이로 계산하며 실제 청구는 달라질 수 있음.',
    pricingSource: 'https://docs.beatapi.io/api-reference/video-api/seedance-2-5',
  };
}

type EstimateInput = {
  modelId: string;
  resolution: string;
  durationSeconds?: number;
  references: readonly { kind: MediaKind; durationSeconds?: number }[];
  providerId?: string;
};

export type GenerationCost = { amount: number | null; currency: 'USD'; approximate: boolean; note: string };

export function estimateGenerationCost(input: EstimateInput, providerId?: string): GenerationCost {
  if (providerId && input.providerId && providerId !== input.providerId) throw new Error('제공자 설정이 일치하지 않습니다.');
  const model = getCanvasModel(input.modelId, providerId ?? input.providerId);
  if (!model) throw new Error('지원하지 않는 모델입니다.');
  if (!model.resolutions.includes(input.resolution)) throw new Error('지원하지 않는 해상도입니다.');
  if (!Array.isArray(input.references)) throw new Error('참조 목록을 확인해주세요.');
  const references: EstimateInput['references'] = input.references;
  const counts = { image: 0, video: 0, audio: 0 };
  for (const reference of references) {
    if (!reference || !Object.hasOwn(counts, reference.kind)) throw new Error('지원하지 않는 참조 형식입니다.');
    counts[reference.kind]++;
  }
  if (counts.image > model.maxImages || counts.video > model.maxVideos || counts.audio > model.maxAudios || input.references.length > 50) {
    throw new Error('모델의 참조 개수 제한을 초과했습니다.');
  }

  const finish = (amount: number | null, approximate: boolean, note: string): GenerationCost => ({
    amount: amount === null ? null : Math.round(amount * 1_000_000) / 1_000_000, currency: 'USD', approximate, note,
  });
  const imageCount = counts.image;
  const priceContext = `${CHECKED_AT} Kie 표준 크레딧 사용료 기준. 충전 보너스·세금·환전 수수료는 반영하지 않았습니다.`;
  if (model.id === 'seedream-5-pro') {
    const output = input.resolution === '1K' ? 0.035 : 0.07;
    const note = imageCount >= 5
      ? ' 참조가 많으면 다른 제공자의 고정 출력 요금이 더 낮을 수 있습니다.' : '';
    return finish(output + Math.max(0, imageCount - 1) * 0.0025, false, `${priceContext} 첫 참조 무료, 추가 참조당 $0.0025.${note}`);
  }
  if (model.id === 'seedream-5-5') {
    return finish((input.resolution === '2K' ? 0.0315 : 0.018) + imageCount * 0.0072, false,
      `${priceContext} 모든 참조 이미지에 각각 $0.0072가 포함됩니다.`);
  }
  if (model.id === 'nano-banana-2-1') {
    const output = { '1K': 0.02, '2K': 0.03, '4K': 0.045 }[input.resolution as '1K' | '2K' | '4K'];
    return finish(output, false, `${priceContext} 별도 참조 요금은 현재 가격표에 표시되지 않았습니다.`);
  }

  const duration = input.durationSeconds;
  if (!Number.isInteger(duration) || duration! < 4 || duration! > 30) throw new Error('영상 길이는 4~30초의 정수로 입력해주세요.');
  const durationTotals = { video: 0, audio: 0 };
  for (const reference of references) {
    if (reference.kind === 'image') continue;
    if (typeof reference.durationSeconds !== 'number' || !Number.isFinite(reference.durationSeconds) || reference.durationSeconds <= 0) {
      throw new Error('영상·음성 참조의 길이를 확인해주세요.');
    }
    durationTotals[reference.kind] += reference.durationSeconds;
  }
  if (durationTotals.video > 30 || durationTotals.audio > 30) throw new Error('영상·음성 참조는 각각 합계 30초까지 사용할 수 있습니다.');
  const hasVideo = counts.video > 0;
  if (model.providerId === 'opensand') {
    if (hasVideo) return finish(null, true, `${CHECKED_AT} OpenSand 영상 참조의 공식 요율은 아직 확인되지 않았습니다.`);
    const tokensPerSecond = input.resolution === '1080p' ? 48_600 : 21_600;
    const pricePerMillion = input.resolution === '1080p' ? 9.477 : 8.667;
    return finish(tokensPerSecond * duration! * pricePerMillion / 1_000_000, true,
      `${CHECKED_AT} OpenSand 표준 종량제의 16:9·24fps 토큰 예상액입니다. 정확한 2.5 요청 규격·계정·지역 이용 가능 여부는 미확인입니다.`);
  }
  const rate = input.resolution === '1080p' ? (hasVideo ? 0.287 : 0.481) : (hasVideo ? 0.117 : 0.194);
  const billableSeconds = duration! + (hasVideo ? durationTotals.video : 0);
  return finish(rate * billableSeconds, true,
    `${CHECKED_AT} Beat Standard 잠정 예상액입니다. ${hasVideo ? '입력 영상과 출력 영상의 합산 길이' : '출력 영상 길이'} 기준이며 최소 청구 단위·실제 토큰 사용량에 따라 달라집니다.`);
}
