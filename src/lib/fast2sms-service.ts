import axios from 'axios';

export async function sendFast2SMS(to: string, otp: string): Promise<{ success: boolean; simulated: boolean; error?: string }> {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey || apiKey === 'your_fast2sms_api_key_here') {
    console.log('\n--- 📱 Fast2SMS Simulator ---');
    console.log(`To: ${to}`);
    console.log(`OTP: ${otp}`);
    console.log('---------------------------\n');
    return { success: true, simulated: true };
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
      return { success: true, simulated: false };
    } else {
      console.error(`[Fast2SMS] Failed to send SMS to ${to}:`, JSON.stringify(response.data));
      
      const errorDetails = response.data || {};
      if (errorDetails.status_code === 999 || errorDetails.status_code === 996) {
        console.log('\n--- 📱 Fast2SMS Simulator (Fallback due to wallet/verification) ---');
        console.log(`To: ${to}`);
        console.log(`OTP: ${otp}`);
        console.log('--------------------------------------------------------------\n');
        return { success: true, simulated: true }; 
      }
      
      return { success: false, simulated: false, error: 'Provider returned false' };
    }
  } catch (error: any) {
    const errorDetails = error.response?.data || {};
    console.error(`[Fast2SMS] Error sending SMS to ${to}:`, JSON.stringify(errorDetails) || error.message);
    
    if (errorDetails.status_code === 999 || errorDetails.status_code === 996) {
      console.log('\n--- 📱 Fast2SMS Simulator (Fallback due to wallet/verification) ---');
      console.log(`To: ${to}`);
      console.log(`OTP: ${otp}`);
      console.log('--------------------------------------------------------------\n');
      return { success: true, simulated: true };
    }

    return { success: false, simulated: false, error: error.message };
  }
}
