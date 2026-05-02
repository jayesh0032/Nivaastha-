import axios from 'axios';

export async function sendFast2SMS(to: string, otp: string): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    // If not configured, print to console as fallback (helpful for local dev)
    console.log('\n--- 📱 Fast2SMS Simulator ---');
    console.log(`To: ${to}`);
    console.log(`OTP: ${otp}`);
    console.log('---------------------------\n');
    return true; // Pretend it succeeded
  }

  try {
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'q',
        message: `Your Verification OTP is ${otp}. Valid for 5 minutes.`,
        language: 'english',
        flash: 0,
        numbers: String(to),
      },
      {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.return === true) {
      console.log(`[Fast2SMS] SMS sent successfully to ${to}.`);
      return true;
    } else {
      console.error(`[Fast2SMS] Failed to send SMS to ${to}:`, JSON.stringify(response.data));
      return false;
    }
  } catch (error: any) {
    const errorDetails = error.response?.data || {};
    console.error(`[Fast2SMS] Error sending SMS to ${to}:`, JSON.stringify(errorDetails) || error.message);
    
    // Fallback to simulator if Fast2SMS account is not verified or lacks funds (status 996, 999, etc)
    if (errorDetails.status_code === 999 || errorDetails.status_code === 996) {
      console.log('\n--- 📱 Fast2SMS Simulator (Fallback due to wallet/verification) ---');
      console.log(`To: ${to}`);
      console.log(`OTP: ${otp}`);
      console.log('--------------------------------------------------------------\n');
      return true; // Pretend it succeeded so development can continue
    }

    return false;
  }
}
