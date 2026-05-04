import crypto from 'node:crypto';

// In-Memory Store
interface OTPData {
  otpHash: string;
  expiresAt: number;
  attempts: number;
}

interface RateLimitData {
  count: number;
  resetAt: number;
}

declare global {
  var _otpStore: Map<string, OTPData> | undefined;
  var _rateLimitStore: Map<string, RateLimitData> | undefined;
  var _cooldownStore: Map<string, number> | undefined;
}

const otpStore = global._otpStore || new Map<string, OTPData>();
if (process.env.NODE_ENV !== 'production') global._otpStore = otpStore;

const rateLimitStore = global._rateLimitStore || new Map<string, RateLimitData>();
if (process.env.NODE_ENV !== 'production') global._rateLimitStore = rateLimitStore;

const cooldownStore = global._cooldownStore || new Map<string, number>();
if (process.env.NODE_ENV !== 'production') global._cooldownStore = cooldownStore;

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export async function saveOtp(phoneNumber: string, otpHash: string, ttlMs: number) {
  otpStore.set(phoneNumber, {
    otpHash,
    expiresAt: Date.now() + ttlMs,
    attempts: 0
  });
}

export async function getOtpData(phoneNumber: string): Promise<{ otpHash: string; expiresAt: number; attempts: number; } | undefined> {
  const data = otpStore.get(phoneNumber);
  if (!data) return undefined;
  
  if (Date.now() > data.expiresAt) {
    otpStore.delete(phoneNumber);
    return undefined;
  }
  
  return {
    otpHash: data.otpHash,
    expiresAt: data.expiresAt,
    attempts: data.attempts
  };
}

export async function incrementOtpAttempt(phoneNumber: string): Promise<number> {
  const data = otpStore.get(phoneNumber);
  if (data) {
    data.attempts += 1;
    otpStore.set(phoneNumber, data);
    return data.attempts;
  }
  return 0;
}

export async function clearOtp(phoneNumber: string) {
  otpStore.delete(phoneNumber);
}

// 60-second cooldown
export function setCooldown(phoneNumber: string, cooldownMs: number) {
  cooldownStore.set(phoneNumber, Date.now() + cooldownMs);
}

export function isCooldownActive(phoneNumber: string): boolean {
  const nextAllowed = cooldownStore.get(phoneNumber);
  if (!nextAllowed) return false;
  
  if (Date.now() < nextAllowed) {
    return true;
  }
  
  cooldownStore.delete(phoneNumber);
  return false;
}

export function getRemainingCooldown(phoneNumber: string): number {
  const nextAllowed = cooldownStore.get(phoneNumber);
  if (!nextAllowed) return 0;
  
  const remaining = nextAllowed - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

// Simple Sliding Window Rate Limiting for Spam Abuse
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true; // Allowed
  }
  
  if (record.count >= maxRequests) {
    return false; // Blocked
  }
  
  record.count += 1;
  rateLimitStore.set(key, record);
  return true; // Allowed
}
