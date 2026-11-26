export type CanvasKind = 'text' | 'image' | 'video' | 'audio' | 'script';
export type MediaKind = 'image' | 'video' | 'audio';
export type CanvasModelId = 'seedream-5-pro' | 'seedream-5-5' | 'nano-banana-2-1' | 'seedance-2-5';
export type JobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown';
export type CanvasJob = {
  receipt: string; receipts?: string[]; expectedCount?: number; submissionError?: string; assetKeys?: string[];
  state: JobState; startedAt: string; message?: string; pollAfterSeconds?: number;
};
export type CanvasNode = {
  id: string; kind: CanvasKind; x: number; y: number; title: string; text: string;
  modelId: CanvasModelId; aspectRatio: string; resolution: string; durationSeconds: number;
  generateAudio: boolean; count?: number; assetIds: string[]; selectedAssetId?: string; groupId?: string;
  job?: CanvasJob;
};
export type CanvasEdge = { id: string; source: string; target: string };
export type CanvasGroup = { id: string; title: string };
export type CanvasViewport = { x: number; y: number; zoom: number };
export type CanvasProject = {
  format: 'bottopia-canvas-v1'; id: string; title: string; nodes: CanvasNode[]; edges: CanvasEdge[];
  groups: CanvasGroup[]; viewport: CanvasViewport; updatedAt: string;
};
export type CanvasAsset = {
  id: string; kind: MediaKind; name: string; mime: string; bytes: number;
  width?: number; height?: number; durationSeconds?: number; remoteUrl?: string;
  jobReceipt?: string; outputIndex?: number; blob?: Blob;
};
export type CanvasInputReference = {
  kind: MediaKind; assetKey?: string; jobReceipt?: string; outputIndex?: number; durationSeconds?: number;
};
export type GenerationRequest = {
  operationId: string; modelId: CanvasModelId; prompt: string; aspectRatio: string; resolution: string;
  durationSeconds: number; generateAudio: boolean; references: CanvasInputReference[];
};
export type ResolvedReference = { kind: MediaKind; url: string; durationSeconds?: number };
export type ProviderInput = Omit<GenerationRequest, 'references'> & { references: ResolvedReference[] };
export type ProviderJob = { taskId: string; pollAfterSeconds: number };
export type ProviderResult = {
  state: JobState; outputs: { url: string; kind: MediaKind; mime?: string }[];
  message?: string; pollAfterSeconds?: number; actualCost?: { amount: number; currency: string };
};
export type CanvasModel = {
  id: CanvasModelId; label: string; kind: 'image' | 'video'; providerId: string; providerLabel: string;
  resolutions: string[]; aspectRatios: string[]; maxImages: number; maxVideos: number; maxAudios: number;
  minDuration?: number; maxDuration?: number; priceNote: string; pricingSource: string; checkedAt: string; configurationNote?: string;
};
export type ModelAvailability = CanvasModel & { connected: boolean; canGenerate: boolean };
