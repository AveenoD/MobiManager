/**
 * BullMQ OCR worker (S6). Run: `npm run worker:ocr`
 * Requires: DATABASE_URL, REDIS_URL, GEMINI_API_KEY (for Gemini path), S3_* for downloads.
 */

import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { OCR_QUEUE_NAME, createBullmqConnection } from '../lib/queues';
import { processOcrJob } from '../lib/ocr/processExtractionJob';

const prisma = new PrismaClient();

async function main() {
  const connection = createBullmqConnection();

  const worker = new Worker<{ extractionId: string; adminId: string }>(
    OCR_QUEUE_NAME,
    async (job) => {
      const { extractionId, adminId } = job.data;
      await processOcrJob({ prisma, extractionId, adminId });
    },
    { connection, concurrency: 2 }
  );

  worker.on('failed', (job, err) => {
    console.error('[worker:ocr] job failed', job?.id, err);
  });

  worker.on('completed', (job) => {
    console.info('[worker:ocr] completed', job.id);
  });

  const shutdown = async () => {
    await worker.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.info('[worker:ocr] listening on queue', OCR_QUEUE_NAME);
}

main().catch((e) => {
  console.error('[worker:ocr] fatal', e);
  process.exit(1);
});
