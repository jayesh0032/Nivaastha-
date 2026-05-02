import axios from 'axios';

export async function sendFast2SMS(to: string, message: string): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    // If not configured, print to console as fallback (helpful for local dev)
    console.log('\n--- 📱 Fast2SMS Simulator ---');
    console.log(`To: ${to}`);
    console.log(`Message: ${message}`);
    console.log('---------------------------\n');
    return true; // Pretend it succeeded
  }

  try {
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'v3',
        sender_id: 'TXTIND', // Default general sender ID
        message: message,
        language: 'english',
        flash: 0,
        numbers: to,
      },
      {
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.return === true) {
      console.log(`[Fast2SMS] SMS sent successfully to ${to}.`);
      return true;
    } else {
      console.error(`[Fast2SMS] Failed to send SMS to ${to}:`, response.data);
      return false;
    }
  } catch (error: any) {
    console.error(`[Fast2SMS] Error sending SMS to ${to}:`, error.response?.data || error.message);
    return false;
  }
}
