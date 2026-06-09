import { eq, and, gt } from "drizzle-orm";
import { getDb } from "../db/index.server";
import { users, sessions } from "../db/schema";

// ── Password hashing (Web Crypto API) ─────────────────────────────────────────

const PBKDF2_PARAMS = {
  name: "PBKDF2",
  hash: "SHA-256",
  iterations: 100_000,
} as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { ...PBKDF2_PARAMS, salt },
    keyMaterial,
    256,
  );
  const toHex = (buf: Uint8Array) =>
    Array.from(buf)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  return `${toHex(salt)}:${toHex(new Uint8Array(derived))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHex] = stored.split(":");
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { ...PBKDF2_PARAMS, salt },
    keyMaterial,
    256,
  );
  const candidateHex = Array.from(new Uint8Array(derived))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return candidateHex === expectedHex;
}

// ── Session cookies ───────────────────────────────────────────────────────────

export const SESSION_COOKIE_NAME = "session_id";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export function buildSessionCookie(token: string, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE}`,
    "Path=/",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`;
}

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

// ── Session DB helpers ────────────────────────────────────────────────────────

export async function createSession(userId: number): Promise<string> {
  const db = getDb();
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await db.insert(sessions).values({ id: token, userId, expiresAt });
  return token;
}

export async function getSessionUser(
  request: Request,
): Promise<{ id: number; email: string; role: string } | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  const db = getDb();
  const result = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
    .get();
  return result ?? null;
}

export async function deleteSession(request: Request): Promise<void> {
  const token = getSessionToken(request);
  if (!token) return;
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.id, token));
}

// ── Business logic ────────────────────────────────────────────────────────────

type RegisterResult =
  | { success: true; userId: number }
  | { success: false; error: string };

export async function registerUser(
  email: string,
  password: string,
): Promise<RegisterResult> {
  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (existing) return { success: false, error: "Email already registered" };

  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning({ id: users.id });
  return { success: true, userId: row.id };
}

type LoginResult =
  | { success: true; userId: number }
  | { success: false; error: string };

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResult> {
  const db = getDb();
  const user = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (!user || !user.passwordHash) return { success: false, error: "Invalid email or password" };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { success: false, error: "Invalid email or password" };

  return { success: true, userId: user.id };
}

type GoogleUserResult =
  | { success: true; userId: number }
  | { success: false; error: string };

export async function findOrCreateGoogleUser(
  googleId: string,
  email: string,
): Promise<GoogleUserResult> {
  const db = getDb();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.googleId, googleId))
    .get();
  if (existing) return { success: true, userId: existing.id };

  const byEmail = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (byEmail) {
    await db.update(users).set({ googleId }).where(eq(users.id, byEmail.id));
    return { success: true, userId: byEmail.id };
  }

  const [row] = await db
    .insert(users)
    .values({ email, googleId })
    .returning({ id: users.id });
  return { success: true, userId: row.id };
}
