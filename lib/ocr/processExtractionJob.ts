/**
 * OCR job processor — shared by BullMQ worker (S6).
 * Gemini first; Tesseract.js fallback; Redis SHA cache; quota on success only (not cache hits).
 */

import type { PrismaClient } from '@prisma/client';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { extractJsonFromImage } from '../gemini';
import { getRedis } from '../redis';
import { getStorageConfigFromEnv, createS3Client, type StorageConfig } from '../storage';
import { ocrRedisCacheKey } from './cacheKey';
import { buildOcrPrompt, isOcrKind, type OcrKind } from './kinds';
import { redactAadhaarLike } from './redactLog';
import logger from '../logger';
import { withAdminContext } from '../db';
import { bookAiQuotaUnits } from '../services/aiQuota';
import Tesseract from 'tesseract.js';
import { fileTypeFromBuffer } from 'file-type';

const CACHE_TTL_SEC = 24 * 60 * 60;

type CachedPayload = { extractedData: unknown; ocrProvider: string };

async function downloadFromS3(cfg: StorageConfig, objectKey: string): Promise<{ buffer: Buffer; mime: string }> {
  const client = createS3Client(cfg);
  const out = await client.send(
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: objectKey,
    })
  );
  const bytes = await out.Body?.transformToByteArray();
  if (!bytes?.length) {
    throw new Error('empty S3 object');
  }
  const buffer = Buffer.from(bytes);
  const detected = await fileTypeFromBuffer(buffer);
  const mime = detected?.mime || out.ContentType || 'image/jpeg';
  return { buffer, mime };
}

async function runTesseractJson(buffer: Buffer): Promise<{ text: string }> {
  const {
    data: { text },
  } = await Tesseract.recognize(buffer, 'eng+hin', { logger: () => undefined });
  return { text: text.trim() };
}

export async function processOcrJob(opts: {
  prisma: PrismaClient;
  extractionId: string;
  adminId: string;
}): Promise<void> {
  const { prisma, extractionId, adminId } = opts;

  await withAdminContext(adminId, async (db) => {
    const row = await db.aIExtraction.findFirst({
      where: { id: extractionId, adminId },
      select: {
        id: true,
        objectKey: true,
        imageSha256: true,
        ocrKind: true,
        ocrProvider: true,
      },
    });

    if (!row?.objectKey || !row.imageSha256) {
      logger.warn('ocr job missing objectKey/sha', { extractionId, adminId });
      return;
    }

    const terminalProviders = new Set(['gemini', 'tesseract', 'cache']);
    if (row.ocrProvider && terminalProviders.has(row.ocrProvider)) {
      logger.info('ocr job skip already completed', { extractionId, provider: row.ocrProvider });
      return;
    }

    const sha = row.imageSha256.toLowerCase();
    const cacheKey = ocrRedisCacheKey(sha);
    const r = getRedis();

    if (r) {
      try {
        const cached = await r.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as CachedPayload;
          await db.aIExtraction.update({
            where: { id: extractionId },
            data: {
              extractedData: parsed.extractedData as object,
              ocrProvider: 'cache',
              ocrError: null,
            },
          });
          logger.info('ocr cache hit', {
            extractionId,
            adminId,
            sha: sha.slice(0, 8),
          });
          return;
        }
      } catch (e) {
        logger.warn('ocr redis read failed', { error: String(e) });
      }
    }

    const cfg = getStorageConfigFromEnv();
    if (!cfg) {
      await db.aIExtraction.update({
        where: { id: extractionId },
        data: {
          ocrError: 'S3 not configured',
          ocrProvider: null,
        },
      });
      return;
    }

    let buffer: Buffer;
    let mime: string;
    try {
      const d = await downloadFromS3(cfg, row.objectKey);
      buffer = d.buffer;
      mime = d.mime;
    } catch (e) {
      const msg = redactAadhaarLike(String(e));
      await db.aIExtraction.update({
        where: { id: extractionId },
        data: { ocrError: msg, ocrProvider: null },
      });
      logger.error('ocr s3 download failed', { extractionId, error: msg });
      return;
    }

    const kind: OcrKind = row.ocrKind && isOcrKind(row.ocrKind) ? row.ocrKind : 'generic';
    const prompt = buildOcrPrompt(kind);
    const base64 = buffer.toString('base64');

    let extractedJson: string;
    let provider: 'gemini' | 'tesseract';

    try {
      extractedJson = await extractJsonFromImage({ mimeType: mime, base64Data: base64, prompt });
      provider = 'gemini';
    } catch (geminiErr) {
      logger.warn('ocr gemini failed, tesseract fallback', {
        extractionId,
        message: redactAadhaarLike(String(geminiErr)),
      });
      try {
        const { text } = await runTesseractJson(buffer);
        extractedJson = JSON.stringify({
          rawText: text,
          confidence: { summary: 0.2 },
          provider: 'tesseract',
        });
        provider = 'tesseract';
      } catch (tesErr) {
        const msg = redactAadhaarLike(String(tesErr));
        await db.aIExtraction.update({
          where: { id: extractionId },
          data: { ocrError: msg, ocrProvider: null },
        });
        logger.error('ocr tesseract failed', { extractionId, error: msg });
        return;
      }
    }

    let extractedData: object;
    try {
      extractedData = JSON.parse(extractedJson) as object;
    } catch {
      extractedData = { raw: extractedJson };
    }

    const booked = await bookAiQuotaUnits(db as PrismaClient, adminId, 'OCR_EXTRACT', 1, {
      kind: 'ocr_v2',
      extractionId,
    });
    if (!booked.ok) {
      await db.aIExtraction.update({
        where: { id: extractionId },
        data: { ocrError: 'QUOTA_EXCEEDED', ocrProvider: null },
      });
      logger.warn('ocr quota exhausted at completion', { extractionId, adminId });
      return;
    }
    await db.aIExtraction.update({
      where: { id: extractionId },
      data: {
        extractedData,
        ocrProvider: provider,
        ocrError: null,
      },
    });

    if (r) {
      try {
        const payload: CachedPayload = { extractedData, ocrProvider: provider };
        await r.set(cacheKey, JSON.stringify(payload), 'EX', CACHE_TTL_SEC);
      } catch (e) {
        logger.warn('ocr redis set failed', { error: String(e) });
      }
    }

    logger.info('ocr job complete', {
      extractionId,
      adminId,
      provider,
      sha: sha.slice(0, 8),
    });
  });
}
