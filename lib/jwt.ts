import * as jose from 'jose';

export async function jwtSign(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn = '7d'
): Promise<string> {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);

  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function jwtVerify(token: string, secret: string) {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);

  const { payload } = await jose.jwtVerify(token, key);
  return { payload };
}

export function extractTokenFromCookie(cookieString: string, tokenName: string): string | null {
  const cookies = cookieString.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === tokenName) {
      return value;
    }
  }
  return null;
}