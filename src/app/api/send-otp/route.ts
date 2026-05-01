import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';
import { createHash, randomInt } from 'node:crypto';

export async function POST(request: Request) {
  try {
    const { mobileNumber } = await request.json();

    // Validate 10-digit Indian mobile number
    if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
      return NextResponse.json(
        { error: 'Invalid 10-digit Indian mobile number' },
        { status: 400 }
      );
    }

    // Generate secure random 6-digit OTP
    const otp = randomInt(100000, 999999).toString();
    
    // Hash OTP using SHA-256
    const otpHash = createHash('sha256').update(otp).digest('hex');

    const db = getFirestore();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store in Firestore
    await db.collection('otps').doc(mobileNumber).set({
      phoneNumber: mobileNumber,
      otpHash,
      createdAt: new Date(),
      expiresAt: expiresAt,
      attemptCount: 0,
    });

    // Send the OTP via an SMS API (placeholder function)
    const result = await sendSms(mobileNumber, otp);

    return NextResponse.json({ 
      message: result?.simulated ? 'OTP generated (SIMULATED)' : 'OTP sent successfully',
      simulated: result?.simulated || false
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

async function sendSms(phoneNumber: string, otp: string) {
  const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY;
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

  console.log(`[SMS] Attempting to send OTP to ${phoneNumber}`);

  if (FAST2SMS_KEY) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': FAST2SMS_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: phoneNumber
        })
      });
      const result = await response.json();
      if (response.ok && result.return === true) {
        console.log(`[SMS][Fast2SMS] OTP sent successfully to ${phoneNumber}`);
        return result;
      }
      console.error('[SMS][Fast2SMS] Failed:', result);
    } catch (error) {
      console.error('[SMS][Fast2SMS] Error:', error);
    }
  }

  if (TWILIO_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE) {
    try {
      const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: `+91${phoneNumber}`,
          From: TWILIO_PHONE,
          Body: `Your Nivaastha OTP is ${otp}. Valid for 5 minutes.`
        })
      });
      const result = await response.json();
      if (response.ok) {
        console.log(`[SMS][Twilio] OTP sent successfully to ${phoneNumber}`);
        return result;
      }
      console.error('[SMS][Twilio] Failed:', result);
    } catch (error) {
      console.error('[SMS][Twilio] Error:', error);
    }
  }
  
  // Fallback simulator for development
  console.log('--- SMS SIMULATOR (No API Keys Found) ---');
  console.log(`TO: ${phoneNumber}`);
  console.log(`MESSAGE: Your Nivaastha OTP is ${otp}. Valid for 5 minutes.`);
  console.log('------------------------------------------');
  
  if (process.env.NODE_ENV !== 'production') {
      return { simulated: true };
  }
  
  throw new Error('No SMS provider configured. Set FAST2SMS_API_KEY or TWILIO credentials in .env');
}
