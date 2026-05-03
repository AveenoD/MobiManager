/**
 * BullMQ queues — shared name + Redis connection options for workers and the web app.
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const OCR_QUEUE_NAME = 'ocr-extract';

/** BullMQ requires `maxRetriesPerRequest: null` on ioredis. */
export function createBullmqConnection(): Redis {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error('REDIS_URL is required for OCR queue');
  }
  return new Redis(url, { maxRetriesPerRequest: null });
}

let ocrQueue: Queue | null = null;

export function getOcrQueue(): Queue {
  if (!ocrQueue) {
    ocrQueue = new Queue(OCR_QUEUE_NAME, {
      connection: createBullmqConnection(),
    });
  }
  return ocrQueue;
}

export async function closeOcrQueue(): Promise<void> {
  if (ocrQueue) {
    await ocrQueue.close();
    ocrQueue = null;
  }
}
