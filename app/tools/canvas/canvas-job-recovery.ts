import type { CanvasJob } from '../../../lib/canvas/types.ts';

/** A confirmed receipt survives local-save failure, including a concurrent terminal poll. */
export function recoverRequestJob(current: CanvasJob | undefined, acceptedReceipt: string | null, fallback: CanvasJob): { job: CanvasJob; retained: boolean } {
  if (current?.receipt && (current.receipt === acceptedReceipt || !['succeeded', 'failed'].includes(current.state))) return { job: current, retained: true };
  return { job: fallback, retained: false };
}
