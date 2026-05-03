/**
 * GET /api/ai/stream/:jobId — SSE until job ready/failed/expired (S6).
 */

import { NextRequest } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { flags } from '@/lib/featureFlags';

function sse(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  if (!flags.aiOcrV2) {
    return new Response(sse({ success: false, error: 'FEATURE_DISABLED', code: 'AI_OCR_V2' }), {
      status: 503,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    });
  }

  const token = request.cookies.get('admin_token')?.value;
  if (!token) {
    return new Response(sse({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    });
  }

  let adminId: string;
  try {
    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    adminId = actor.adminId;
  } catch {
    return new Response(sse({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    });
  }

  const { jobId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (let tick = 0; tick < 120; tick++) {
          const row = await withAdminContext(adminId, async (db) =>
            db.aIExtraction.findFirst({
              where: { id: jobId, adminId },
              select: {
                ocrProvider: true,
                ocrError: true,
                extractedData: true,
                expiresAt: true,
                status: true,
              },
            })
          );

          if (!row) {
            controller.enqueue(encoder.encode(sse({ done: true, notFound: true })));
            break;
          }

          if (new Date(row.expiresAt) < new Date()) {
            await withAdminContext(adminId, async (db) => {
              await db.aIExtraction.updateMany({
                where: { id: jobId, adminId, status: 'PENDING' },
                data: { status: 'EXPIRED' },
              });
            });
            controller.enqueue(encoder.encode(sse({ done: true, expired: true })));
            break;
          }

          const failed = Boolean(row.ocrError);
          const ready = Boolean(row.ocrProvider) && !failed;
          if (ready || failed) {
            controller.enqueue(
              encoder.encode(
                sse({
                  done: true,
                  jobStatus: failed ? 'failed' : 'ready',
                  provider: row.ocrProvider,
                  error: row.ocrError,
                  extracted: row.extractedData,
                })
              )
            );
            break;
          }

          controller.enqueue(encoder.encode(sse({ done: false, tick, jobStatus: 'pending' })));
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(sse({ done: true, error: String(e) }))
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';
