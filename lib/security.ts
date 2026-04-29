import { NextRequest, NextResponse } from 'next/server';
import { getAllowedOrigins } from './env';

// Security headers applied to all responses
export const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Request-ID': crypto.randomUUID(),
};

// Apply security headers to a response
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Get client IP from request
export function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return request.ip || 'unknown';
}

// CORS helpers
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Allow non-Origin requests (curl, etc.)
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

export function createCorsResponse(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const origin = request.headers.get('origin');

  if (isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return response;
}

export function handleCorsPreflight(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });

  if (isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  response.headers.set('Access-Control-Max-Age', '86400');

  return applySecurityHeaders(response);
}

// Helmet-like CSP configuration
export const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  connectSrc: ["'self'", "https://api.cloudinary.com"],
  fontSrc: ["'self'", "https://fonts.gstatic.com"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
  formAction: ["'self'"],
};

// Build CSP header string
export function buildCspHeader(): string {
  return Object.entries(cspDirectives)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');
}

// Apply CSP header
export function applyCspHeader(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy', buildCspHeader());
  return response;
}
