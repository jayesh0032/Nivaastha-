import { NextResponse } from 'next/server';
import { getFirestore, getAuth } from '@/lib/firebase-admin';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nivaastha-super-secret-key';

export async function POST(request: Request) {
  try {
    const { mobileNumber, otp } = await request.json();

    if (!mobileNumber || !otp) {
      return NextResponse.json(
        { error: 'Mobile number and OTP are required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const otpDocRef = db.collection('otps').doc(mobileNumber);
    const otpDoc = await otpDocRef.get();

    if (!otpDoc.exists) {
      return NextResponse.json(
        { error: 'OTP request not found. Please send OTP again.' },
        { status: 404 }
      );
    }

    const data = otpDoc.data()!;
    const now = new Date();

    // Block verification after 5 failed attempts
    if (data.attemptCount >= 5) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 403 }
      );
    }

    // Check if within expiry time
    if (now > data.expiresAt.toDate()) {
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash the incoming OTP to compare
    const incomingOtpHash = createHash('sha256').update(otp).digest('hex');

    if (incomingOtpHash === data.otpHash) {
      // Correct OTP
      // Authenticate user and generate JWT token valid for 7 days
      const token = jwt.sign(
        { mobileNumber: mobileNumber, sub: mobileNumber },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // PERFECT INTEGRATION: Generate a Firebase Custom Token
      const auth = getAuth();
      let firebaseToken = '';
      try {
        firebaseToken = await auth.createCustomToken(mobileNumber, {
          token_type: 'nivaastha_otp_auth',
          mobile: mobileNumber
        });
      } catch (authError) {
        console.error('Error creating Firebase custom token:', authError);
      }

      // Clear the OTP record after successful verification
      await otpDocRef.delete();

      return NextResponse.json({
        message: 'OTP verified successfully',
        token,
        firebaseToken, // Return both
        mobileNumber
      });
    } else {
      // Incorrect OTP, increment attempt count
      await otpDocRef.update({
        attemptCount: (data.attemptCount || 0) + 1
      });

      return NextResponse.json(
        { error: `Invalid OTP. Attempts left: ${5 - (data.attemptCount + 1)}` },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
