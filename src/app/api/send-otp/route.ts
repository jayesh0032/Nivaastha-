import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { 
  hashOtp, 
  saveOtp, 
  isCooldownActive, 
  setCooldown, 
  getRemainingCooldown,
  checkRateLimit 
} from '@/lib/otp-store';
import { sendFast2SMS } from '@/lib/fast2sms-service';

// Configuration
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 requests per window
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

export async function POST(request: Request) {
  try {
    const { mobileNumber, phoneNumber } = await request.json();
    const phone = phoneNumber || mobileNumber;

    // 1. Input Validation
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Must be a 10-digit mobile number.' },
        { status: 400 }
      );
    }

    // 2. IP-based and Phone-based Rate Limiting (Spam Prevention)
    // In Next.js, IP can be accessed via headers (x-forwarded-for or x-real-ip)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown-ip';
    
    // Check IP rate limit
    if (!checkRateLimit(`ip_${ip}`, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Too many requests from this IP. Please try again later.' },
        { status: 429 }
      );
    }

    // Check Phone rate limit
    if (!checkRateLimit(`phone_${phone}`, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Too many OTP requests for this number. Please try again later.' },
        { status: 429 }
      );
    }

    // 3. Resend Cooldown Check
    if (isCooldownActive(phone)) {
      const waitTime = getRemainingCooldown(phone);
      return NextResponse.json(
        { error: `Please wait ${waitTime} seconds before requesting a new OTP.` },
        { status: 429 }
      );
    }

    // 4. Generate 6-Digit OTP securely
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // 5. Hash & Store OTP (Do NOT store plain text)
    const hashedOtp = hashOtp(otp);
    saveOtp(phone, hashedOtp, OTP_EXPIRY_MS);
    
    // 6. Set Resend Cooldown
    setCooldown(phone, RESEND_COOLDOWN_MS);

    // 7. Send OTP SMS via Fast2SMS
    const message = `Your Verification OTP is: ${otp}. It will expire in 5 minutes.`;
    const smsSent = await sendFast2SMS(phone, message);

    if (!smsSent) {
      return NextResponse.json(
        { error: 'Failed to send OTP via SMS. Provider error.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'OTP sent successfully',
      cooldown: 60
    }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/send-otp:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

