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
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: String(otp),
        numbers: String(to),
      })
    });

    const data = await response.json().catch(() => ({}));

    if (data.return === true) {
      console.log(`[Fast2SMS] SMS sent successfully to ${to}.`);
      return { success: true, simulated: false };
    } else {
      console.error(`[Fast2SMS] Provider returned error for ${to}:`, data);
      
      // Fallback for insufficient wallet balance or non-approved templates/accounts
      if (data.status_code === 999 || data.status_code === 996 || data.status_code === 411 || data.status_code === 412 || data.message?.toLowerCase().includes('wallet')) {
        console.log('\n--- 📱 Fast2SMS Simulator (Fallback) ---');
        console.log(`Reason: ${data.message}`);
        console.log(`To: ${to}`);
        console.log(`OTP: ${otp}`);
        console.log('----------------------------------------\n');
        return { success: true, simulated: true }; 
      }
      
      return { success: false, simulated: false, error: data.message || 'Provider returned false' };
    }
  } catch (error: any) {
    console.error(`[Fast2SMS] Exception sending SMS to ${to}:`, error.message);
    return { success: false, simulated: false, error: error.message };
  }
}
