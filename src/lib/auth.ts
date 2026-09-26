import { jwtVerify, SignJWT } from "jose";

/**
 * 관리자 인증: 환경변수 ADMIN_PASSWORD 하나로 로그인, 서명된 httpOnly 쿠키로 세션 유지.
 * (proxy.ts와 서버 액션에서 공용으로 쓰므로 next/headers에 의존하지 않는다)
 */

export const SESSION_COOKIE = "nl_admin";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12시간

const DEV_PASSWORD = "admin";
const DEV_SECRET = "dev-only-secret-change-me-dev-only-secret";

export function adminPassword(): string | null {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return process.env.NODE_ENV === "production" ? null : DEV_PASSWORD;
}

export function usingDevCredentials(): boolean {
  return !process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET;
}

function secretKey(): Uint8Array | null {
  const s = process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "production" ? null : DEV_SECRET);
  return s ? new TextEncoder().encode(s) : null;
}

export async function createSessionToken(): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("SESSION_SECRET 환경변수가 필요합니다.");
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const key = secretKey();
  if (!token || !key) return false;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/** 타이밍 공격을 피하는 문자열 비교 */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}
