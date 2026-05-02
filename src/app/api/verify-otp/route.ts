import { NextResponse } from 'next/server';
import { hashOtp, getOtpData, incrementOtpAttempt, clearOtp } from '@/lib/otp-store';
import { generateJwtToken } from '@/lib/auth-service';

export async function POST(request: Request) {
  try {
    const { mobileNumber, phoneNumber, otp } = await request.json();
    const phone = phoneNumber || mobileNumber;

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    const otpRecord = await getOtpData(phone);

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'OTP expired or not found. Please request a new one.' },
        { status: 400 }
      );
    }

    if (otpRecord.attempts >= 3) {
      await clearOtp(phone);
      return NextResponse.json(
        { error: 'Too many blocked attempts. Please request a new OTP.' },
        { status: 403 }
      );
    }

    const hashedIncomingOtp = hashOtp(String(otp).trim());

    if (hashedIncomingOtp !== otpRecord.otpHash) {
      // Failed attempt
      console.error(`[Verify OTP] Mismatch! Received: '${otp}', Expected Hash: '${otpRecord.otpHash}', Got Hash: '${hashedIncomingOtp}'`);
      const attempts = await incrementOtpAttempt(phone);
      return NextResponse.json(
        { error: `Invalid OTP. Attempts left: ${3 - attempts}` },
        { status: 401 }
      );
    }

    // Success
    await clearOtp(phone); // remove OTP from store
    
    // Generate JWT
    let token;
    try {
      token = generateJwtToken(phone);
    } catch (err: any) {
       console.error("JWT Error:", err);
       return NextResponse.json({ error: "Internal Configuration Error" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'OTP verified successfully',
      token
    }, { status: 200 });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

