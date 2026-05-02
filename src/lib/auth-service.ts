import jwt from 'jsonwebtoken';

export function generateJwtToken(phoneNumber: string): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in the environment.');
  }

  // Token valid for 1 hour
  return jwt.sign({ phone: phoneNumber, role: 'user' }, secret, {
    expiresIn: '1h',
  });
}
