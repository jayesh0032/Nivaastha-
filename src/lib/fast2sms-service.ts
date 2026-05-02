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
        route: 'otp',
        variables_values: String(otp),
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
    const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error(`[Fast2SMS] Error sending SMS to ${to}:`, errorDetails);
    return false;
  }
}
