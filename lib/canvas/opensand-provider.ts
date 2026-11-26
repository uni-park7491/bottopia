import type { ProviderInput, ProviderJob, ProviderResult } from './types.ts';
import { CanvasProviderError } from './kie-provider.ts';

// The public model table lists doubao-seedance-2-5-260628 and lower PAYG
// prices, but its domestic create schema explicitly names 2.0. Do not infer
// that the upstream 2.5 multimodal schema is accepted by this gateway.
// Source: https://opensand.ai/manual/video-generation/video-doubao-seedance
export const OPENSAND_CONFIGURATION_NOTE = 'OpenSand 씨댄스 2.5 요청 규격 확인을 기다리고 있습니다. 자동 대체 없이 유료 생성을 막아 두었습니다.';
export const OPENSAND_ROUTE_VERIFIED = false;

function pending(): never {
  throw new CanvasProviderError('provider_contract_pending', 503, OPENSAND_CONFIGURATION_NOTE);
}

export async function submitOpenSand(_input: ProviderInput, _key: string, _fetcher: typeof fetch = fetch): Promise<ProviderJob> {
  // Deliberately performs no network call, even when a key and billing flag exist.
  void _input; void _key; void _fetcher;
  return pending();
}

export async function pollOpenSand(_taskId: string, _key: string, _fetcher: typeof fetch = fetch): Promise<ProviderResult> {
  void _taskId; void _key; void _fetcher;
  return pending();
}
