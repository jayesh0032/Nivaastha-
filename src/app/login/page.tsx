'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/hooks/use-auth-store';
import { Logo } from '@/components/logo';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

function LoginFormContent() {
  const [step, setStep] = React.useState<'email' | 'otp'>('email');
  const [email, setEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const { toast } = useToast();
  const { isAuthenticated, initialized, setSessionState } = useAuthStore();

  React.useEffect(() => {
    if (initialized && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [initialized, isAuthenticated, redirectTo, router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!isSupabaseConfigured()) {
      toast({
        title: 'Supabase Not Configured',
        description: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        toast({
          title: 'Failed to Send Code',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Verification Code Sent',
        description: `We sent a 6-digit login code to ${trimmedEmail}.`,
      });
      setStep('otp');
    } catch (err: any) {
      toast({
        title: 'Connection Error',
        description: err?.message || 'Unable to send OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter the 6-digit code sent to your email.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanOtp,
        type: 'email',
      });

      if (error) {
        toast({
          title: 'Verification Failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (data.session) {
        setSessionState(data.session, null);
      }

      toast({
        title: 'Login Successful',
        description: 'Welcome to Nivaastha!',
      });
      router.replace(redirectTo);
    } catch (err: any) {
      toast({
        title: 'Verification Error',
        description: err?.message || 'Could not verify code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) {
        toast({
          title: 'Resend Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'New Code Sent',
          description: `A fresh 6-digit code has been sent to ${email.trim()}.`,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Logo className="mx-auto h-14 w-14 text-primary" />
          <CardTitle className="text-3xl font-headline pt-4">
            {step === 'email' ? 'Sign In to Nivaastha' : 'Enter Verification Code'}
          </CardTitle>
          <CardDescription>
            {step === 'email'
              ? 'Enter your email address to receive a 6-digit one-time code.'
              : `Enter the 6-digit code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send 6-Digit Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">6-Digit Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-10 tracking-widest text-center text-lg font-semibold"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify &amp; Login
                </Button>
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="link"
                    type="button"
                    size="sm"
                    className="px-0"
                    onClick={() => {
                      setOtp('');
                      setStep('email');
                    }}
                    disabled={isLoading}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Change email
                  </Button>
                  <Button
                    variant="link"
                    type="button"
                    size="sm"
                    className="px-0"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                  >
                    Resend code
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <LoginFormContent />
    </React.Suspense>
  );
}