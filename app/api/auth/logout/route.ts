import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const adminId = request.cookies.get('admin_token')?.value;
    await clearAuthCookies();

    logger.info('User logged out', {
      adminId: adminId ? 'session' : 'unknown',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
