import crypto from 'node:crypto';

// In-Memory Store
// In a real production system with multiple instances, use Redis instead.

interface OTPData {
  otpHash: string;
  expiresAt: number;
  attempts: number;
}

interface RateLimitData {
  count: number;
  resetAt: number;
}

const otpStore = new Map<string, OTPData>();
const rateLimitStore = new Map<string, RateLimitData>(); // key: IP or Phone
const cooldownStore = new Map<string, number>(); // key: Phone, value: allowed next request timestamp

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export function saveOtp(phoneNumber: string, otpHash: string, ttlMs: number) {
  otpStore.set(phoneNumber, {
    otpHash,
    expiresAt: Date.now() + ttlMs,
    attempts: 0,
  });
}

export function getOtpData(phoneNumber: string): OTPData | undefined {
  const data = otpStore.get(phoneNumber);
  if (!data) return undefined;
  
  if (Date.now() > data.expiresAt) {
    otpStore.delete(phoneNumber);
    return undefined;
  }
  
  return data;
}

export function incrementOtpAttempt(phoneNumber: string): number {
  const data = otpStore.get(phoneNumber);
  if (data) {
    data.attempts += 1;
    otpStore.set(phoneNumber, data);
    return data.attempts;
  }
  return 0;
}

export function clearOtp(phoneNumber: string) {
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
